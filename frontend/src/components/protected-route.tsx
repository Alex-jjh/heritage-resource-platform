"use client";

import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function hasStoredToken(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem("accessToken");
}

interface ProtectedRouteProps {
  requiredRoles?: UserRole[];
  children: React.ReactNode;
}

export function ProtectedRoute({ requiredRoles, children }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const pendingAuth = !isLoading && !isAuthenticated && hasStoredToken();

  useEffect(() => {
    if (isLoading || pendingAuth) return;
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (requiredRoles && user && !requiredRoles.includes(user.role) && user.role !== "ADMINISTRATOR") {
      router.replace("/");
    }
  }, [isLoading, pendingAuth, isAuthenticated, user, requiredRoles, router]);

  if (isLoading || pendingAuth) {
    return <div style={{ textAlign: "center", padding: 60 }}>Loading...</div>;
  }

  if (!isAuthenticated) return null;

  if (requiredRoles && user && !requiredRoles.includes(user.role) && user.role !== "ADMINISTRATOR") {
    return null;
  }

  return <>{children}</>;
}
