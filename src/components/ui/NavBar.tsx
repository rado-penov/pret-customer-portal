"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard",    label: "Dashboard" },
  { href: "/invoices",     label: "Open Invoices" },
  { href: "/transactions", label: "Transactions" },
  { href: "/payments",     label: "Make Payment" },
];

export default function NavBar({ userName, companyName }: { userName: string; companyName: string }) {
  const pathname = usePathname();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="bg-pret-red text-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pret-logo.png"
              alt="Pret A Manger"
              className="h-8 w-auto object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <div className="text-[10px] text-white/60 uppercase tracking-widest leading-none">
              Customer Portal
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="font-bold text-white">{companyName}</span>
              <span className="text-white/50">|</span>
              <span className="text-white">{userName}</span>
            </div>
            <button
              onClick={logout}
              className="text-xs uppercase tracking-widest text-white/70 hover:text-white border border-white/30 hover:border-white px-3 py-1.5 rounded transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Nav row */}
        <nav className="flex gap-0 border-t border-white/10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          {NAV.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 ${
                  active
                    ? "border-white text-white"
                    : "border-transparent text-white/60 hover:text-white hover:border-white/40"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
