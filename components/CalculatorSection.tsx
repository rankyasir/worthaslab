"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { computeVerdict, VERDICT_STYLES } from "@/lib/verdict";
import { GRADING_TIERS, FREE_CALCULATIONS_PER_MONTH } from "@/lib/demo-data";
import type { CardPrice } from "@/lib/data";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase-client";

const GUEST_KEY = "was_guest_calcs";

function guestUsage(): { count: number; month: string } {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    const month = new Date().toISOString().slice(0, 7);
    if (!raw) return { count: 0, month };
    const parsed = JSON.parse(raw);
    if (parsed.month !== month) return { count: 0, month };
    return parsed;
  } catch {
    return { count: 0, month: new Date().toISOString().slice(0, 7) };
  }
}

function bumpGuestUsage() {
  const u = guestUsage();
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify({ count: u.count + 1, month: u.month }));
  } catch {}
  return u.count + 1;
}

function fmt(n: number): string {
  const sign = n < 0 ? "−$" : "+$";
  return `${sign}${Math.abs(Math.round(n)).toLocaleString()}`;
}

export default function CalculatorSection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardPrice[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CardPrice | null>(null);
  const [tierId, setTierId] = useState("standard");
  const [extras, setExtras] = useState(25);
  const [signedIn, setSignedIn] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const tier = GRADING_TIERS.find((t) => t.id === tierId) ?? GRADING_TIERS[0];
  const allInCost = tier.fee + (Number.isFinite(extras) ? extras : 0);

  const verdict = useMemo(() => {
    if (!selected) return null;
    return computeVerdict({
      raw: selected.raw_price,
      psa9: selected.psa9_price,
      psa10: selected.psa10_price,
      allInCost,
      salesCount: selected.sales_count,
    });
  }, [selected, allInCost]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    // Don't re-search when the query is just the selected card's label
    // (selectCard sets it) — avoids the stray "No cards found" dropdown
    // appearing behind the verdict.
    if (selected && query === `${selected.name} — ${selected.set_name}`) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cards?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.cards ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, selected]);

  async function selectCard(card: CardPrice) {
    setSelected(card);
    setQuery(`${card.name} — ${card.set_name}`);
    setOpen(false);
    setLimitHit(false);

    // Record the calculation (server enforces the free-tier limit for signed-in users)
    if (signedIn) {
      try {
        const v = computeVerdict({
          raw: card.raw_price,
          psa9: card.psa9_price,
          psa10: card.psa10_price,
          allInCost: tier.fee + extras,
          salesCount: card.sales_count,
        });
        const res = await fetch("/api/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: card.id,
            tierId: tier.id,
            rawPrice: card.raw_price,
            psa10Price: card.psa10_price,
            allInCost: tier.fee + extras,
            upside: v.upside10,
            verdict: v.verdict,
          }),
        });
        const data = await res.json();
        if (res.status === 402) {
          setLimitHit(true);
          setRemaining(0);
        } else {
          setRemaining(data.remaining ?? null);
          setIsPro(!!data.isPro);
        }
      } catch {
        /* logging never blocks the calculator */
      }
    } else {
      const count = bumpGuestUsage();
      if (count > FREE_CALCULATIONS_PER_MONTH) setLimitHit(true);
      setRemaining(Math.max(0, FREE_CALCULATIONS_PER_MONTH - count));
    }

    document.getElementById("verdict")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const style = verdict ? VERDICT_STYLES[verdict.verdict] : null;

  return (
    <section id="calculator" className="relative z-10 max-w-5xl mx-auto px-5 pt-10 pb-20">
      {/* Search-engine style search */}
      <div ref={boxRef} className="relative max-w-2xl mx-auto">
        <div className="flex items-center gap-3 bg-surface border border-line rounded-2xl px-5 py-4 focus-within:border-accent transition-colors shadow-[0_0_40px_rgba(0,255,136,0.06)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <circle cx="11" cy="11" r="7" stroke="#00ff88" strokeWidth="2" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search any card — Charizard, Pikachu, Luka Doncic…"
            className="bg-transparent outline-none w-full text-lg placeholder:text-[#5a5a6e]"
            aria-label="Search trading cards"
          />
        </div>
        {open && results.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-surface border border-line rounded-xl overflow-hidden shadow-2xl z-30">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCard(c)}
                className="w-full text-left px-5 py-3.5 hover:bg-white/5 transition-colors flex items-center justify-between gap-3 border-b border-line/50 last:border-0"
              >
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-muted">
                    {c.set_name} · {c.year} · #{c.card_number}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-accent">${c.psa10_price.toLocaleString()}</span>
                  {c.demo && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-400/40 text-yellow-300">
                      DEMO
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        {open && query.trim().length >= 2 && results.length === 0 && (
          <div className="absolute top-full mt-2 w-full bg-surface border border-line rounded-xl px-5 py-4 text-sm text-muted z-30">
            No cards found. Try &quot;Charizard&quot;, &quot;Pikachu&quot; or &quot;Doncic&quot;.
          </div>
        )}
      </div>

      {/* Calculator panel — verdict is gated once the free limit is hit */}
      {selected && verdict && style && !limitHit && (
        <div id="verdict" className="mt-10 bg-surface border border-line rounded-2xl p-6 md:p-10 card-glow">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-extrabold tracking-tight">{selected.name}</h3>
                {selected.demo && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-400/40 text-yellow-300">
                    DEMO DATA
                  </span>
                )}
              </div>
              <p className="text-muted text-sm mt-1">
                {selected.set_name} · {selected.year} · #{selected.card_number} · {selected.sales_count} recent sales
              </p>
            </div>
            <span className={`text-lg font-extrabold px-5 py-2.5 rounded-xl border ${style.badge}`}>
              {verdict.label}
            </span>
          </div>

          {/* Live profit/loss */}
          <div className="text-center py-6 border-y border-line/70">
            <div className="text-xs uppercase tracking-widest text-muted mb-2">Profit if PSA 10</div>
            <div className={`font-mono text-5xl md:text-6xl font-extrabold ${verdict.upside10 >= 0 ? "text-accent" : "text-red-400"}`}>
              {fmt(verdict.upside10)}
            </div>
            <div className="text-sm text-muted mt-2 font-mono">
              {verdict.premiumX.toFixed(1)}x slab multiplier · break-even sale ${Math.round(verdict.breakeven).toLocaleString()}
            </div>
          </div>

          {/* Breakdown table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <tbody>
                {[
                  ["Raw price (recent sold avg)", `$${selected.raw_price.toLocaleString()}`],
                  ["PSA 9 recent sold avg", `$${selected.psa9_price.toLocaleString()}`],
                  ["PSA 10 recent sold avg", `$${selected.psa10_price.toLocaleString()}`],
                  [`Grading — ${tier.name} tier`, `$${tier.fee.toFixed(2)}`],
                  ["Shipping + supplies (est.)", `$${extras.toFixed(2)}`],
                  ["All-in grading cost", `$${allInCost.toFixed(2)}`],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-line/50 last:border-0">
                    <td className="py-2.5 text-muted pr-4">{k}</td>
                    <td className="py-2.5 text-right text-white">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-5 text-sm text-muted leading-relaxed border-l-2 border-accent pl-4">{verdict.detail}</p>

          {/* Controls */}
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted">Grading tier</span>
              <select value={tierId} onChange={(e) => setTierId(e.target.value)} className="field mt-2">
                {GRADING_TIERS.map((t) => (
                  <option key={t.id} value={t.id} className="bg-surface">
                    {t.name} — ${t.fee.toFixed(2)} · {t.turnaround_days}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted">Shipping + supplies (USD)</span>
              <input
                type="number"
                min={0}
                value={extras}
                onChange={(e) => setExtras(Math.max(0, Number(e.target.value) || 0))}
                className="field mt-2 font-mono"
              />
            </label>
          </div>

          {remaining !== null && (
            <p className="mt-6 text-center text-xs text-muted">
              {isPro ? (
                <span className="text-accent font-bold">PRO — unlimited calculations</span>
              ) : signedIn ? (
                <>{remaining} of {FREE_CALCULATIONS_PER_MONTH} free calculations left this month</>
              ) : (
                <>{remaining} of {FREE_CALCULATIONS_PER_MONTH} free calculations left — <Link href="/signup" className="text-accent underline">sign up free</Link> to save your history</>
              )}
            </p>
          )}
        </div>
      )}
      {/* Hard gate: once the free limit is hit, the verdict is hidden until
          the user signs up (guests) or upgrades to Pro (free accounts). */}
      {selected && limitHit && (
        <div id="verdict" className="mt-10 bg-surface border border-accent/40 rounded-2xl p-6 md:p-10 text-center card-glow">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-2xl font-extrabold tracking-tight mb-2">
            You&apos;ve used your {FREE_CALCULATIONS_PER_MONTH} free calculations this month
          </h3>
          <p className="text-muted text-sm mb-6 max-w-md mx-auto">
            {signedIn
              ? "Go unlimited — every card, every tier, every day."
              : "Create a free account to get 5 more calculations every month — plus your calculation history."}
          </p>
          {signedIn ? (
            <Link href="/pricing" className="btn-accent inline-block">Upgrade to Pro — $9.99/mo</Link>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="btn-accent inline-block">Create free account</Link>
              <Link href="/pricing" className="text-sm text-muted hover:text-accent transition-colors underline">
                or go Pro for unlimited
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
