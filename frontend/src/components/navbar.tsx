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
  Archive,
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
        className="px-1 py-2 text-[0.88rem] font-medium text-foreground/70 transition-colors hover:text-foreground lg:text-[0.94rem]"
      >
        <span className={active ? "border-b border-accent pb-1 text-foreground" : ""}>
          {label}
        </span>
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
          ...(canUseFeaturedPage ? [{ href: "/featured", label: "Featured" }] : []),
          ...(canReview ? [{ href: "/review", label: "Review" }] : []),
          ...(user.role === "ADMINISTRATOR"
            ? [{ href: "/admin/users", label: "Admin Panel", matchPrefix: "/admin" }]
            : []),
        ]
      : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-[72px] w-full items-center px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-6 lg:gap-10">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full border border-accent/40 bg-white/70 text-accent shadow-[var(--shadow-heritage-card)]">
              <Archive className="size-4" />
            </span>
            <span className="hidden leading-none sm:inline">
              <span className="block font-serif text-[1.05rem] font-semibold text-primary">
                Heritage Platform
              </span>
              <span className="mt-1 block text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
                ESTMMXXVI
              </span>
            </span>
          </Link>

          <nav className="hidden min-w-0 items-center gap-5 md:flex lg:gap-8">
            {links.map((l) =>
              navLink(
                l.href,
                l.label,
                (l as { matchPrefix?: string }).matchPrefix
              )
            )}
          </nav>
        </div>

        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
          {isLoading ? null : isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                className="flex items-center gap-2 rounded-full border border-border bg-white/70 px-2 py-1 transition-colors hover:bg-secondary/60"
              >
                <UserAvatar
                  displayName={user.displayName}
                  avatarUrl={user.avatarUrl}
                  sizeClass="size-10"
                  textClass="text-sm"
                />
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-white py-2 shadow-xl">
                  <div className="border-b border-border px-4 py-3">
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
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-secondary/60 hover:text-foreground"
                  >
                    <User className="size-4" /> Profile
                  </Link>

                  {canUseFeaturedPage && (
                    <Link
                      href="/featured"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-secondary/60 hover:text-foreground"
                    >
                      <Star className="size-4" /> Featured
                    </Link>
                  )}

                  <Link
                    href="/my-comments"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-secondary/60 hover:text-foreground"
                  >
                    <MessageSquare className="size-4" /> My Comments
                  </Link>

                  <button
                    onClick={() => {
                      void logout();
                      setUserMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-rose-50"
                  >
                    <LogOut className="size-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
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
        <div className="border-t border-border bg-background/95 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-white p-3 shadow-[var(--shadow-heritage-card)]">
          {isAuthenticated && user ? (
            <>
              <div className="mb-2 flex items-center gap-2 border-b border-border px-2 py-2 pb-3">
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

              <div className="mt-1 border-t border-border pt-1">
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
        </div>
      )}
    </header>
  );
}

export { Navbar };
export default Navbar;
