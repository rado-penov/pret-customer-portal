"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Invoice } from "@/types";
import { fmt, fmtDate } from "@/lib/format";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [endDate, setEndDate]   = useState("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  function load(date?: string) {
    setLoading(true);
    setError("");
    const qs = date ? `?endDate=${date}` : "";
    fetch(`/api/invoices${qs}`)
      .then((r) => r.json())
      .then((d) => { "error" in d ? setError(d.error) : setInvoices(d); setLoading(false); })
      .catch(() => { setError("Failed to load invoices."); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  const total    = invoices.reduce((s, i) => s + i.amountDue, 0);
  const currency = invoices[0]?.currency ?? "GBP";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-pret-text">Open Invoices</h1>
          <p className="text-sm text-pret-text-muted mt-1">All unpaid invoices on your account</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs uppercase tracking-widest font-semibold text-pret-text-muted whitespace-nowrap">Due by</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded border border-[#D9D4D5] bg-white px-3 py-2 text-sm text-pret-text focus:ring-2 focus:ring-pret-red focus:outline-none"
          />
          <button
            onClick={() => load(endDate || undefined)}
            className="bg-pret-red hover:bg-pret-red-deep text-white text-xs font-semibold uppercase tracking-widest rounded px-4 py-2 transition-colors"
          >
            Filter
          </button>
          {endDate && (
            <button onClick={() => { setEndDate(""); load(); }} className="text-xs text-pret-text-muted hover:text-pret-text">
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-pret-red-mid">{error}</div>}

      <div className="bg-white border border-pret-bg-warm rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pret-bg-warm">
                {["Reference", "Date", "Due Date", "Memo", "Total", "Paid", "Amount Due", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-pret-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-pret-bg-warm">
              {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-pret-text-muted text-sm">Loading…</td></tr>}
              {!loading && invoices.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-pret-text-muted text-sm">No open invoices found.</td></tr>
              )}
              {invoices.map((inv) => {
                const isOverdue = inv.dueDate < new Date().toISOString().slice(0, 10);
                return (
                  <tr key={inv.id} className="hover:bg-pret-bg transition-colors">
                    <td className="px-4 py-3 font-semibold text-pret-teal">{inv.tranId}</td>
                    <td className="px-4 py-3 text-pret-text-muted">{fmtDate(inv.tranDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${isOverdue ? "text-pret-red" : "text-pret-text"}`}>
                        {fmtDate(inv.dueDate)}
                      </span>
                      {isOverdue && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider bg-pret-red/10 text-pret-red rounded px-1.5 py-0.5">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-pret-text-muted max-w-xs truncate">{inv.memo}</td>
                    <td className="px-4 py-3 text-right text-pret-text">{fmt(inv.total, inv.currency)}</td>
                    <td className="px-4 py-3 text-right text-pret-text-muted">{fmt(inv.amountPaid, inv.currency)}</td>
                    <td className="px-4 py-3 text-right font-bold text-pret-text">{fmt(inv.amountDue, inv.currency)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-[10px] font-semibold uppercase tracking-widest text-pret-teal hover:text-pret-red transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {!loading && invoices.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-pret-bg-warm bg-pret-bg">
                  <td colSpan={6} className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-pret-text-muted text-right">
                    Total outstanding
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-pret-red text-base">{fmt(total, currency)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
