from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from app.ingestion import extract_text, chunk_text
from app.retrieval import embed_and_store, hybrid_search, build_bm25_index
from app.rerank import rerank_chunks
from app.generate import generate_answer
from langfuse import observe

app = FastAPI(title="DocMind RAG Service")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...), space_id: str = Form(...)):
    file_bytes = await file.read()
    text = extract_text(file_bytes, file.filename)
    chunks = chunk_text(text)
    embed_and_store(chunks, source_doc=file.filename, space_id=space_id)
    build_bm25_index(space_id)
    return {"filename": file.filename, "num_characters": len(text), "num_chunks": len(chunks)}

@app.get("/query")
@observe()
def query_documents(q: str, space_id: str):
    hybrid_results = hybrid_search(q, space_id)
    reranked_results = rerank_chunks(q, hybrid_results)
    try:
        answer = generate_answer(q, reranked_results)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

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