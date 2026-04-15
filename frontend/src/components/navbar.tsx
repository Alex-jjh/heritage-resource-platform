"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-5">
      <div className="flex items-center justify-between h-12 max-w-5xl mx-auto">
        <div className="flex items-center gap-5">
          <Link href="/" className="font-bold text-lg text-gray-800 no-underline">
            Heritage Platform
          </Link>
          {isAuthenticated && user && (
            <nav className="flex gap-3 text-sm">
              <Link href="/browse" className="text-blue-600 hover:underline">Browse</Link>
              {(user.role === "CONTRIBUTOR" || user.role === "REVIEWER" || user.role === "ADMINISTRATOR") && (
                <Link href="/contribute" className="text-blue-600 hover:underline">My Resources</Link>
              )}
              {(user.role === "REVIEWER" || user.role === "ADMINISTRATOR") && (
                <Link href="/review" className="text-blue-600 hover:underline">Review</Link>
              )}
              {user.role === "ADMINISTRATOR" && (
                <Link href="/admin/users" className="text-blue-600 hover:underline">Admin</Link>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? null : isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="bg-white border border-gray-300 rounded px-3 py-1 text-sm cursor-pointer"
              >
                {user.displayName} ▼
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded min-w-[150px] z-50 shadow-md">
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm border-b border-gray-100 hover:bg-gray-50">
                    Profile
                  </Link>
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="block w-full text-left px-3 py-2 text-sm text-red-600 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm text-blue-600 hover:underline">Login</Link>
              <Link href="/register" className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
