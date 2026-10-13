"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase-client";
import { FREE_CALCULATIONS_PER_MONTH, DEMO_CARDS } from "@/lib/demo-data";

interface Calc {
  id: string;
  card_id: string;
  created_at: string;
  verdict: string;
  upside: number;
  all_in_cost: number;
}

interface CardName {
  id: string;
  name: string;
  set_name: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function demoName(cardId: string): string | null {
  const d = DEMO_CARDS.find((c) => c.id === cardId);
  return d ? `${d.name} · ${d.set_name}` : null;
}

export default function Account() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [plan, setPlan] = useState("free");
  const [status, setStatus] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [history, setHistory] = useState<Calc[]>([]);
  const [cardNames, setCardNames] = useState<Record<string, string>>({});
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    (async () => {
      if (!configured) {
        setLoading(false);
        return;
      }
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/signin?next=/account");
        return;
      }
      setEmail(data.user.email ?? null);
      setMemberSince(data.user.created_at ? new Date(data.user.created_at).toLocaleDateString() : null);

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (sub) {
        setPlan(sub.plan);
        setStatus(sub.status);
        setPeriodEnd(sub.current_period_end);
      }

      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data: calcs } = await supabase
        .from("calculations")
        .select("id, card_id, created_at, verdict, upside, all_in_cost")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(25);
      const rows = (calcs ?? []) as Calc[];
      setHistory(rows);

      // Resolve card names: DB cards by uuid, demo cards locally.
      const uuids = Array.from(new Set(rows.map((r) => r.card_id).filter((id) => UUID_RE.test(id))));
      const names: Record<string, string> = {};
      if (uuids.length > 0) {
        const { data: cards } = await supabase
          .from("cards")
          .select("id, name, set_name")
          .in("id", uuids);
        for (const c of (cards ?? []) as CardName[]) names[c.id] = `${c.name} · ${c.set_name}`;
      }
      for (const r of rows) {
        if (!names[r.card_id]) {
          const dn = demoName(r.card_id);
          if (dn) names[r.card_id] = dn;
        }
      }
      setCardNames(names);

