// Data access layer. Uses Supabase when configured, otherwise falls back to
// the local DEMO catalog so the site (and `next build`) works with $0 setup.

import { DEMO_CARDS, GRADING_TIERS, type DemoCard, type GradingTier } from "./demo-data";
import { getSupabaseServer, isSupabaseConfigured } from "./supabase-server";

export interface CardPrice {
  id: string;
  name: string;
  set_name: string;
  year: number;
  category: string;
  card_number: string;
  slug: string;
  raw_price: number;
  psa9_price: number;
  psa10_price: number;
  sales_count: number;
  demo: boolean;
  image_url: string | null;
}

function demoToCardPrice(c: DemoCard): CardPrice {
  return { ...c, demo: true, image_url: null };
}

export async function searchCards(query: string): Promise<CardPrice[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServer();
      const select =
        "id, name, set_name, year, category, card_number, slug, source, image_url, price_snapshots(raw_price, psa9_price, psa10_price, sales_count)";
      const toCardPrice = (row: any): CardPrice => {
        const snap = Array.isArray(row.price_snapshots)
          ? row.price_snapshots[row.price_snapshots.length - 1]
          : row.price_snapshots;
        return {
          id: row.id,
          name: row.name,
          set_name: row.set_name,
          year: row.year,
          category: row.category,
          card_number: row.card_number,
          slug: row.slug,
          raw_price: Number(snap?.raw_price ?? 0),
          psa9_price: Number(snap?.psa9_price ?? 0),
          psa10_price: Number(snap?.psa10_price ?? 0),
          sales_count: Number(snap?.sales_count ?? 0),
          // Seed rows are honest DEMO samples — only ingested (non-demo)
          // cards count as live data.
          demo: row.source === "demo",
          image_url: row.image_url ?? null,
        } as CardPrice;
      };
      // Prefer LIVE (ingested) cards; fall back to the DEMO seed only when
      // the live catalog has no match. Once ingestion runs, seed rows
      // disappear from results automatically — no manual cleanup needed.
      const live = await supabase
        .from("cards")
        .select(select)
        .ilike("name", `%${q}%`)
        .neq("source", "demo")
        .limit(10);
      if (!live.error && live.data && live.data.length > 0) {
        return live.data.map(toCardPrice);
      }
      const seed = await supabase
        .from("cards")
        .select(select)
        .ilike("name", `%${q}%`)
        .eq("source", "demo")
        .limit(10);
      if (!seed.error && seed.data) {
        return seed.data.map(toCardPrice);
      }
    } catch {
      // fall through to demo data
    }
  }

  return DEMO_CARDS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.set_name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
  )
    .slice(0, 10)
    .map(demoToCardPrice);
}

export async function getGradingTiers(): Promise<GradingTier[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from("grading_tiers")
        .select("*")
        .eq("active", true)
        .order("fee", { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map((t: any) => ({
          id: t.id,
          name: t.name,
          fee: Number(t.fee),
          max_declared_value: Number(t.max_declared_value),
          turnaround_days: t.turnaround_days,
          active: t.active,
        }));
      }
    } catch {
      // fall through
    }
  }
  return GRADING_TIERS;
}

export async function getDemoCards(): Promise<CardPrice[]> {
  return DEMO_CARDS.map(demoToCardPrice);
}

// Free-tier usage: calculations this calendar month for a user.
// Returns { used, limit, isPro }.
export async function getUsage(userId: string | null): Promise<{
  used: number;
  limit: number;
  isPro: boolean;
}> {
  const limit = 5;
  if (!userId || !isSupabaseConfigured()) {
    return { used: 0, limit, isPro: false };
  }
  try {
    const supabase = getSupabaseServer();
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const [{ count }, sub] = await Promise.all([
      supabase
        .from("calculations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", start.toISOString()),
      supabase.from("subscriptions").select("status").eq("user_id", userId).maybeSingle(),
    ]);

    const isPro = sub.data?.status === "active";
    return { used: count ?? 0, limit, isPro };
  } catch {
    return { used: 0, limit, isPro: false };
  }
}

export async function logCalculation(input: {
  userId: string;
  cardId: string;
  tierId: string;
  rawPrice: number;
  psa10Price: number;
  allInCost: number;
  upside: number;
  verdict: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = getSupabaseServer();
    await supabase.from("calculations").insert({
      user_id: input.userId,
      card_id: input.cardId,
      tier_id: input.tierId,
      raw_price: input.rawPrice,
      psa10_price: input.psa10Price,
      all_in_cost: input.allInCost,
      upside: input.upside,
      verdict: input.verdict,
    });
  } catch {
    // Logging must never break the calculator.
  }
}
