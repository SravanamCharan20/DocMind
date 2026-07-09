"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext.js";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      login(data.token);
      router.push("/spaces");
    } catch (err) {
      setError("Could not reach the server");
    }
  };

  return (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div className="w-full max-w-sm border border-gray-200 rounded-lg p-6 bg-white">
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Log In</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white rounded-md py-2 text-sm font-medium hover:bg-indigo-700"
        >
          Log In
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      <p className="text-sm text-gray-500 mt-4">
        No account? <a href="/register" className="text-indigo-600">Register</a>
      </p>
    </div>
  </div>
);
}