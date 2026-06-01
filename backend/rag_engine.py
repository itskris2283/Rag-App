import os
import io
import numpy as np
import faiss
from typing import List, Dict, Optional

os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("TRANSFORMERS_NO_TF", "1")

from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from docx import Document as DocxDocument


class RAGEngine:
    def __init__(
        self,
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        gen_model: str = "google/flan-t5-base",
    ):
        print("Loading embedding model...")
        self.embedder = SentenceTransformer(embedding_model)
        self.dim = self.embedder.get_sentence_embedding_dimension()

        self.gen_model = gen_model
        self.generator = None
        self.generator_attempted = False

        # FAISS index (inner product on normalized vectors = cosine similarity)
        self.index = faiss.IndexFlatIP(self.dim)
        self.chunks: List[str] = []
        self.metadata: List[Dict] = []

        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=120,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def _load_generator(self):
        if self.generator is not None or self.generator_attempted:
            return self.generator

        self.generator_attempted = True

        try:
            from transformers import pipeline

            print("Loading generation model...")
            self.generator = pipeline("text2text-generation", model=self.gen_model)
        except Exception as exc:
            print(f"Generation model unavailable, using fallback answers: {exc}")
            self.generator = None

        return self.generator

    # ---------- Document parsing ----------
    def extract_text(self, filename: str, data: bytes) -> str:
        ext = filename.lower().rsplit(".", 1)[-1]
        if ext == "pdf":
            reader = PdfReader(io.BytesIO(data))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        elif ext == "docx":
            doc = DocxDocument(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs)
        elif ext in ("txt", "md"):
            return data.decode("utf-8", errors="ignore")
        else:
            raise ValueError(f"Unsupported file type: .{ext}")

    # ---------- Ingestion ----------
    def add_document(self, filename: str, data: bytes) -> int:
        text = self.extract_text(filename, data)
        if not text.strip():
            raise ValueError("No extractable text found in document.")

        chunks = self.splitter.split_text(text)
        if not chunks:
            return 0

        embeddings = self.embedder.encode(
            chunks, normalize_embeddings=True, show_progress_bar=False
        ).astype("float32")

        self.index.add(embeddings)
        for i, chunk in enumerate(chunks):
            self.chunks.append(chunk)
            self.metadata.append({"source": filename, "chunk": i})

        return len(chunks)

    # ---------- Retrieval ----------
    def retrieve(self, query: str, k: int = 4) -> List[Dict]:
        if self.index.ntotal == 0:
            return []
        q_emb = self.embedder.encode(
            [query], normalize_embeddings=True
        ).astype("float32")
        scores, idxs = self.index.search(q_emb, min(k, self.index.ntotal))
        results = []
        for score, idx in zip(scores[0], idxs[0]):
            if idx == -1:
                continue
            results.append(
                {
                    "text": self.chunks[idx],
                    "score": float(score),
                    "source": self.metadata[idx]["source"],
                }
            )
        return results

    # ---------- Answer generation ----------
    def answer(self, query: str, k: int = 4) -> Dict:
        contexts = self.retrieve(query, k)
        if not contexts:
            return {
                "answer": "No documents have been uploaded yet, or nothing relevant was found.",
                "sources": [],
            }

        context_block = "\n\n".join(
            f"[{i+1}] {c['text']}" for i, c in enumerate(contexts)
        )
        prompt = (
            "Answer the question using only the context below. "
            "If the answer is not in the context, say you don't know.\n\n"
            f"Context:\n{context_block}\n\n"
            f"Question: {query}\n\nAnswer:"
        )

        generator = self._load_generator()
        if generator is None:
            answer_text = contexts[0]["text"][:500]
        else:
            out = generator(prompt, max_new_tokens=256, do_sample=False)
            answer_text = out[0]["generated_text"].strip()

        return {
            "answer": answer_text,
            "sources": [
                {"source": c["source"], "score": round(c["score"], 3), "preview": c["text"][:200]}
                for c in contexts
            ],
        }

    def stats(self) -> Dict:
        return {
            "total_chunks": self.index.ntotal,
            "documents": sorted({m["source"] for m in self.metadata}),
        }

    def reset(self):
        self.index = faiss.IndexFlatIP(self.dim)
        self.chunks = []
        self.metadata = []
