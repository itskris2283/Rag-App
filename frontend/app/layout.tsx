import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "RAG Chat",
  description: "Chat with your documents using HuggingFace embeddings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
