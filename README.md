# RAG Chat

A **Retrieval-Augmented Generation** application that lets you upload documents (PDF, DOCX, TXT, Markdown) and ask natural-language questions about their contents. It retrieves relevant chunks from a FAISS vector index and generates answers using a local Hugging Face language model — no external APIs required.

## Tech Stack

| Layer          | Technology                                         |
| -------------- | -------------------------------------------------- |
| **Frontend**   | Next.js 14 (App Router), React 18, TypeScript      |
| **Backend**    | Python 3, FastAPI, Uvicorn                         |
| **Embeddings** | `all-MiniLM-L6-v2` via Sentence-Transformers       |
| **Vector Store** | FAISS (CPU) – cosine similarity on normalized vectors |
| **Generation** | `google/flan-t5-base` via Hugging Face pipeline     |
| **Document Parsing** | pypdf, python-docx, plain text                  |

## Architecture

```
User → Next.js Frontend (port 3000) → FastAPI Backend (port 8000) → Hugging Face Models + FAISS
```

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app — routes: /upload, /query, /stats, /reset
│   ├── rag_engine.py        # RAGEngine: embedding, FAISS index, retrieval, generation
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Chat.tsx, Sidebar.tsx
│   ├── lib/
│   │   └── api.ts           # API client (upload, query, stats, reset)
│   ├── package.json
│   └── next.config.js
└── README.md
```

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**

## Setup

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The backend downloads `all-MiniLM-L6-v2` on first startup and `google/flan-t5-base` (~1 GB) on the first query. Both are cached locally afterward.

### Frontend

```bash
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

## Environment Variables

| Variable                | Default                  | Description             |
| ----------------------- | ------------------------ | ----------------------- |
| `NEXT_PUBLIC_API_URL`   | `http://localhost:8000`  | Backend API base URL    |

## API Endpoints

| Method | Path       | Description                                |
| ------ | ---------- | ------------------------------------------ |
| POST   | `/upload`  | Upload files (PDF, DOCX, TXT, MD)          |
| POST   | `/query`   | Ask a question. Body: `{"question": "..."}` |
| GET    | `/stats`   | Get index stats and document list          |
| POST   | `/reset`   | Clear all documents and the index          |

## Limitations

- **In-memory only** — restarting the backend erases all uploaded documents and the index.
- **Single-user** — a single global `RAGEngine` instance with no session isolation.
- **No streaming** — answers are returned as a single JSON response.
- **Large model download** — Flan-T5-base is ~1 GB and downloads on the first query.
- **Hardcoded chunking** — chunk size 800 chars, overlap 120 chars.
