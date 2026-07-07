from sentence_transformers import CrossEncoder
from langfuse import observe


reranker_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")


@observe()
def rerank_chunks(question: str, chunks: list[dict], top_k: int = 5) -> list[dict]:
    pairs = [(question, chunk["text"]) for chunk in chunks]
    scores = reranker_model.predict(pairs)

    for chunk, score in zip(chunks, scores):
        chunk["rerank_score"] = float(score)

    reranked = sorted(chunks, key=lambda c: c["rerank_score"], reverse=True)
    return reranked[:top_k]