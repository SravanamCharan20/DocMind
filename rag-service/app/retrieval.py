import os
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

load_dotenv()  # reads .env into environment variables

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "docmind_chunks"

# Loaded once at import time — this model file is ~90MB, downloaded on first run
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
VECTOR_SIZE = embedding_model.get_sentence_embedding_dimension()  # 384

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


def ensure_collection():
    """Create the Qdrant collection if it doesn't already exist."""
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


def embed_and_store(chunks: list[str], source_doc: str):
    ensure_collection()
    vectors = embedding_model.encode(chunks).tolist()

    points = [
        PointStruct(
            id=f"{source_doc}-{i}".__hash__() & 0xFFFFFFFF,  # simple unique int id
            vector=vectors[i],
            payload={"text": chunks[i], "source_doc": source_doc, "chunk_index": i},
        )
        for i in range(len(chunks))
    ]
    client.upsert(collection_name=COLLECTION_NAME, points=points)


def search(query: str, top_k: int = 5):
    query_vector = embedding_model.encode(query).tolist()
    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=top_k,
    ).points
    return [
        {"text": r.payload["text"], "source_doc": r.payload["source_doc"], "score": r.score}
        for r in results
    ]