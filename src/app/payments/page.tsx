"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Invoice, PaymentResult } from "@/types";
import { fmt, fmtDate } from "@/lib/format";

function PaymentsContent() {
  const searchParams     = useSearchParams();
  const preloadInvoiceId = searchParams.get("invoiceId");
  const preloadAmount    = searchParams.get("amount");

  const [invoices, setInvoices]       = useState<Invoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [amount, setAmount]           = useState(preloadAmount ?? "");
  const [memo, setMemo]               = useState("");
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [result, setResult]           = useState<PaymentResult | null>(null);
  const [error, setError]             = useState("");

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((d: Invoice[]) => {
        setInvoices(d);
        if (preloadInvoiceId) setSelectedIds(new Set([preloadInvoiceId]));
      })
      .catch(() => setError("Failed to load invoices."))
      .finally(() => setLoading(false));
  }, [preloadInvoiceId]);

  function toggleInvoice(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      const selected = invoices.filter((i) => next.has(i.id));
      setAmount(selected.reduce((s, i) => s + i.amountDue, 0).toFixed(2));
      return next;
    });
  }

  async function handleSubmit() {
    if (!selectedIds.size) { setError("Please select at least one invoice."); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Please enter a valid payment amount."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res  = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, invoiceIds: [...selectedIds], memo }),
      });
      const data = await res.json();
      res.ok ? setResult(data) : setError(data.error ?? "Payment failed.");
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Success screen ─────────────────────────────────────────────── */
  if (result) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white border border-pret-bg-warm rounded shadow-sm p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-[#487302]/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-[#487302]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-pret-text mb-2">Payment Submitted</h2>
          <p className="text-sm text-pret-text-muted mb-6">{result.message}</p>
          <div className="bg-pret-bg rounded border border-pret-bg-warm p-4 text-left space-y-3 text-sm">
            <Row label="Payment Ref" value={result.tranId} />
            <Row label="Status"      value={result.status} />
          </div>
          <button
            onClick={() => { setResult(null); setSelectedIds(new Set()); setAmount(""); setMemo(""); }}
            className="mt-6 bg-pret-red hover:bg-pret-red-deep text-white font-semibold text-xs uppercase tracking-widest rounded px-6 py-3 transition-colors"
          >
            Make another payment
          </button>
        </div>
      </div>
    );
  }

  const selectedTotal = invoices.filter((i) => selectedIds.has(i.id)).reduce((s, i) => s + i.amountDue, 0);
  const currency      = invoices[0]?.currency ?? "GBP";

  /* ── Main screen ────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-pret-text">Make a Payment</h1>
        <p className="text-sm text-pret-text-muted mt-1">Select invoices and confirm the amount to pay</p>
      </div>

      {error && <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-pret-red-mid">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice list */}
        <div className="lg:col-span-2 bg-white border border-pret-bg-warm rounded shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-pret-bg-warm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-pret-text-muted">Select invoices to pay</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pret-bg-warm">
                  <th className="px-4 py-3 w-10" />
                  {["Reference", "Due Date", "Amount Due"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-pret-text-muted last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-pret-bg-warm">
                {loading && <tr><td colSpan={4} className="px-4 py-10 text-center text-pret-text-muted">Loading invoices…</td></tr>}
                {!loading && invoices.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-pret-text-muted">No open invoices.</td></tr>}
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => toggleInvoice(inv.id)}
                    className={`cursor-pointer transition-colors ${selectedIds.has(inv.id) ? "bg-pret-red/5 border-l-2 border-l-pret-red" : "hover:bg-pret-bg border-l-2 border-l-transparent"}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inv.id)}
                        onChange={() => toggleInvoice(inv.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-[#D9D4D5] text-pret-red focus:ring-pret-red"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-pret-teal">{inv.tranId}</td>
                    <td className="px-4 py-3 text-pret-text-muted">{fmtDate(inv.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-bold text-pret-text">{fmt(inv.amountDue, inv.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment panel */}
        <div className="bg-white border border-pret-bg-warm rounded shadow-sm p-6 space-y-5 h-fit">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-pret-text-muted">Payment details</h2>

          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-pret-text-muted mb-1">Selected invoices total</p>
            <p className="text-3xl font-bold text-pret-red">{fmt(selectedTotal, currency)}</p>
          </div>

          <div className="border-t border-pret-bg-warm pt-4 space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-pret-text-muted mb-1.5">
                Payment amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-pret-text-muted text-sm font-medium">£</span>
                <input
                  type="number" min="0.01" step="0.01" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded border border-[#D9D4D5] bg-white pl-7 pr-3 py-2.5 text-sm text-pret-text focus:ring-2 focus:ring-pret-red focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <p className="text-[10px] text-pret-text-muted mt-1">Adjust for partial payment</p>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-pret-text-muted mb-1.5">
                Memo / reference
              </label>
              <input
                type="text" value={memo} placeholder="Optional"
                onChange={(e) => setMemo(e.target.value)}
                className="w-full rounded border border-[#D9D4D5] bg-white px-3 py-2.5 text-sm text-pret-text focus:ring-2 focus:ring-pret-red focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedIds.size}
            className="w-full bg-pret-red hover:bg-pret-red-deep disabled:opacity-40 text-white font-bold text-xs uppercase tracking-widest rounded py-3.5 transition-colors"
          >
            {submitting ? "Processing…" : "Submit payment"}
          </button>

          <p className="text-[10px] text-pret-text-muted text-center leading-relaxed">
            This will create a payment record in NetSuite and initiate processing.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-pret-text-muted">{label}</span>
      <span className="font-semibold text-pret-text">{value}</span>
    </div>
  );
}

export default function PaymentsPage() {
  return <Suspense><PaymentsContent /></Suspense>;
}
