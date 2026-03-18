"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = isAuthenticated && user ? (
    <>
      <Link href="/browse" onClick={() => setMenuOpen(false)}>
        <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">Browse</Button>
      </Link>
      {(user.role === "CONTRIBUTOR" || user.role === "REVIEWER" || user.role === "ADMINISTRATOR") && (
        <Link href="/contribute" onClick={() => setMenuOpen(false)}>
          <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">Contribute</Button>
        </Link>
      )}
      {(user.role === "REVIEWER" || user.role === "ADMINISTRATOR") && (
        <Link href="/review" onClick={() => setMenuOpen(false)}>
          <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">Review</Button>
        </Link>
      )}
      {user.role === "ADMINISTRATOR" && (
        <Link href="/admin/users" onClick={() => setMenuOpen(false)}>
          <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">Admin</Button>
        </Link>
      )}
      <Link href="/profile" onClick={() => setMenuOpen(false)}>
        <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">{user.displayName}</Button>
      </Link>
      <Button variant="outline" size="sm" onClick={() => { logout(); setMenuOpen(false); }}>
        Logout
      </Button>
    </>
  ) : (
    <>
      <Link href="/login" onClick={() => setMenuOpen(false)}>
        <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">Login</Button>
      </Link>
      <Link href="/register" onClick={() => setMenuOpen(false)}>
        <Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto">Register</Button>
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8" aria-label="Main navigation">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl" aria-hidden="true">🏛️</span>
          <span className="font-serif text-xl font-bold text-primary">Heritage Platform</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-2">
          {isLoading ? <span className="text-sm text-muted-foreground">Loading…</span> : navLinks}
        </div>

        {/* Mobile hamburger */}
        <Button variant="ghost" size="sm" className="sm:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t px-4 py-3 flex flex-col gap-1 bg-card">
          {isLoading ? <span className="text-sm text-muted-foreground">Loading…</span> : navLinks}
        </div>
      )}
    </header>
  );
}
