"use client";

import { useEffect, useState } from "react";
import type { ConsolidatedInvoice } from "@/types";
import { fmt, fmtDate } from "@/lib/format";

export default function ConsolidatedInvoicesPage() {
  const [items, setItems]         = useState<ConsolidatedInvoice[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    fetch("/api/consolidated-invoices")
      .then((r) => r.json())
      .then((d) => { "error" in d ? setError(d.error) : setItems(d); setLoading(false); })
      .catch(() => { setError("Failed to load consolidated invoices."); setLoading(false); });
  }, []);

  async function handleDownload(ci: ConsolidatedInvoice) {
    setDownloading(ci.id);
    setDownloadError("");
    try {
      const res = await fetch(`/api/consolidated-invoices/${ci.id}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ci.name.toUpperCase().replace(/[^A-Z0-9]/g, "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-pret-text">Consolidated Invoices</h1>
        <p className="text-sm text-pret-text-muted mt-1">Bundled invoice statements generated for your account</p>
      </div>

      {error && <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-pret-red-mid">{error}</div>}
      {downloadError && <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-pret-red-mid">Download error: {downloadError}</div>}

      <div className="bg-white border border-pret-bg-warm rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pret-bg-warm">
                {["Reference", "CI Date", "Due Date", "Invoices", "Total Due", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-pret-text-muted last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-pret-bg-warm">
              {loading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-pret-text-muted">Loading…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-pret-text-muted">No consolidated invoices found.</td></tr>
              )}
              {items.map((ci) => {
                const isOverdue = ci.dueDate < new Date().toISOString().slice(0, 10);
                return (
                  <tr key={ci.id} className="hover:bg-pret-bg transition-colors">
                    <td className="px-4 py-3 font-semibold text-pret-teal">{ci.name}</td>
                    <td className="px-4 py-3 text-pret-text-muted">{fmtDate(ci.ciDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${isOverdue ? "text-pret-red" : "text-pret-text"}`}>
                        {fmtDate(ci.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-pret-text">{ci.invoiceCount}</td>
                    <td className={`px-4 py-3 font-bold ${isOverdue ? "text-pret-red" : "text-pret-text"}`}>
                      {fmt(ci.totalDue, "GBP")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDownload(ci)}
                        disabled={downloading === ci.id}
                        className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-pret-teal hover:text-pret-red transition-colors disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {downloading === ci.id ? "Downloading…" : "Download PDF"}
                      </button>
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
