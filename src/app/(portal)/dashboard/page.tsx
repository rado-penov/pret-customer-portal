"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/types";
import { fmt } from "@/lib/format";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => ("error" in d ? setError(d.error) : setData(d)))
      .catch(() => setError("Failed to load dashboard."));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data)  return <Skeleton />;

  const buckets = [
    {
      label: "Last 7 days",
      amount: data.aging.lastWeek,
      count:  data.aging.lastWeekCount,
      bg:     "bg-[#FEF3C7]",
      border: "border-[#CA9E03]/40",
      text:   "text-[#92400E]",
    },
    {
      label: "8 – 14 days",
      amount: data.aging.twoWeeksAgo,
      count:  data.aging.twoWeeksAgoCount,
      bg:     "bg-[#FFEDD5]",
      border: "border-[#C2410C]/30",
      text:   "text-[#9A3412]",
    },
    {
      label: "15 – 30 days",
      amount: data.aging.lastMonth,
      count:  data.aging.lastMonthCount,
      bg:     "bg-[#FEE2E2]",
      border: "border-[#9F1B32]/30",
      text:   "text-pret-red-mid",
    },
    {
      label: "30+ days",
      amount: data.aging.olderThanMonth,
      count:  data.aging.olderThanMonthCount,
      bg:     "bg-pret-red",
      border: "border-pret-red-deep",
      text:   "text-white",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-pret-text">Account Overview</h1>
        <p className="text-sm text-pret-text-muted mt-1">Your current outstanding balance at a glance</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white border border-pret-bg-warm rounded p-6 shadow-sm">
          <p className="text-xs uppercase tracking-widest font-semibold text-pret-text-muted mb-3">Total Overdue</p>
          <p className="text-4xl font-bold text-pret-red">{fmt(data.totalOverdueAmount, data.currency)}</p>
          <p className="text-xs text-pret-text-muted mt-2">Outstanding balance across all overdue invoices</p>
        </div>
        <div className="bg-white border border-pret-bg-warm rounded p-6 shadow-sm">
          <p className="text-xs uppercase tracking-widest font-semibold text-pret-text-muted mb-3">Overdue Invoices</p>
          <p className="text-4xl font-bold text-pret-teal">{data.totalOverdueCount}</p>
          <p className="text-xs text-pret-text-muted mt-2">Invoices past their due date</p>
        </div>
      </div>

      {/* Aging */}
      <div>
        <h2 className="text-xs uppercase tracking-widest font-semibold text-pret-text-muted mb-4">
          Aging Breakdown
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {buckets.map((b) => (
            <div key={b.label} className={`rounded border-2 ${b.bg} ${b.border} p-5`}>
              <p className={`text-xs font-semibold uppercase tracking-wider opacity-80 ${b.text}`}>{b.label} overdue</p>
              <p className={`text-2xl font-bold mt-2 ${b.text}`}>{fmt(b.amount, data.currency)}</p>
              <p className={`text-xs mt-1 opacity-70 ${b.text}`}>{b.count} invoice{b.count !== 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/invoices",     label: "View open invoices",    icon: "📄" },
          { href: "/transactions", label: "Browse transactions",   icon: "📋" },
          { href: "/payments",     label: "Make a payment",        icon: "💳" },
        ].map(({ href, label, icon }) => (
          <a
            key={href}
            href={href}
            className="flex items-center gap-3 bg-white border border-pret-bg-warm rounded p-4 hover:border-pret-red/40 hover:shadow-sm transition-all group"
          >
            <span className="text-xl">{icon}</span>
            <span className="text-sm font-medium text-pret-text group-hover:text-pret-red transition-colors">{label}</span>
            <svg className="ml-auto w-4 h-4 text-pret-text-muted group-hover:text-pret-red transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-7 w-52 bg-pret-bg-warm rounded" />
      <div className="grid grid-cols-2 gap-5">
        {[0, 1].map((i) => <div key={i} className="h-32 bg-pret-bg-warm rounded" />)}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 bg-pret-bg-warm rounded" />)}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded bg-red-50 border border-red-200 px-5 py-4 text-sm text-pret-red-mid">
      {message}
    </div>
  );
}
