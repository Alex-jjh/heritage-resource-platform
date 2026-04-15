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
    <main className="flex justify-center p-10">
      <div className="bg-white border border-gray-200 rounded p-6 w-full max-w-sm">
        <h1 className="text-center text-xl font-bold mb-1">Sign In</h1>
        <p className="text-center text-gray-400 text-sm mb-5">Enter your credentials to access the platform</p>
        <form onSubmit={handleSubmit}>
          {showIdleMsg && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-2 rounded text-sm mb-3">
              You were logged out due to inactivity. Please sign in again.
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-sm mb-3">{error}</div>}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-bold mb-1">Email</label>
            <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-bold mb-1">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
          <p className="text-center mt-3 text-sm">
            Don&apos;t have an account? <Link href="/register" className="text-blue-600 hover:underline">Register</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
