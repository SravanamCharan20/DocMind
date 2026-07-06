from fastapi import FastAPI, UploadFile, File
from app.ingestion import extract_text, chunk_text

app = FastAPI(title="DocMind RAG Service")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    file_bytes = await file.read()
    text = extract_text(file_bytes, file.filename)
    chunks = chunk_text(text)
    return {
        "filename": file.filename,
        "num_characters": len(text),
        "num_chunks": len(chunks),
        "first_chunk_preview": chunks[0][:200] if chunks else None,
    }