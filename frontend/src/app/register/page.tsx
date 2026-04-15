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
    <main className="flex justify-center p-10">
      <div className="bg-white border border-gray-200 rounded p-6 w-full max-w-sm">
        <h1 className="text-center text-xl font-bold mb-1">Create Account</h1>
        <p className="text-center text-gray-400 text-sm mb-5">Register to browse and interact with heritage resources</p>
        <form onSubmit={handleSubmit}>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-sm mb-3">{error}</div>}
          <div className="mb-4">
            <label htmlFor="displayName" className="block text-sm font-bold mb-1">Display Name</label>
            <input id="displayName" type="text" placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoComplete="name"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-bold mb-1">Email</label>
            <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-bold mb-1">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
          <p className="text-center mt-3 text-sm">
            Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
