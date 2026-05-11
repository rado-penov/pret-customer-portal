"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import type { Transaction } from "@/types";
import { TRANSACTION_TYPE_LABELS } from "@/types";
import { fmt, fmtDate } from "@/lib/format";

const TYPE_OPTIONS = ["", ...Object.keys(TRANSACTION_TYPE_LABELS)];

const TYPE_PILL: Record<string, string> = {
  CustInvc: "bg-pret-teal/10 text-pret-teal",
  CustPymt: "bg-[#487302]/10 text-[#487302]",
  CustCred: "bg-[#CA9E03]/15 text-[#7A5F00]",
  CustRfnd: "bg-pret-bg-warm text-pret-text-muted",
  CustDep:  "bg-pret-red/10 text-pret-red",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [startDate, setStartDate]       = useState("");
  const [endDate, setEndDate]           = useState("");
  const [type, setType]                 = useState("");
  const [tranId, setTranId]             = useState("");
  const [otherRefNum, setOtherRefNum]   = useState("");

  function buildQS(overrides?: Partial<Record<string, string>>) {
    const vals = { startDate, endDate, type, tranId, otherRefNum, ...overrides };
    const p = new URLSearchParams();
    if (vals.startDate)   p.set("startDate",   vals.startDate);
    if (vals.endDate)     p.set("endDate",     vals.endDate);
    if (vals.type)        p.set("type",        vals.type);
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
    setStartDate(""); setEndDate(""); setType(""); setTranId(""); setOtherRefNum("");
    load({ startDate: "", endDate: "", type: "", tranId: "", otherRefNum: "" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-pret-text">Transactions</h1>
        <p className="text-sm text-pret-text-muted mt-1">Filter your full transaction history</p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSubmit} className="bg-white border border-pret-bg-warm rounded shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <div className="flex gap-3 mt-4 pt-4 border-t border-pret-bg-warm">
          <button type="submit"
            className="bg-pret-red hover:bg-pret-red-deep text-white text-xs font-semibold uppercase tracking-widest rounded px-5 py-2 transition-colors">
            Search
          </button>
          <button type="button" onClick={handleClear}
            className="text-xs font-semibold uppercase tracking-widest text-pret-text-muted hover:text-pret-text px-3 py-2 transition-colors">
            Clear
          </button>
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
                {["Date", "Reference", "Type", "Customer Ref", "Memo", "Amount", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-pret-text-muted last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-pret-bg-warm">
              {!loading && transactions.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-pret-text-muted">No transactions found.</td></tr>
              )}
              {transactions.map((t) => {
                const isCredit = t.type === "CustPymt" || t.type === "CustCred";
                return (
                  <tr key={t.id} className="hover:bg-pret-bg transition-colors">
                    <td className="px-4 py-3 text-pret-text-muted whitespace-nowrap">{fmtDate(t.tranDate)}</td>
                    <td className="px-4 py-3 font-semibold text-pret-teal">{t.tranId}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TYPE_PILL[t.type] ?? "bg-pret-bg text-pret-text-muted"}`}>
                        {t.typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-pret-text-muted">{t.otherRefNum || "—"}</td>
                    <td className="px-4 py-3 text-pret-text-muted max-w-xs truncate">{t.memo || "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${isCredit ? "text-[#487302]" : "text-pret-text"}`}>
                      {isCredit ? "-" : ""}{fmt(Math.abs(t.total), t.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(t.type === "CustInvc" || t.type === "CustCred") && (
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
