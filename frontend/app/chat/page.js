"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext.js";

export default function ChatPage() {
  const { token, loading, logout } = useAuth();
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion("");
    setAsking(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: currentQuestion }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { question: currentQuestion, answer: `Error: ${data.error}`, sources: [] },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { question: currentQuestion, answer: data.answer, sources: data.sources },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { question: currentQuestion, answer: "Could not reach the server", sources: [] },
      ]);
    } finally {
      setAsking(false);
    }
  };

  if (loading || !token) return null;

  return (
    <div style={{ maxWidth: 700, margin: "40px auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>DocMind Chat</h1>
        <div>
          <a href="/upload">Upload</a> | <button onClick={logout}>Log out</button>
        </div>
      </div>

      <div>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 24, borderBottom: "1px solid #ccc", paddingBottom: 16 }}>
            <p><strong>Q:</strong> {m.question}</p>
            <p><strong>A:</strong> {m.answer}</p>
            {m.sources.length > 0 && (
              <details>
                <summary>Sources ({m.sources.length})</summary>
                <ul>
                  {m.sources.map((s, j) => (
                    <li key={j}>
                      {s.source_doc} (chunk {s.chunk_index}) — rerank score: {s.rerank_score.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your documents..."
          style={{ width: "80%" }}
          disabled={asking}
        />
        <button type="submit" disabled={asking}>{asking ? "Thinking..." : "Ask"}</button>
      </form>
    </div>
  );
}