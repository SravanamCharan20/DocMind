from fastapi import FastAPI, UploadFile, File
from app.ingestion import extract_text, chunk_text
from app.retrieval import embed_and_store, hybrid_search, build_bm25_index
from app.rerank import rerank_chunks
from app.generate import generate_answer

app = FastAPI(title="DocMind RAG Service")

@app.on_event("startup")
def startup_event():
    build_bm25_index()

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    file_bytes = await file.read()
    text = extract_text(file_bytes, file.filename)
    chunks = chunk_text(text)
    embed_and_store(chunks, source_doc=file.filename)
    build_bm25_index()
    return {"filename": file.filename, "num_characters": len(text), "num_chunks": len(chunks)}

@app.get("/query")
def query_documents(q: str):
    hybrid_results = hybrid_search(q)
    reranked_results = rerank_chunks(q, hybrid_results)
    answer = generate_answer(q, reranked_results)
    return {
        "query": q,
        "answer": answer,
        "before_rerank": [
            {"source_doc": c["source_doc"], "chunk_index": c["chunk_index"], "matched_by": c["matched_by"]}
            for c in hybrid_results
        ],
        "after_rerank": [
            {"source_doc": c["source_doc"], "chunk_index": c["chunk_index"], "rerank_score": c["rerank_score"]}
            for c in reranked_results
        ],
    }