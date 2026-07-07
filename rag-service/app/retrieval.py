import os
import re
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, PointStruct, Filter, FieldCondition, MatchValue
)
from rank_bm25 import BM25Okapi

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "docmind_chunks"

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
VECTOR_SIZE = embedding_model.get_sentence_embedding_dimension()

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

_bm25_indices = {}  # space_id -> (BM25Okapi index, corpus list)


def ensure_collection():
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
    try:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="space_id",
            field_schema="keyword",
        )
    except Exception:
        pass  # index already exists — safe to ignore


def embed_and_store(chunks: list[str], source_doc: str, space_id: str):
    ensure_collection()
    vectors = embedding_model.encode(chunks).tolist()

    points = [
        PointStruct(
            id=f"{space_id}-{source_doc}-{i}".__hash__() & 0xFFFFFFFF,
            vector=vectors[i],
            payload={
                "text": chunks[i],
                "source_doc": source_doc,
                "chunk_index": i,
                "space_id": space_id,
            },
        )
        for i in range(len(chunks))
    ]
    client.upsert(collection_name=COLLECTION_NAME, points=points)


def _space_filter(space_id: str) -> Filter:
    return Filter(must=[FieldCondition(key="space_id", match=MatchValue(value=space_id))])


def vector_search(query: str, space_id: str, top_k: int = 20):
    ensure_collection()
    query_vector = embedding_model.encode(query).tolist()
    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=_space_filter(space_id),
        limit=top_k,
    ).points
    return [
        {"text": r.payload["text"], "source_doc": r.payload["source_doc"],
         "chunk_index": r.payload["chunk_index"], "score": r.score}
        for r in results
    ]


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def build_bm25_index(space_id: str):
    ensure_collection()
    corpus = []
    offset = None
    while True:
        points, offset = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=_space_filter(space_id),
            limit=100,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )
        for p in points:
            corpus.append({
                "text": p.payload["text"],
                "source_doc": p.payload["source_doc"],
                "chunk_index": p.payload["chunk_index"],
            })
        if offset is None:
            break

    tokenized = [_tokenize(c["text"]) for c in corpus]
    index = BM25Okapi(tokenized) if tokenized else None
    _bm25_indices[space_id] = (index, corpus)


def bm25_search(query: str, space_id: str, top_k: int = 20):
    if space_id not in _bm25_indices:
        build_bm25_index(space_id)

    index, corpus = _bm25_indices[space_id]
    if index is None:
        return []

    scores = index.get_scores(_tokenize(query))
    ranked = sorted(zip(corpus, scores), key=lambda x: x[1], reverse=True)
    return [{**item, "score": float(score)} for item, score in ranked[:top_k] if score > 0]


def hybrid_search(query: str, space_id: str, top_k_each: int = 20):
    vector_results = vector_search(query, space_id, top_k=top_k_each)
    bm25_results = bm25_search(query, space_id, top_k=top_k_each)

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