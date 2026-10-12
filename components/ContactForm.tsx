"use client";

import { useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send your message.");
      setStatus("ok");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send your message.");
    }
  }

  if (status === "ok") {
    return (
      <div className="bg-surface border border-accent/40 rounded-2xl p-8 text-center">
        <div className="text-accent text-4xl mb-3">✓</div>
        <h3 className="text-xl font-extrabold mb-2">Message received</h3>
        <p className="text-muted text-sm">We read everything and reply within 2 business days.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-surface border border-line rounded-2xl p-6 md:p-8 space-y-5">
      <div>
        <label className="text-xs uppercase tracking-widest text-muted" htmlFor="ct-name">Name</label>
        <input id="ct-name" className="field mt-2" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="Your name" />
      </div>
      <div>
        <label className="text-xs uppercase tracking-widest text-muted" htmlFor="ct-email">Email</label>
        <input id="ct-email" type="email" className="field mt-2" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} placeholder="you@example.com" />
      </div>
      <div>
        <label className="text-xs uppercase tracking-widest text-muted" htmlFor="ct-msg">Message</label>
        <textarea id="ct-msg" className="field mt-2 min-h-[140px] resize-y" value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={5000} placeholder="How can we help?" />
      </div>
      {status === "error" && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={status === "sending"} className="btn-accent w-full disabled:opacity-60">
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
