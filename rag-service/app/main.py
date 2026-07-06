from fastapi import FastAPI, UploadFile, File
from app.ingestion import extract_text, chunk_text
from app.retrieval import embed_and_store, hybrid_search, build_bm25_index
from app.generate import generate_answer

app = FastAPI(title="DocMind RAG Service")

@app.on_event("startup")
def startup_event():
    build_bm25_index()  # index whatever's already in Qdrant from earlier uploads

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    file_bytes = await file.read()
    text = extract_text(file_bytes, file.filename)
    chunks = chunk_text(text)
    embed_and_store(chunks, source_doc=file.filename)
    build_bm25_index()  # refresh so the new chunks are searchable by keyword too
    return {"filename": file.filename, "num_characters": len(text), "num_chunks": len(chunks)}

@app.get("/query")
def query_documents(q: str):
    results = hybrid_search(q)
    answer = generate_answer(q, results)
    return {"query": q, "answer": answer, "sources": results}