import os
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from rank_bm25 import BM25Okapi
import re

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
    vectors = embedding_model.encode(chunks).tolist() # it will create an array which converted into list

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


_bm25_index = None
_bm25_corpus = []  # list of {"text", "source_doc", "chunk_index"}


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def build_bm25_index():
    """Pulls every chunk out of Qdrant and builds an in-memory BM25 index over it."""
    global _bm25_index, _bm25_corpus
    _bm25_corpus = []
    offset = None
    while True:
        points, offset = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=100,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )
        for p in points:
            _bm25_corpus.append({
                "text": p.payload["text"],
                "source_doc": p.payload["source_doc"],
                "chunk_index": p.payload["chunk_index"],
            })
        if offset is None:
            break

    tokenized = [_tokenize(c["text"]) for c in _bm25_corpus]
    _bm25_index = BM25Okapi(tokenized) if tokenized else None
    print(f"[BM25] indexed {len(_bm25_corpus)} chunks") 


def bm25_search(query: str, top_k: int = 20):
    if _bm25_index is None:
        return []
    scores = _bm25_index.get_scores(_tokenize(query))
    ranked = sorted(zip(_bm25_corpus, scores), key=lambda x: x[1], reverse=True)
    return [{**item, "score": float(score)} for item, score in ranked[:top_k] if score > 0]


def vector_search(query: str, top_k: int = 20):
    query_vector = embedding_model.encode(query).tolist()
    results = client.query_points(
        collection_name=COLLECTION_NAME, query=query_vector, limit=top_k
    ).points
    return [
        {"text": r.payload["text"], "source_doc": r.payload["source_doc"],
         "chunk_index": r.payload["chunk_index"], "score": r.score}
        for r in results
    ]


def hybrid_search(query: str, top_k_each: int = 20):
    """Runs vector + BM25 independently, merges by (source_doc, chunk_index), dedupes."""
    vector_results = vector_search(query, top_k=top_k_each)
    bm25_results = bm25_search(query, top_k=top_k_each)

    merged = {}
    for r in vector_results:
        key = (r["source_doc"], r["chunk_index"])
        merged[key] = {**r, "matched_by": ["vector"]}

    for r in bm25_results:
        key = (r["source_doc"], r["chunk_index"])
        if key in merged:
            merged[key]["matched_by"].append("bm25")
        else:
            merged[key] = {**r, "matched_by": ["bm25"]}

    return list(merged.values())