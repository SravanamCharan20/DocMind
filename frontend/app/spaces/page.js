"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext.js";
import AppLayout from "../components/AppLayout.js";

export default function SpacesPage() {
  const { token } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadSpaces = () => {
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/spaces`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then(setSpaces)
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadSpaces();
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!name.trim()) return;

    setCreating(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/spaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        setName("");
        setShowForm(false);
        loadSpaces();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="flex items-center justify-between gap-2 mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Spaces</h1>

          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shrink-0"
          >
            New Space
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Space name"
              className="flex-1 min-w-0 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />

            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
        )}

        {spaces.length === 0 ? (
          <p className="text-sm text-gray-500">
            No spaces yet — create one to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {spaces.map((space) => (
              <Link
                key={space._id}
                href={`/spaces/${space._id}`}
                className="block border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 transition-colors"
              >
                <h2 className="font-medium text-gray-900">{space.name}</h2>

                <p className="text-xs text-gray-500 mt-1">
                  Created {new Date(space.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}