"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext.js";

export default function AppLayout({ children }) {
  const { token, loading, logout } = useAuth();
  const router = useRouter();
  const [spaces, setSpaces] = useState([]);

  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  useEffect(() => {
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/spaces`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then(setSpaces)
      .catch((err) => console.error(err));
  }, [token]);

  if (loading || !token) return null;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <span className="font-semibold text-gray-900">DocMind</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <Link
            href="/spaces"
            className="block px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            All Spaces
          </Link>

          <div className="mt-2">
            {spaces.map((space) => (
              <Link
                key={space._id}
                href={`/spaces/${space._id}`}
                className="block px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 truncate"
              >
                {space.name}
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-2 border-t border-gray-200">
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}