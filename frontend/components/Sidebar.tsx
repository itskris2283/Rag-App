"use client";

import { useRef, useState } from "react";
import { uploadFiles, resetStore, Stats } from "@/lib/api";

export default function Sidebar({
  stats,
  onStatsChange,
}: {
  stats: Stats;
  onStatsChange: (s: Stats) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [status, setStatus] = useState("No documents loaded.");

  async function handleFiles(files: FileList | File[]) {
    if (!files || (files as FileList).length === 0) return;
    setStatus("Uploading & embedding...");
    try {
      const newStats = await uploadFiles(files);
      onStatsChange(newStats);
      setStatus(`${newStats.total_chunks} chunks indexed.`);
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
  }

  async function handleReset() {
    await resetStore();
    onStatsChange({ total_chunks: 0, documents: [] });
    setStatus("Cleared.");
  }

  return (
    <aside className="sidebar">
      <h1>📚 RAG Chat</h1>

      <div
        className={`drop ${over ? "over" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p>Drop PDFs / DOCX / TXT here<br />or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      <div className="status">{status}</div>

      <h2>Documents</h2>
      <div>
        {stats.documents.length ? (
          stats.documents.map((d) => (
            <div className="doc" key={d}>
              📄 {d}
            </div>
          ))
        ) : (
          <div className="status">No documents.</div>
        )}
      </div>

      <button className="ghost" onClick={handleReset}>
        Clear all documents
      </button>
    </aside>
  );
}
