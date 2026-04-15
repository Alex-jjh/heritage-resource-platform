"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const idleLogout = searchParams.get("reason") === "idle";
  const [showIdleMsg, setShowIdleMsg] = useState(idleLogout);

  useEffect(() => {
    if (idleLogout) {
      router.replace("/login", { scroll: false });
    }
  }, [idleLogout, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push("/browse");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Invalid email or password.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        <h1 style={{ textAlign: "center", marginBottom: 4 }}>Sign In</h1>
        <p style={{ textAlign: "center", color: "#888", marginBottom: 20, fontSize: 14 }}>
          Enter your credentials to access the platform
        </p>
        <form onSubmit={handleSubmit}>
          {showIdleMsg && (
            <div className="warning-msg">
              You were logged out due to inactivity. Please sign in again.
            </div>
          )}
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
          <p style={{ textAlign: "center", marginTop: 12, fontSize: 14 }}>
            Don&apos;t have an account? <Link href="/register">Register</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
