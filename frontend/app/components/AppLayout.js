"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext.js";

export default function AppLayout({ children }) {
  const { token, loading, logout } = useAuth();
  const router = useRouter();
  const [spaces, setSpaces] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between p-3 border-b border-gray-200 bg-white shrink-0">
        <span className="font-semibold text-gray-900">DocMind</span>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2 text-gray-600 hover:text-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-gray-200 bg-white flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <span className="font-semibold text-gray-900">DocMind</span>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="p-1 text-gray-500 hover:text-gray-900 md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <Link
            href="/spaces"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            All Spaces
          </Link>

          <div className="mt-2">
            {spaces.map((space) => (
              <Link
                key={space._id}
                href={`/spaces/${space._id}`}
                onClick={() => setMobileOpen(false)}
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