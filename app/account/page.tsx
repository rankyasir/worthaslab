"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase-client";
import { FREE_CALCULATIONS_PER_MONTH } from "@/lib/demo-data";

interface Calc {
  id: string;
  created_at: string;
  verdict: string;
  upside: number;
  all_in_cost: number;
}

export default function Account() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState("free");
  const [status, setStatus] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [history, setHistory] = useState<Calc[]>([]);
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
        .select("id, created_at, verdict, upside, all_in_cost")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(25);
      setHistory((calcs ?? []) as Calc[]);
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

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-5 py-14 md:py-20">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Your account</h1>
      <p className="text-muted text-sm mb-10">{email}</p>

      {/* Plan status */}
      <div className="bg-surface border border-line rounded-2xl p-6 md:p-8 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted mb-1">Current plan</div>
            <div className="text-2xl font-extrabold">
              {isPro ? <span className="text-accent">Pro</span> : "Free"}
              {isPro && status && <span className="text-sm text-muted font-normal ml-2">({status})</span>}
            </div>
            {isPro && periodEnd && (
              <p className="text-sm text-muted mt-1">
                Renews {new Date(periodEnd).toLocaleDateString()} — invoice link sent by email before renewal.
              </p>
            )}
            {!isPro && (
              <p className="text-sm text-muted mt-1">
                {used} of {FREE_CALCULATIONS_PER_MONTH} free calculations used this month.
              </p>
            )}
          </div>
          {!isPro && (
            <Link href="/pricing" className="btn-accent">Upgrade to Pro</Link>
          )}
        </div>
      </div>

      {/* History */}
      <div className="bg-surface border border-line rounded-2xl p-6 md:p-8 mb-6">
        <h2 className="text-xl font-extrabold mb-4">Calculation history</h2>
        {history.length === 0 ? (
          <p className="text-muted text-sm">
            No calculations yet. <Link href="/#calculator" className="text-accent underline">Run your first one</Link>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-widest">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Verdict</th>
                  <th className="py-2 pr-4 text-right">Upside</th>
                  <th className="py-2 text-right">All-in cost</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => (
                  <tr key={c.id} className="border-t border-line/50">
                    <td className="py-2.5 pr-4 text-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-4">{c.verdict.replace(/_/g, " ")}</td>
                    <td className={`py-2.5 pr-4 text-right ${Number(c.upside) >= 0 ? "text-accent" : "text-red-400"}`}>
                      ${Number(c.upside).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right">${Number(c.all_in_cost).toLocaleString()}</td>
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
        <button onClick={signOut} className="btn-ghost text-sm">Sign out</button>
      </div>
    </div>
  );
}
