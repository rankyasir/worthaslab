// Homepage data — real catalog numbers for the hero stats and the
// "Top opportunities" rankings table (PullValue-style live-data sections).
// Falls back to the local DEMO catalog when Supabase isn't configured,
// so the homepage is rich even before the database is wired.

import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase-server";
import { DEMO_CARDS } from "./demo-data";

export interface TopOpportunity {
  id: string;
  name: string;
  setName: string;
  year: number | null;
  cardNumber: string | null;
  category: string;
  raw: number;
  psa9: number;
  psa10: number;
  multiplier: number;
  sales: number;
  demo: boolean;
}

export interface HomepageData {
  liveData: boolean;
  cardsTracked: number;
  snapshots: number;
  avgMultiplier: number | null;
  lastUpdated: string | null;
  top: TopOpportunity[];
}

interface RawCard {
  id: string;
  name: string;
  set_name: string;
  year: number | null;
  card_number: string | null;
  category: string;
  source: string;
}

interface RawSnap {
  card_id: string;
  raw_price: number | null;
  psa9_price: number | null;
  psa10_price: number | null;
  sales_count: number | null;
  captured_at: string;
}

function buildTop(
  cards: RawCard[],
  latestSnap: Map<string, RawSnap>
): TopOpportunity[] {
  const out: TopOpportunity[] = [];
  for (const c of cards) {
    const s = latestSnap.get(c.id);
    if (!s) continue;
    const raw = Number(s.raw_price ?? 0);
    const psa10 = Number(s.psa10_price ?? 0);
    if (raw <= 0 || psa10 <= 0) continue;
    out.push({
      id: c.id,
      name: c.name,
      setName: c.set_name,
      year: c.year,
      cardNumber: c.card_number,
      category: c.category,
      raw,
      psa9: Number(s.psa9_price ?? 0),
      psa10,
      multiplier: psa10 / raw,
      sales: Number(s.sales_count ?? 0),
      demo: c.source === "demo",
    });
  }
  out.sort((a, b) => b.multiplier - a.multiplier);
  return out.slice(0, 8);
}

function demoFallback(): HomepageData {
  const cards: RawCard[] = DEMO_CARDS.map((c) => ({
    id: c.id,
    name: c.name,
    set_name: c.set_name,
    year: c.year,
    card_number: c.card_number,
    category: c.category,
    source: "demo",
  }));
  const snaps = new Map<string, RawSnap>();
  for (const c of DEMO_CARDS) {
    snaps.set(c.id, {
      card_id: c.id,
      raw_price: c.raw_price,
      psa9_price: c.psa9_price,
      psa10_price: c.psa10_price,
      sales_count: c.sales_count,
      captured_at: new Date().toISOString(),
    });
  }
  const top = buildTop(cards, snaps);
  const avg = top.length
    ? top.reduce((a, t) => a + t.multiplier, 0) / top.length
    : null;
  return {
    liveData: false,
    cardsTracked: cards.length,
    snapshots: snaps.size,
    avgMultiplier: avg,
    lastUpdated: null,
    top,
  };
}

export async function getHomepageData(): Promise<HomepageData> {
  if (!isSupabaseConfigured()) return demoFallback();
  try {
    const admin = getSupabaseAdmin();
    const { data: cards } = await admin
      .from("cards")
      .select("id, name, set_name, year, card_number, category, source")
      .limit(2000);
    const { data: snaps } = await admin
      .from("price_snapshots")
      .select("card_id, raw_price, psa9_price, psa10_price, sales_count, captured_at")
      .order("captured_at", { ascending: false })
      .limit(5000);

    const cardRows = (cards ?? []) as RawCard[];
    if (cardRows.length === 0) return demoFallback();

    const latest = new Map<string, RawSnap>();
    let lastUpdated: string | null = null;
    for (const s of (snaps ?? []) as RawSnap[]) {
      if (!latest.has(s.card_id)) latest.set(s.card_id, s);
      if (!lastUpdated || s.captured_at > lastUpdated) lastUpdated = s.captured_at;
    }

    const liveData = cardRows.some((c) => c.source !== "demo");
    const top = buildTop(cardRows, latest);
    // If DB has cards but no usable snapshots yet, show demo top as filler.
    const finalTop = top.length > 0 ? top : demoFallback().top;
    const avg = finalTop.length
      ? finalTop.reduce((a, t) => a + t.multiplier, 0) / finalTop.length
      : null;

    return {
      liveData,
      cardsTracked: cardRows.length,
      snapshots: (snaps ?? []).length,
      avgMultiplier: avg,
      lastUpdated,
      top: finalTop,
    };
  } catch {
    return demoFallback();
  }
}

/** "3h ago" / "2d ago" style relative time for the hero stats. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
