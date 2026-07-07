"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext.js";

export default function UploadPage() {
  const { token, loading } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setStatus("Uploading...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(`Error: ${data.error}`);
        return;
      }

      setStatus(`Uploaded "${data.filename}" — ${data.numChunks} chunks indexed.`);
    } catch (err) {
      setStatus("Could not reach the server");
    }
  };

  if (loading || !token) return null;

  return (
    <div style={{ maxWidth: 500, margin: "80px auto" }}>
      <h1>Upload a Document</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
        <button type="submit">Upload</button>
      </form>
      {status && <p>{status}</p>}
      <p><a href="/chat">Go to chat</a></p>
    </div>
  );
}