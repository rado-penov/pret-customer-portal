"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const IDLE_MS  = 30 * 60 * 1000;
const WARN_MS  = 25 * 60 * 1000;
const EVENTS   = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

export default function IdleTimer() {
  const [warning, setWarning] = useState(false);
  const idleRef = useRef<ReturnType<typeof setTimeout>>();
  const warnRef = useRef<ReturnType<typeof setTimeout>>();

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login?reason=idle";
  }, []);

  const reset = useCallback(() => {
    setWarning(false);
    clearTimeout(idleRef.current);
    clearTimeout(warnRef.current);
    warnRef.current = setTimeout(() => setWarning(true), WARN_MS);
    idleRef.current = setTimeout(logout, IDLE_MS);
  }, [logout]);

  useEffect(() => {
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(idleRef.current);
      clearTimeout(warnRef.current);
    };
  }, [reset]);

  if (!warning) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white border border-pret-bg-warm shadow-lg rounded-lg p-5 max-w-sm">
      <p className="text-sm font-semibold text-pret-text mb-1">Session expiring soon</p>
      <p className="text-xs text-pret-text-muted mb-4">
        You will be signed out in 5 minutes due to inactivity.
      </p>
      <button
        onClick={reset}
        className="bg-pret-red hover:bg-pret-red-deep text-white text-xs font-semibold uppercase tracking-widest rounded px-4 py-2 transition-colors"
      >
        Stay signed in
      </button>
    </div>
  );
}
