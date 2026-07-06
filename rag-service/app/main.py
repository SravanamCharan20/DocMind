from fastapi import FastAPI, UploadFile, File
from app.ingestion import extract_text, chunk_text
from app.retrieval import embed_and_store, search
from app.generate import generate_answer

app = FastAPI(title="DocMind RAG Service")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    file_bytes = await file.read()
    text = extract_text(file_bytes, file.filename)
    chunks = chunk_text(text)
    embed_and_store(chunks, source_doc=file.filename)
    return {"filename": file.filename, "num_characters": len(text), "num_chunks": len(chunks)}

@app.get("/query")
def query_documents(q: str):
    results = search(q)
    answer = generate_answer(q, results)
    return {"query": q, "answer": answer, "sources": results}