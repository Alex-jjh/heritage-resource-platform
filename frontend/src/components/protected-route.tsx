"use client";

import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Check whether a token exists in localStorage.
 * Used as a secondary signal: if a token is present the user may be in the
 * middle of logging in (setUser hasn't flushed yet), so we should wait
 * rather than immediately redirecting to /login.
 */
function hasStoredToken(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem("accessToken");
}

interface ProtectedRouteProps {
  requiredRoles?: UserRole[];
  children: React.ReactNode;
}

export function ProtectedRoute({
  requiredRoles,
  children,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Treat "token exists but user state hasn't loaded yet" the same as
  // isLoading — the AuthProvider will resolve it on the next render.
  const pendingAuth = !isLoading && !isAuthenticated && hasStoredToken();

  useEffect(() => {
    if (isLoading || pendingAuth) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (requiredRoles && user && !requiredRoles.includes(user.role) && user.role !== "ADMINISTRATOR") {
      router.replace("/");
    }
  }, [isLoading, pendingAuth, isAuthenticated, user, requiredRoles, router]);

  if (isLoading || pendingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role) && user.role !== "ADMINISTRATOR") {
    return null;
  }

  return <>{children}</>;
}
