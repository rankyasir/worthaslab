"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase-client";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["5 calculations / month", "All PSA tiers", "Transparent verdict math", "Demo card catalog"],
    cta: "Start Free",
    href: "/signup",
    featured: false,
  },
  {
    id: "pro_monthly",
    name: "Pro",
    price: "$9.99",
    period: "/month",
    features: [
      "Unlimited calculations",
      "Calculation history",
      "Priority new-card requests",
      "Crypto checkout (BTC, ETH, USDT)",
      "Cancel anytime",
    ],
    cta: "Go Pro",
    href: "/signup?plan=pro_monthly",
    featured: true,
  },
  {
    id: "pro_yearly",
    name: "Pro Yearly",
    price: "$99",
    period: "/year",
    features: ["Everything in Pro", "2 months free", "Crypto checkout (BTC, ETH, USDT)", "Cancel anytime"],
    cta: "Go Yearly",
    href: "/signup?plan=pro_yearly",
    featured: false,
  },
];

export default function PricingCards() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function checkout(planId: string) {
    setError("");
    if (!isSupabaseConfigured()) {
      window.location.href = `/signup?plan=${planId}`;
      return;
    }
    const supabase = getSupabaseBrowser();
    const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    if (!data?.user) {
      window.location.href = `/signup?plan=${planId}`;
      return;
    }
    setBusy(planId);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, payCurrency: "usdt" }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Checkout failed");
      window.location.href = payload.invoice_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl border p-8 flex flex-col card-glow bg-surface ${
              p.featured ? "border-accent/60 shadow-[0_0_40px_rgba(0,255,136,0.12)]" : "border-line"
            }`}
          >
            {p.featured && (
              <span className="self-start text-[11px] font-extrabold uppercase tracking-widest bg-accent text-[#04120a] px-3 py-1 rounded-full mb-4">
                Recommended
              </span>
            )}
            <h3 className="text-xl font-extrabold">{p.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight">{p.price}</span>
              <span className="text-muted text-sm">{p.period}</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-muted flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span className="text-accent font-bold">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              {p.id === "free" ? (
                <Link href={p.href} className="btn-ghost block text-center w-full">
                  {p.cta}
                </Link>
              ) : (
                <button
                  onClick={() => checkout(p.id)}
                  disabled={busy !== null}
                  className={`btn-accent w-full ${p.featured ? "" : "!bg-transparent !text-accent border border-accent/60"}`}
                >
                  {busy === p.id ? "Creating invoice…" : p.cta}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-center text-red-400 text-sm mt-6">{error}</p>}
      <p className="text-center text-xs text-muted mt-6">
        Payments in BTC, ETH, USDT via NOWPayments · Crypto can&apos;t auto-charge — you get a fresh invoice link each period
      </p>
    </div>
  );
}
