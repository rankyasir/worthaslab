import { NextResponse } from "next/server";
import { searchCards } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase-server";
import { searchCourtyardLive } from "@/lib/ingestion/live-search";
import { upsertLiveListings } from "@/lib/ingestion";

// GET /api/cards?q=charizard — search the card catalog.
// DB is the fast primary search. Add &live=1 to also scan Courtyard's LIVE
// OpenSea listings when the DB comes up short: matches are upserted into
// the catalog, so the next search for the same card is instant.
export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const wantLive = searchParams.get("live") === "1";

  let cards = await searchCards(q);
  let live: { scanned: number; found: number; skipped: boolean; skipReason?: string } | null = null;
  let liveNewIds: string[] = [];

  if (wantLive && q.trim().length >= 2 && isSupabaseConfigured()) {
    try {
      const res = await searchCourtyardLive(q.trim());
      live = { scanned: res.scanned, found: res.matched.length, skipped: res.skipped, skipReason: res.skipReason };
      if (!res.skipped && res.matched.length > 0) {
        const { ids } = await upsertLiveListings(res.matched);
        liveNewIds = ids;
        cards = await searchCards(q); // re-query: unified catalog, live finds included
      }
    } catch (e) {
      live = { scanned: 0, found: 0, skipped: true, skipReason: e instanceof Error ? e.message : "live search failed" };
    }
  }

  return NextResponse.json({ cards, live, liveNewIds });
}
