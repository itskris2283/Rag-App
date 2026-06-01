from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os

from rag_engine import RAGEngine

app = FastAPI(title="RAG Application")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single in-memory engine instance (loaded once at startup)
engine = RAGEngine()


class QueryRequest(BaseModel):
    question: str
    k: int = 4


@app.post("/upload")
async def upload(files: list[UploadFile] = File(...)):
    results = []
    for f in files:
        try:
            data = await f.read()
            n = engine.add_document(f.filename, data)
            results.append({"filename": f.filename, "chunks": n, "status": "ok"})
        except Exception as e:
            results.append({"filename": f.filename, "status": "error", "detail": str(e)})
    return {"results": results, "stats": engine.stats()}


@app.post("/query")
async def query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    return engine.answer(req.question, req.k)


@app.get("/stats")
async def stats():
    return engine.stats()


@app.post("/reset")
async def reset():
    engine.reset()
    return {"status": "cleared"}


# Serve the frontend
@app.get("/")
async def home():
    path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
    return FileResponse(path)
