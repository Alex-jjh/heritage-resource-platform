"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(email, password, displayName);
      router.push("/login?registered=true");
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string } | undefined;
        setError(body?.message || err.message || "Registration failed.");
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
        <h1 style={{ textAlign: "center", marginBottom: 4 }}>Create Account</h1>
        <p style={{ textAlign: "center", color: "#888", marginBottom: 20, fontSize: 14 }}>
          Register to browse and interact with heritage resources
        </p>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
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
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
          <p style={{ textAlign: "center", marginTop: 12, fontSize: 14 }}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
