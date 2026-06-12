"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import type { Transaction } from "@/types";
import { TRANSACTION_TYPE_LABELS } from "@/types";
import { fmt, fmtDate } from "@/lib/format";

function exportTransactionsCSV(transactions: Transaction[]) {
  const headers = ["Date", "Reference", "Customer", "CI", "Type", "Status", "Customer Ref", "Due Date", "Memo", "Currency", "Amount"];
  const rows = transactions.map((t) => [
    t.tranDate,
    t.tranId,
    t.entityName ?? "",
    t.ciNumber || "",
    t.typeLabel,
    t.status || "",
    t.otherRefNum || "",
    t.dueDate || "",
    t.memo || "",
    t.currency,
    t.total,
  ]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const TYPE_OPTIONS = ["", ...Object.keys(TRANSACTION_TYPE_LABELS)];

const TYPE_PILL: Record<string, string> = {
  CustInvc: "bg-pret-teal/10 text-pret-teal",
  CustPymt: "bg-[#487302]/10 text-[#487302]",
  CustCred: "bg-[#CA9E03]/15 text-[#7A5F00]",
  CustRfnd: "bg-pret-bg-warm text-pret-text-muted",
  CustDep:  "bg-pret-red/10 text-pret-red",
};

export default function TransactionsPage() {
  const [transactions, setTransactions]     = useState<Transaction[]>([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [startDate, setStartDate]           = useState("");
  const [endDate, setEndDate]               = useState("");
  const [type, setType]                     = useState("");
  const [status, setStatus]                 = useState("");
  const [tranId, setTranId]                 = useState("");
  const [otherRefNum, setOtherRefNum]       = useState("");
  const [downloadingAll, setDownloadingAll] = useState(false);

  async function handleDownloadAll() {
    setDownloadingAll(true);
    try {
      const res = await fetch("/api/transactions/pdf-all");
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const yy = String(now.getFullYear()).slice(2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pret${yy}${mm}${dd}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user can retry
    } finally {
      setDownloadingAll(false);
    }
  }

  function buildQS(overrides?: Partial<Record<string, string>>) {
    const vals = { startDate, endDate, type, status, tranId, otherRefNum, ...overrides };
    const p = new URLSearchParams();
    if (vals.startDate)   p.set("startDate",   vals.startDate);
    if (vals.endDate)     p.set("endDate",     vals.endDate);
    if (vals.type)        p.set("type",        vals.type);
    if (vals.status)      p.set("status",      vals.status);
    if (vals.tranId)      p.set("tranId",      vals.tranId);
    if (vals.otherRefNum) p.set("otherRefNum", vals.otherRefNum);
    return p.toString();
  }

  function load(overrides?: Partial<Record<string, string>>) {
    setLoading(true);
    setError("");
    fetch(`/api/transactions?${buildQS(overrides)}`)
      .then((r) => r.json())
      .then((d) => { "error" in d ? setError(d.error) : setTransactions(d); setLoading(false); })
      .catch(() => { setError("Failed to load transactions."); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  function handleSubmit(e: FormEvent) { e.preventDefault(); load(); }

  function handleClear() {
    setStartDate(""); setEndDate(""); setType(""); setStatus(""); setTranId(""); setOtherRefNum("");
    load({ startDate: "", endDate: "", type: "", status: "", tranId: "", otherRefNum: "" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-pret-text">Statement</h1>
        <p className="text-sm text-pret-text-muted mt-1">Filter your full transaction history</p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSubmit} className="bg-white border border-pret-bg-warm rounded shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: "Date from", type: "date", value: startDate, set: setStartDate, placeholder: "" },
            { label: "Date to",   type: "date", value: endDate,   set: setEndDate,   placeholder: "" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-pret-text-muted mb-1.5">{label}</label>
              <input type="date" value={value} placeholder={placeholder}
                onChange={(e) => set(e.target.value)}
                className="w-full rounded border border-[#D9D4D5] bg-white px-3 py-2 text-sm text-pret-text focus:ring-2 focus:ring-pret-red focus:outline-none" />
            </div>
          ))}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-pret-text-muted mb-1.5">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full rounded border border-[#D9D4D5] bg-white px-3 py-2 text-sm text-pret-text focus:ring-2 focus:ring-pret-red focus:outline-none">
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t ? TRANSACTION_TYPE_LABELS[t] : "All types"}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-pret-text-muted mb-1.5">Status</label>
            <input type="text" value={status} placeholder="e.g. Open"
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded border border-[#D9D4D5] bg-white px-3 py-2 text-sm text-pret-text focus:ring-2 focus:ring-pret-red focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-pret-text-muted mb-1.5">Reference</label>
            <input type="text" value={tranId} placeholder="e.g. INV-1234"
              onChange={(e) => setTranId(e.target.value)}
              className="w-full rounded border border-[#D9D4D5] bg-white px-3 py-2 text-sm text-pret-text focus:ring-2 focus:ring-pret-red focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-pret-text-muted mb-1.5">Customer Ref (PO No.)</label>
            <input type="text" value={otherRefNum} placeholder="e.g. PO-5678"
              onChange={(e) => setOtherRefNum(e.target.value)}
              className="w-full rounded border border-[#D9D4D5] bg-white px-3 py-2 text-sm text-pret-text focus:ring-2 focus:ring-pret-red focus:outline-none" />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-pret-bg-warm flex-wrap">
          <button type="submit"
            className="bg-pret-red hover:bg-pret-red-deep text-white text-xs font-semibold uppercase tracking-widest rounded px-5 py-2 transition-colors">
            Search
          </button>
          <button type="button" onClick={handleClear}
            className="text-xs font-semibold uppercase tracking-widest text-pret-text-muted hover:text-pret-text px-3 py-2 transition-colors">
            Clear
          </button>
          {transactions.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => exportTransactionsCSV(transactions)}
                className="flex items-center gap-1.5 border border-[#D9D4D5] bg-white hover:bg-pret-bg text-pret-text text-xs font-semibold uppercase tracking-widest rounded px-4 py-2 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                className="flex items-center gap-1.5 border border-[#D9D4D5] bg-white hover:bg-pret-bg text-pret-text text-xs font-semibold uppercase tracking-widest rounded px-4 py-2 transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {downloadingAll ? "Generating…" : "Download All"}
              </button>
            </div>
          )}
        </div>
      </form>

      {error && <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-pret-red-mid">{error}</div>}

      <div className="bg-white border border-pret-bg-warm rounded shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-pret-bg-warm">
          <span className="text-xs font-semibold uppercase tracking-widest text-pret-text-muted">
            {loading ? "Loading…" : `${transactions.length} result${transactions.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pret-bg-warm">
                {["Date", "Reference", "Customer", "CI", "Type", "Status", "Customer Ref", "Due Date", "Memo", "Amount", ""].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-pret-text-muted last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-pret-bg-warm">
              {!loading && transactions.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-10 text-center text-pret-text-muted">No transactions found.</td></tr>
              )}
              {transactions.map((t) => {
                const isCredit = t.type === "CustPymt" || t.type === "CustCred";
                return (
                  <tr key={t.id} className="hover:bg-pret-bg transition-colors">
                    <td className="px-3 py-3 text-pret-text-muted whitespace-nowrap">{fmtDate(t.tranDate)}</td>
                    <td className="px-3 py-3 font-semibold text-pret-teal whitespace-nowrap">{t.tranId}</td>
                    <td className="px-3 py-3 text-pret-text-muted">{t.entityName || ""}</td>
                    <td className="px-3 py-3 text-pret-text-muted text-xs whitespace-nowrap">{t.ciNumber || "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TYPE_PILL[t.type] ?? "bg-pret-bg text-pret-text-muted"}`}>
                        {t.typeLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-pret-text-muted text-xs">{t.status || "—"}</td>
                    <td className="px-3 py-3 text-pret-text-muted">{t.otherRefNum || "—"}</td>
                    <td className="px-3 py-3 text-pret-text-muted whitespace-nowrap">{t.dueDate ? fmtDate(t.dueDate) : "—"}</td>
                    <td className="px-3 py-3 text-pret-text-muted max-w-[160px] truncate">{t.memo || "—"}</td>
                    <td className={`px-3 py-3 font-semibold whitespace-nowrap ${isCredit ? "text-[#487302]" : "text-pret-text"}`}>
                      {isCredit ? "-" : ""}{fmt(Math.abs(t.total), t.currency)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {(t.type === "CustInvc" || t.type === "CustCred" || t.type === "Journal") && (
                        <Link
                          href={`/transactions/${t.id}`}
                          className="text-[10px] font-semibold uppercase tracking-widest text-pret-teal hover:text-pret-red transition-colors"
                        >
                          View →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
