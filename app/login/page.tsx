"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get("redirect") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push(redirect);
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border-default bg-bg-surface p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary text-lg font-bold text-white">
            V
          </div>
          <h1 className="text-xl font-semibold text-text-primary">
            VAL Portal
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Enter your access code to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Access code"
              autoFocus
              className="w-full rounded-lg border border-border-default bg-bg-page px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>

          {error && (
            <p className="text-center text-sm text-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-brand-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
