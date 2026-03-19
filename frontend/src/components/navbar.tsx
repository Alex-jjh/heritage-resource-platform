"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut, ChevronDown } from "lucide-react";

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();

  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() ?? "?";

  function navLink(href: string, label: string) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        {label}
      </Link>
    );
  }

  const links = isAuthenticated && user ? [
    { href: "/browse", label: "Browse" },
    ...((user.role === "CONTRIBUTOR" || user.role === "REVIEWER" || user.role === "ADMINISTRATOR")
      ? [{ href: "/contribute", label: "My Resources" }] : []),
    ...((user.role === "REVIEWER" || user.role === "ADMINISTRATOR")
      ? [{ href: "/review", label: "Review" }] : []),
    ...(user.role === "ADMINISTRATOR"
      ? [{ href: "/admin/users", label: "Admin" }] : []),
  ] : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="flex h-14 items-center px-4 sm:px-6">
        {/* Left: Logo + Nav links */}
        <div className="flex items-center gap-1">
          <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
            <span className="text-2xl" aria-hidden="true">🏛️</span>
            <span className="hidden sm:inline font-serif text-lg font-bold text-primary">
              Heritage Platform
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            {links.map((l) => navLink(l.href, l.label))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: User area */}
        <div className="hidden md:flex items-center gap-2">
          {isLoading ? null : isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                className="flex items-center gap-2 rounded-full hover:bg-muted px-2 py-1 transition-colors"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {userInitial}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-52 rounded-md border bg-white shadow-lg py-1 z-50">
                  <div className="px-4 py-2.5 border-b">
                    <p className="text-sm font-medium truncate">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors">
                    <User className="size-4" /> Profile
                  </Link>
                  <button onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors">
                    <LogOut className="size-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
              <Link href="/register"><Button size="sm">Register</Button></Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 py-3 flex flex-col gap-1 bg-white">
          {isAuthenticated && user ? (
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
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">{l.label}</Button>
                </Link>
              ))}
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
                <Button size="sm" className="w-full">Register</Button>
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
