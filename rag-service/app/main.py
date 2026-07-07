from fastapi import FastAPI, UploadFile, File, HTTPException
from app.ingestion import extract_text, chunk_text
from app.retrieval import embed_and_store, hybrid_search, build_bm25_index
from app.rerank import rerank_chunks
from app.generate import generate_answer
from langfuse import observe


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
@observe()
def query_documents(q: str):
    hybrid_results = hybrid_search(q)
    reranked_results = rerank_chunks(q, hybrid_results)
    try:
        answer = generate_answer(q, reranked_results)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {
        "query": q,
        "answer": answer,
        "before_rerank": [...],  # keep whatever you already have here
        "after_rerank": [...],
    }