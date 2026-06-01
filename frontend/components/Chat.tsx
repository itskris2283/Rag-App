"use client";

import { useRef, useState } from "react";
import { query, Source } from "@/lib/api";

interface Message {
  role: "user" | "bot";
  text: string;
  sources?: Source[];
}

export default function Chat({ hasDocs }: { hasDocs: boolean }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Upload some documents, then ask me anything about them." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    });
  }

  async function send() {
    const q = input.trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await query(q);
      setMessages((m) => [
        ...m,
        { role: "bot", text: res.answer, sources: res.sources },
      ]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "bot", text: "Error: " + e.message }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  return (
    <main className="main">
      <div className="chat" ref={chatRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.text}
            {m.sources && m.sources.length > 0 && (
              <div className="sources">
                Sources:{" "}
                {m.sources
                  .map((s) => `${s.source} (${s.score})`)
                  .join(", ")}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="msg bot">Thinking...</div>}
      </div>

      <div className="composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={
            hasDocs
              ? "Ask a question about your documents..."
              : "Upload documents first, then ask..."
          }
        />
        <button onClick={send} disabled={loading}>
          Send
        </button>
      </div>
    </main>
  );
}
