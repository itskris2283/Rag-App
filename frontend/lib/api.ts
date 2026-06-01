const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Source {
  source: string;
  score: number;
  preview: string;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
}

export interface Stats {
  total_chunks: number;
  documents: string[];
}

export async function uploadFiles(files: FileList | File[]): Promise<Stats> {
  const fd = new FormData();
  Array.from(files).forEach((f) => fd.append("files", f));
  const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.stats as Stats;
}

export async function query(question: string, k = 4): Promise<QueryResponse> {
  const res = await fetch(`${API}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, k }),
  });
  if (!res.ok) throw new Error("Query failed");
  return res.json();
}

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API}/stats`);
  return res.json();
}

export async function resetStore(): Promise<void> {
  await fetch(`${API}/reset`, { method: "POST" });
}
