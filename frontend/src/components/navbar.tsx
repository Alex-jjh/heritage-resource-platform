"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🏛️</span>
          <span className="font-serif text-xl font-bold text-primary">
            Heritage Platform
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {isLoading ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : isAuthenticated && user ? (
            <>
              <Link href="/browse">
                <Button variant="ghost" size="sm">Browse</Button>
              </Link>

              {(user.role === "CONTRIBUTOR" ||
                user.role === "REVIEWER" ||
                user.role === "ADMINISTRATOR") && (
                <Link href="/contribute">
                  <Button variant="ghost" size="sm">Contribute</Button>
                </Link>
              )}

              {(user.role === "REVIEWER" ||
                user.role === "ADMINISTRATOR") && (
                <Link href="/review">
                  <Button variant="ghost" size="sm">Review</Button>
                </Link>
              )}

              {user.role === "ADMINISTRATOR" && (
                <Link href="/admin/users">
                  <Button variant="ghost" size="sm">Admin</Button>
                </Link>
              )}

              <Link href="/profile">
                <Button variant="ghost" size="sm">{user.displayName}</Button>
              </Link>

              <Button variant="outline" size="sm" onClick={() => logout()}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
