"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  MessageSquare,
  Star,
} from "lucide-react";

function getInitials(name?: string | null) {
  if (!name) return "?";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  const initials = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || "?";
}

function UserAvatar({
  displayName,
  avatarUrl,
  sizeClass = "size-8",
  textClass = "text-sm",
}: {
  displayName?: string | null;
  avatarUrl?: string | null;
  sizeClass?: string;
  textClass?: string;
}) {
  const initials = getInitials(displayName);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName || "User avatar"}
        className={`${sizeClass} rounded-full border object-cover shrink-0`}
      />
    );
  }

  return (
    <span
      className={`flex ${sizeClass} items-center justify-center rounded-full bg-primary ${textClass} font-semibold text-primary-foreground shrink-0`}
    >
      {initials}
    </span>
  );
}

function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();

  function navLink(href: string, label: string, matchPrefix?: string) {
    const base = matchPrefix ?? href;
    const active = pathname === base || pathname.startsWith(base + "/");

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

  const canManageResources =
    user?.role === "CONTRIBUTOR" ||
    user?.role === "REVIEWER" ||
    user?.role === "ADMINISTRATOR";

  const canReview =
    user?.role === "REVIEWER" || user?.role === "ADMINISTRATOR";

  const canUseFeaturedPage =
    user?.role === "CONTRIBUTOR" ||
    user?.role === "REVIEWER" ||
    user?.role === "ADMINISTRATOR";

  const links =
    isAuthenticated && user
      ? [
          { href: "/browse", label: "Browse" },
          ...(canManageResources
            ? [{ href: "/contribute", label: "My Resources" }]
            : []),
          ...(canReview ? [{ href: "/review", label: "Review" }] : []),
          ...(canUseFeaturedPage ? [{ href: "/featured", label: "Featured" }] : []),
          ...(user.role === "ADMINISTRATOR"
            ? [{ href: "/admin/users", label: "Admin", matchPrefix: "/admin" }]
            : []),
        ]
      : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-xl">
      <div className="flex h-12 items-center px-4 sm:px-6">
        <div className="flex items-center gap-1">
          <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
            <span className="hidden sm:inline text-lg font-semibold tracking-tight text-foreground">
              Heritage
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-0.5">
            {links.map((l) =>
              navLink(
                l.href,
                l.label,
                (l as { matchPrefix?: string }).matchPrefix
              )
            )}
          </div>
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2">
          {isLoading ? null : isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                className="flex items-center gap-2 rounded-full hover:bg-muted px-2 py-1 transition-colors"
              >
                <UserAvatar
                  displayName={user.displayName}
                  avatarUrl={user.avatarUrl}
                  sizeClass="size-8"
                  textClass="text-sm"
                />
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 rounded-md border bg-white shadow-lg py-1 z-50">
                  <div className="px-4 py-2.5 border-b">
                    <p className="text-sm font-medium truncate">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <User className="size-4" /> Profile
                  </Link>

                  {canUseFeaturedPage && (
                    <Link
                      href="/featured"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <Star className="size-4" /> Featured
                    </Link>
                  )}

                  <Link
                    href="/my-comments"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <MessageSquare className="size-4" /> My Comments
                  </Link>

                  <button
                    onClick={() => {
                      void logout();
                      setUserMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                  >
                    <LogOut className="size-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-foreground">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="rounded-full">Register</Button>
              </Link>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t px-4 py-3 flex flex-col gap-1 bg-white">
          {isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-2 px-2 py-2 mb-2 border-b pb-3">
                <UserAvatar
                  displayName={user.displayName}
                  avatarUrl={user.avatarUrl}
                  sizeClass="size-8"
                  textClass="text-sm"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                >
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    {l.label}
                  </Button>
                </Link>
              ))}

              <div className="border-t pt-1 mt-1">
                <Link href="/profile" onClick={() => setMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <User className="mr-2 size-4" /> Profile
                  </Button>
                </Link>

                {canUseFeaturedPage && (
                  <Link href="/featured" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <Star className="mr-2 size-4" /> Featured
                    </Button>
                  </Link>
                )}

                <Link href="/my-comments" onClick={() => setMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <MessageSquare className="mr-2 size-4" /> My Comments
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-destructive"
                  onClick={() => {
                    void logout();
                    setMenuOpen(false);
                  }}
                >
                  <LogOut className="mr-2 size-4" /> Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  Login
                </Button>
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="w-full"
              >
                <Button size="sm" className="w-full">
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export { Navbar };
export default Navbar;