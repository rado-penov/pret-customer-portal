"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const CRITERIA = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "At least one uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "At least one lowercase letter (a–z)", test: (p: string) => /[a-z]/.test(p) },
  {
    label: "At least one special character (!@#$%^&*...)",
    test: (p: string) => /[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?]/.test(p),
  },
];

function ConfirmForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) window.location.href = "/reset-password";
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    setLoading(false);

    if (res.ok) {
      setSuccess(true);
    } else {
      let msg = "Something went wrong. Please try again.";
      try { const d = await res.json(); msg = d.error ?? msg; } catch {}
      setError(msg);
    }
  }

  if (success) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-pret-text mb-3">Password updated</h1>
        <p className="text-sm text-pret-text-muted mb-6">
          Your password has been changed successfully.
        </p>
        <Link
          href="/login"
          className="block text-center text-sm font-medium text-pret-red hover:text-pret-red-deep transition-colors"
        >
          Sign in with your new password
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-pret-text mb-1">Create new password</h1>
      <p className="text-sm text-pret-text-muted mb-6">Choose a strong password for your account.</p>

      <div className="mb-6 rounded bg-[#F6F4F5] border border-[#D9D4D5] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-pret-text-muted mb-3">
          Password requirements
        </p>
        <ul className="space-y-1.5">
          {CRITERIA.map(({ label, test }) => {
            const met = password.length > 0 && test(password);
            return (
              <li key={label} className="flex items-center gap-2">
                <span className={`text-sm font-bold ${met ? "text-green-600" : "text-[#C0B8B9]"}`}>
                  {met ? "✓" : "○"}
                </span>
                <span className={`text-xs ${met ? "text-green-700" : "text-pret-text-muted"}`}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {error && (
        <div className="mb-5 rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-pret-red-mid">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-pret-text-muted mb-2">
            New password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#D9D4D5] bg-white rounded px-4 py-3 text-sm text-pret-text placeholder:text-pret-text-muted/60 focus:outline-none focus:ring-2 focus:ring-pret-red focus:border-transparent transition"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-pret-text-muted mb-2">
            Confirm password
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-[#D9D4D5] bg-white rounded px-4 py-3 text-sm text-pret-text placeholder:text-pret-text-muted/60 focus:outline-none focus:ring-2 focus:ring-pret-red focus:border-transparent transition"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pret-red hover:bg-pret-red-deep disabled:opacity-50 text-white font-semibold rounded py-3 text-sm uppercase tracking-widest transition-colors"
        >
          {loading ? "Updating…" : "Set new password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordConfirmPage() {
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
        <Suspense fallback={null}>
          <ConfirmForm />
        </Suspense>
      </div>
    </div>
  );
}