      const { count } = await supabase
        .from("calculations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", data.user.id)
        .gte("created_at", start.toISOString());
      setUsed(count ?? 0);
      setLoading(false);
    })();
  }, [configured, router]);

  async function signOut() {
    const supabase = getSupabaseBrowser();
    await supabase?.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const stats = useMemo(() => {
    const total = history.length;
    const upsides = history.map((h) => Number(h.upside) || 0);
    const avg = total ? upsides.reduce((a, b) => a + b, 0) / total : 0;
    const worthIt = total ? history.filter((h) => /worth/i.test(h.verdict)).length : 0;
    return { total, avg, worthRate: total ? Math.round((worthIt / total) * 100) : 0 };
  }, [history]);

  if (loading) {
    return <div className="relative z-10 max-w-4xl mx-auto px-5 py-24 text-center text-muted">Loading your account…</div>;
  }

  if (!configured) {
    return (
      <div className="relative z-10 max-w-2xl mx-auto px-5 py-24 text-center">
        <div className="bg-surface border border-line rounded-2xl p-10">
          <h1 className="text-2xl font-extrabold mb-3">Account dashboard preview</h1>
          <p className="text-muted text-sm leading-relaxed">
            Plan status, calculation history and settings appear here once the database is connected
            (see DEPLOY.md). The layout below is exactly what signed-in users will see.
          </p>
          <div className="mt-6 text-left bg-ink border border-line rounded-xl p-5 font-mono text-xs text-muted">
            plan: free · status: active<br />
            calculations this month: 0 / {FREE_CALCULATIONS_PER_MONTH}<br />
            history: (empty)
          </div>
        </div>
      </div>
    );
  }

  const isPro = status === "active" && plan !== "free";
  const usagePct = Math.min(100, Math.round((used / FREE_CALCULATIONS_PER_MONTH) * 100));
  const initial = (email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-5 py-14 md:py-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/40 flex items-center justify-center text-2xl font-extrabold text-accent">
            {initial}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Your account</h1>
            <p className="text-muted text-sm">{email}{memberSince ? ` · member since ${memberSince}` : ""}</p>
          </div>
        </div>
        <button onClick={signOut} className="btn-ghost text-sm shrink-0">Sign out</button>
      </div>

      {/* Plan + usage */}
      <div className="bg-surface border border-line rounded-2xl p-6 md:p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-[220px]">
            <div className="text-xs uppercase tracking-widest text-muted mb-2">Current plan</div>
            <div className="text-3xl font-extrabold mb-3">
              {isPro ? (
                <span className="text-accent">PRO</span>
              ) : (
                <>Free</>
              )}
              {isPro && status && <span className="text-sm text-muted font-normal ml-2">({status})</span>}
            </div>
            {isPro ? (
              <>
                <p className="text-accent text-sm font-bold mb-1">Unlimited calculations</p>
                {periodEnd && (
                  <p className="text-sm text-muted">
                    Renews {new Date(periodEnd).toLocaleDateString()} — a fresh invoice link is emailed before renewal (crypto can&apos;t auto-charge).
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted">Calculations this month</span>
                  <span className="font-mono font-bold">{used} / {FREE_CALCULATIONS_PER_MONTH}</span>
                </div>
                <div className="h-2.5 rounded-full bg-ink border border-line overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${usagePct >= 100 ? "bg-red-400" : "bg-accent"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <p className="text-xs text-muted">
                  {used >= FREE_CALCULATIONS_PER_MONTH
                    ? "Limit reached — upgrade for unlimited."
                    : `${FREE_CALCULATIONS_PER_MONTH - used} free left. Resets on the 1st.`}
                </p>
              </>
            )}
          </div>
          {!isPro && (
            <Link href="/pricing" className="btn-accent shrink-0">Upgrade to Pro</Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-line rounded-2xl p-5 text-center">
          <div className="text-3xl font-extrabold font-mono">{stats.total}</div>
          <div className="text-xs text-muted mt-1 uppercase tracking-widest">Calculations</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-5 text-center">
          <div className={`text-3xl font-extrabold font-mono ${stats.avg >= 0 ? "text-accent" : "text-red-400"}`}>
            {stats.avg >= 0 ? "+" : "−"}${Math.abs(Math.round(stats.avg)).toLocaleString()}
          </div>
          <div className="text-xs text-muted mt-1 uppercase tracking-widest">Avg upside</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-5 text-center">
          <div className="text-3xl font-extrabold font-mono">{stats.worthRate}%</div>
          <div className="text-xs text-muted mt-1 uppercase tracking-widest">Worth grading</div>
        </div>
      </div>

      {/* Pro upsell (free users only) */}
      {!isPro && (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6 md:p-8 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold mb-2">Go Pro — <span className="text-accent">$9.99/mo</span></h2>
              <ul className="text-sm text-muted space-y-1.5">
                <li>✓ Unlimited calculations, every card, every day</li>
                <li>✓ Full calculation history &amp; performance stats</li>
                <li>✓ Priority new-card requests</li>
                <li>✓ Cancel anytime · pay in BTC, ETH or USDT</li>
              </ul>
            </div>
            <Link href="/pricing" className="btn-accent shrink-0">See plans</Link>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-surface border border-line rounded-2xl p-6 md:p-8 mb-6">
        <h2 className="text-xl font-extrabold mb-4">Calculation history</h2>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🃏</div>
            <p className="text-muted text-sm mb-4">No calculations yet — your graded-or-not verdicts will live here.</p>
            <Link href="/#calculator" className="btn-accent inline-block !py-2 !px-4 text-sm">Run your first one</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-widest">
                  <th className="py-2 pr-4">Card</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Verdict</th>
                  <th className="py-2 pr-4 text-right">Upside</th>
                  <th className="py-2 text-right">All-in cost</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => (
                  <tr key={c.id} className="border-t border-line/50 hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-4 font-semibold">{cardNames[c.card_id] ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-muted whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{c.verdict.replace(/_/g, " ")}</td>
                    <td className={`py-2.5 pr-4 text-right font-mono ${Number(c.upside) >= 0 ? "text-accent" : "text-red-400"}`}>
                      ${Number(c.upside).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-mono">${Number(c.all_in_cost).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="bg-surface border border-line rounded-2xl p-6 md:p-8">
        <h2 className="text-xl font-extrabold mb-4">Settings</h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-muted">
            <div>Signed in as <span className="text-white font-semibold">{email}</span></div>
            <div className="text-xs mt-1">Pro billing is per-invoice (crypto) — no card on file, nothing to cancel silently.</div>
          </div>
          <button onClick={signOut} className="btn-ghost text-sm">Sign out</button>
        </div>
      </div>
    </div>
  );
}
