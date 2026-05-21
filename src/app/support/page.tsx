"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";

const MAX_TOTAL_BYTES = 15 * 1024 * 1024;

interface AttachedFile {
  file: File;
  id: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SupportPage() {
  const [subject, setSubject]         = useState("");
  const [message, setMessage]         = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [sizeError, setSizeError]     = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState("");
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const totalSize = attachments.reduce((sum, a) => sum + a.file.size, 0);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (totalSize + file.size > MAX_TOTAL_BYTES) {
      setSizeError(
        `Adding "${file.name}" (${formatSize(file.size)}) would exceed the 15 MB total limit. Currently using ${formatSize(totalSize)}.`
      );
      return;
    }
    setSizeError("");
    setAttachments((prev) => [...prev, { file, id: crypto.randomUUID() }]);
  }

  function removeFile(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    setSizeError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("subject", subject);
    formData.append("message", message);
    attachments.forEach((a) => formData.append("files", a.file));

    try {
      const res = await fetch("/api/support", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Failed to send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-pret-bg-warm rounded p-10 shadow-sm text-center">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-pret-text mb-2">Message sent</h2>
          <p className="text-sm text-pret-text-muted mb-6">
            Thank you for getting in touch. Our support team will get back to you shortly.
          </p>
          <button
            onClick={() => { setSubmitted(false); setSubject(""); setMessage(""); setAttachments([]); }}
            className="text-sm font-medium text-pret-red hover:text-pret-red-deep transition-colors"
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-pret-text">Contact Customer Support</h1>
        <p className="text-sm text-pret-text-muted mt-1">Our team will get back to you as soon as possible.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-pret-bg-warm rounded p-6 shadow-sm space-y-5">

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-pret-text-muted mb-2">
            Subject
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder="Brief description of your query"
            className="w-full border border-[#D9D4D5] bg-white rounded px-4 py-3 text-sm text-pret-text placeholder:text-pret-text-muted/60 focus:outline-none focus:ring-2 focus:ring-pret-red focus:border-transparent transition"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-pret-text-muted mb-2">
            Your Message
          </label>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={10000}
            rows={8}
            placeholder="Please describe your query in detail…"
            className="w-full border border-[#D9D4D5] bg-white rounded px-4 py-3 text-sm text-pret-text placeholder:text-pret-text-muted/60 focus:outline-none focus:ring-2 focus:ring-pret-red focus:border-transparent transition resize-y"
          />
          <p className="text-[11px] text-pret-text-muted mt-1 text-right">
            {message.length.toLocaleString()} / 10,000 characters
          </p>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-pret-text-muted mb-2">
            Attachments
          </label>

          {attachments.length > 0 && (
            <ul className="mb-3 space-y-2">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between bg-pret-bg border border-pret-bg-warm rounded px-3 py-2">
                  <span className="text-sm text-pret-text truncate max-w-xs">{a.file.name}</span>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-xs text-pret-text-muted">{formatSize(a.file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(a.id)}
                      className="text-pret-text-muted hover:text-pret-red transition-colors"
                      aria-label="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 border border-[#D9D4D5] rounded px-4 py-2 text-sm font-medium text-pret-text hover:border-pret-red hover:text-pret-red transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Attach file
            </button>
            <span className="text-xs text-pret-text-muted">
              {attachments.length > 0
                ? `${formatSize(totalSize)} of 15 MB used · ${attachments.length} file${attachments.length !== 1 ? "s" : ""}`
                : "Max total size: 15 MB · one file at a time"}
            </span>
          </div>

          {sizeError && (
            <p className="mt-2 text-xs text-pret-red">{sizeError}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-pret-red-mid">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-pret-red hover:bg-pret-red-deep disabled:opacity-50 text-white font-semibold rounded py-3 text-sm uppercase tracking-widest transition-colors"
        >
          {submitting ? "Sending…" : "Send Message"}
        </button>
      </form>
    </div>
  );
}
