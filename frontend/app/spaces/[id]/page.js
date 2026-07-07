"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../../context/AuthContext.js";
import AppLayout from "../../components/AppLayout";

export default function SpaceDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();

  const [space, setSpace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!token || !id) return;

    fetch(`${apiUrl}/spaces/${id}`, { headers: authHeader })
      .then((res) => res.json())
      .then(setSpace);

    fetch(`${apiUrl}/documents?spaceId=${id}`, { headers: authHeader })
      .then((res) => res.json())
      .then(setDocuments);

    fetch(`${apiUrl}/chat/history?spaceId=${id}`, { headers: authHeader })
      .then((res) => res.json())
      .then((history) =>
        setMessages(history.map((h) => ({ question: h.question, answer: h.answer, sources: [] })))
      );
  }, [token, id]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("spaceId", id);

    try {
      const res = await fetch(`${apiUrl}/documents/upload`, {
        method: "POST",
        headers: authHeader,
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setDocuments((prev) => [data, ...prev]);
        setFile(null);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const currentQuestion = question;
    setQuestion("");
    setAsking(true);

    try {
      const res = await fetch(`${apiUrl}/chat/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ question: currentQuestion, spaceId: id }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          question: currentQuestion,
          answer: res.ok ? data.answer : `Error: ${data.error}`,
          sources: data.sources || [],
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">{space?.name || "..."}</h1>

        <div className="border border-gray-200 rounded-lg p-4 bg-white mb-6">
          <form onSubmit={handleUpload} className="flex gap-2 mb-3">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="text-sm flex-1"
            />
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {documents.map((d) => (
              <span
                key={d._id}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md"
              >
                {d.filename} · {d.numChunks} chunks
              </span>
            ))}
            {documents.length === 0 && (
              <span className="text-xs text-gray-400">No documents yet</span>
            )}
          </div>
        </div>

        <div className="space-y-4 mb-4">
          {messages.map((m, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white">
              <p className="text-sm font-medium text-gray-900 mb-1">{m.question}</p>
              <p className="text-sm text-gray-600">{m.answer}</p>
              {m.sources.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-indigo-600 cursor-pointer">
                    Sources ({m.sources.length})
                  </summary>
                  <ul className="mt-1 space-y-1">
                    {m.sources.map((s, j) => (
                      <li key={j} className="text-xs text-gray-500">
                        {s.source_doc} (chunk {s.chunk_index}) — score {s.rerank_score.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            disabled={asking}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={asking}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {asking ? "Thinking..." : "Ask"}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}