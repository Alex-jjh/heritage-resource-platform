"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{ background: "#fff", borderBottom: "1px solid #ddd", padding: "0 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/" style={{ fontWeight: "bold", fontSize: 18, color: "#333", textDecoration: "none" }}>
            🏛️ Heritage Platform
          </Link>
          {isAuthenticated && user && (
            <nav style={{ display: "flex", gap: 12 }}>
              <Link href="/browse">Browse</Link>
              {(user.role === "CONTRIBUTOR" || user.role === "REVIEWER" || user.role === "ADMINISTRATOR") && (
                <Link href="/contribute">My Resources</Link>
              )}
              {(user.role === "REVIEWER" || user.role === "ADMINISTRATOR") && (
                <Link href="/review">Review</Link>
              )}
              {user.role === "ADMINISTRATOR" && (
                <Link href="/admin/users">Admin</Link>
              )}
            </nav>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isLoading ? null : isAuthenticated && user ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{ background: "none", border: "1px solid #ccc", borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}
              >
                {user.displayName} ▼
              </button>
              {menuOpen && (
                <div style={{ position: "absolute", right: 0, top: 35, background: "#fff", border: "1px solid #ddd", borderRadius: 4, minWidth: 150, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                  <Link href="/profile" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "8px 12px", borderBottom: "1px solid #eee" }}>
                    Profile
                  </Link>
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", color: "#c00" }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
