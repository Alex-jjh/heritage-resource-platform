"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut, ChevronDown } from "lucide-react";

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const pageLinks = isAuthenticated && user ? (
    <>
      <Link href="/browse" onClick={() => setMenuOpen(false)}>
        <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">Browse</Button>
      </Link>
    </>
  ) : null;

  // Role-specific links go in user dropdown
  const roleLinks = user ? (
    <>
      {(user.role === "CONTRIBUTOR" || user.role === "REVIEWER" || user.role === "ADMINISTRATOR") && (
        <Link href="/contribute" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors">
          My Resources
        </Link>
      )}
      {(user.role === "REVIEWER" || user.role === "ADMINISTRATOR") && (
        <Link href="/review" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors">
          Review Queue
        </Link>
      )}
      {user.role === "ADMINISTRATOR" && (
        <Link href="/admin/users" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors">
          Admin Panel
        </Link>
      )}
    </>
  ) : null;

  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8" aria-label="Main navigation">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl" aria-hidden="true">🏛️</span>
          <span className="font-serif text-xl font-bold text-primary">Heritage Platform</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-2">
          {isLoading ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : isAuthenticated && user ? (
            <>
              {pageLinks}
              {/* User avatar dropdown */}
              <div className="relative ml-2">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                  className="flex items-center gap-1.5 rounded-full border px-2 py-1 hover:bg-muted transition-colors"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {userInitial}
                  </span>
                  <span className="text-sm font-medium max-w-[120px] truncate">{user.displayName}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-md border bg-card shadow-lg py-1 z-50">
                    <div className="px-3 py-2 border-b">
                      <p className="text-sm font-medium truncate">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors">
                      <User className="size-4" /> Profile
                    </Link>
                    {roleLinks && <div className="border-t">{roleLinks}</div>}
                    <div className="border-t">
                      <button onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors">
                        <LogOut className="size-4" /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
              <Link href="/register"><Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">Register</Button></Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <Button variant="ghost" size="sm" className="sm:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t px-4 py-3 flex flex-col gap-1 bg-card">
          {isLoading ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-2 px-2 py-2 mb-2 border-b pb-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {userInitial}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              {pageLinks}
              {roleLinks && <div className="border-t pt-1 mt-1">{roleLinks}</div>}
              <div className="border-t pt-1 mt-1">
                <Link href="/profile" onClick={() => setMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start"><User className="mr-2 size-4" /> Profile</Button>
                </Link>
                <Button variant="ghost" size="sm" className="w-full justify-start text-destructive" onClick={() => { logout(); setMenuOpen(false); }}>
                  <LogOut className="mr-2 size-4" /> Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">Login</Button>
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                <Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Register</Button>
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
