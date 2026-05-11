"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { TransactionDetail } from "@/types";
import { fmt, fmtDate } from "@/lib/format";

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [txn, setTxn]     = useState<TransactionDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/transactions/${id}`)
      .then((r) => r.json())
      .then((d) => ("error" in d ? setError(d.error) : setTxn(d)))
      .catch(() => setError("Failed to load transaction."));
  }, [id]);

  if (error) return (
    <div className="space-y-4">
      <BackLink />
      <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-pret-red-mid">{error}</div>
    </div>
  );

  if (!txn) return (
    <div className="space-y-4 animate-pulse">
      <BackLink />
      <div className="h-44 bg-pret-bg-warm rounded" />
      <div className="h-64 bg-pret-bg-warm rounded" />
    </div>
  );

  const isInvoice  = txn.type === "CustInvc";
  const isCredit   = txn.type === "CustCred";
  const isOverdue  = isInvoice && txn.dueDate < new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <BackLink />
        <div className="h-5 border-l border-pret-bg-warm" />
        <span className="text-xs font-semibold uppercase tracking-widest text-pret-text-muted">{txn.typeLabel}</span>
        <div className="h-5 border-l border-pret-bg-warm" />
        <h1 className="text-xl font-semibold text-pret-text">{txn.tranId}</h1>
        {isOverdue && (
          <span className="text-[10px] font-bold uppercase tracking-widest bg-pret-red text-white rounded px-2.5 py-1">
            Overdue
          </span>
        )}
      </div>

      {/* Summary card */}
      <div className="bg-white border border-pret-bg-warm rounded shadow-sm p-6">
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          <Field label="Reference" value={txn.tranId} />
          <Field label="Date"      value={fmtDate(txn.tranDate)} />
          {isInvoice && (
            <Field label="Due Date" value={fmtDate(txn.dueDate)} accent={isOverdue ? "text-pret-red font-semibold" : ""} />
          )}
          <Field label="Total"     value={fmt(txn.total, txn.currency)} />
          {isInvoice && (
            <Field label="Amount Due" value={fmt(txn.amountDue, txn.currency)} accent="text-pret-red font-bold text-lg" />
          )}
          {isCredit && (
            <Field label="Credit Amount" value={fmt(txn.total, txn.currency)} accent="text-[#487302] font-bold text-lg" />
          )}
          <Field label="Memo" value={txn.memo || "—"} />
        </dl>
      </div>

      {/* Line items */}
      <div className="bg-white border border-pret-bg-warm rounded shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-pret-bg-warm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-pret-text-muted">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pret-bg-warm">
                {["Item", "Description", "Qty", "Rate", "Amount"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-pret-text-muted last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-pret-bg-warm">
              {txn.lines.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-pret-text-muted">No line items.</td></tr>
              )}
              {txn.lines.map((line) => (
                <tr key={line.id} className="hover:bg-pret-bg transition-colors">
                  <td className="px-5 py-3 font-medium text-pret-text">{line.item || "—"}</td>
                  <td className="px-5 py-3 text-pret-text-muted">{line.description || "—"}</td>
                  <td className="px-5 py-3 text-pret-text">{line.quantity}</td>
                  <td className="px-5 py-3 text-pret-text">{fmt(line.rate, txn.currency)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-pret-text">{fmt(line.amount, txn.currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-pret-bg-warm bg-pret-bg">
                <td colSpan={4} className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-pret-text-muted text-right">
                  {isCredit ? "Credit total" : "Amount remaining"}
                </td>
                <td className={`px-5 py-3 text-right font-bold text-base ${isCredit ? "text-[#487302]" : "text-pret-red"}`}>
                  {fmt(isCredit ? txn.total : txn.amountDue, txn.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Pay CTA — invoices only */}
      {isInvoice && txn.amountDue > 0 && (
        <div className="flex justify-end">
          <Link
            href={`/payments?invoiceId=${txn.id}&amount=${txn.amountDue}`}
            className="bg-pret-red hover:bg-pret-red-deep text-white font-semibold text-xs uppercase tracking-widest rounded px-6 py-3 transition-colors"
          >
            Pay this invoice →
          </Link>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, accent = "" }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest font-semibold text-pret-text-muted mb-1">{label}</dt>
      <dd className={`text-sm text-pret-text ${accent}`}>{value}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/transactions" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-pret-text-muted hover:text-pret-red transition-colors">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Transactions
    </Link>
  );
}
