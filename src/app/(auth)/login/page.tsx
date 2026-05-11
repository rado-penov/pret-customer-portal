"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error ?? "Login failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel – brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-pret-red flex-col justify-between p-12">
        <PretLogo white />
        <div className="text-white space-y-4">
          <p className="text-4xl font-light leading-snug">
            Your account.<br />
            <span className="font-semibold">All in one place.</span>
          </p>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm">
            View invoices, track transactions and manage payments — all securely from your Pret customer portal.
          </p>
        </div>
        <p className="text-white/40 text-xs">© {new Date().getFullYear()} Pret A Manger</p>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 bg-pret-bg">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <PretLogo />
          </div>

          <h1 className="text-2xl font-semibold text-pret-text mb-1">Sign in</h1>
          <p className="text-sm text-pret-text-muted mb-8">Enter your credentials to access your account</p>

          {error && (
            <div className="mb-5 rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-pret-red-mid">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-pret-text-muted mb-2">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#D9D4D5] bg-white rounded px-4 py-3 text-sm text-pret-text placeholder:text-pret-text-muted/60 focus:outline-none focus:ring-2 focus:ring-pret-red focus:border-transparent transition"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-pret-text-muted mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#D9D4D5] bg-white rounded px-4 py-3 text-sm text-pret-text placeholder:text-pret-text-muted/60 focus:outline-none focus:ring-2 focus:ring-pret-red focus:border-transparent transition"
                placeholder="••••••••"
              />
              <div className="mt-2 text-right">
                <a
                  href="/reset-password"
                  className="text-xs font-medium text-pret-red hover:text-pret-red-deep transition-colors"
                >
                  Forgot password?
                </a>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pret-red hover:bg-pret-red-deep disabled:opacity-50 text-white font-semibold rounded py-3 text-sm uppercase tracking-widest transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-pret-text-muted">
            Need access? Contact your account manager.
          </p>
        </div>
      </div>
    </div>
  );
}

function PretLogo({ white = false }: { white?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pret-logo.png"
        alt="Pret A Manger"
        className="h-10 w-auto object-contain"
        style={white ? { filter: "brightness(0) invert(1)" } : undefined}
      />
      <div className={`text-[10px] uppercase tracking-widest ${white ? "text-white/60" : "text-pret-text-muted"}`}>
        Customer Portal
      </div>
    </div>
  );
}
