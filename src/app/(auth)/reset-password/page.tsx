"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/reset-password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (res.ok) {
      setSubmitted(true);
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-pret-bg px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pret-logo.png" alt="Pret A Manger" className="h-10 w-auto object-contain" />
          <div className="text-[10px] uppercase tracking-widest text-pret-text-muted mt-2">
            Customer Portal
          </div>
        </div>

        {submitted ? (
          <div>
            <h1 className="text-2xl font-semibold text-pret-text mb-3">Check your email</h1>
            <p className="text-sm text-pret-text-muted leading-relaxed mb-2">
              If an account exists for <strong>{email}</strong>, you&apos;ll receive a reset link shortly.
            </p>
            <p className="text-xs text-pret-text-muted">The link expires in 1 hour.</p>
            <Link
              href="/login"
              className="block mt-8 text-center text-sm font-medium text-pret-red hover:text-pret-red-deep transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-pret-text mb-1">Reset your password</h1>
            <p className="text-sm text-pret-text-muted mb-8">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

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
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-pret-red hover:bg-pret-red-deep disabled:opacity-50 text-white font-semibold rounded py-3 text-sm uppercase tracking-widest transition-colors"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <Link
              href="/login"
              className="block mt-6 text-center text-sm font-medium text-pret-red hover:text-pret-red-deep transition-colors"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
