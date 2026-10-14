// Nightly ingestion orchestrator: runs every pluggable adapter, upserts cards,
// and accumulates one price_snapshots row per card per day.
//
// This daily accumulation IS the price history — OpenSea only ever shows
// current inventory, so snapshots are the only path to historical charts.
import { getSupabaseAdmin, isSupabaseConfigured } from "../supabase-server";
import { fetchCourtyardListings, listingSlug } from "./courtyard";
import { fetchEbaySoldListings } from "./ebay";
import type { AdapterResult, IngestedListing } from "./types";

export interface IngestSummary {
  ranAt: string;
  adapters: Array<{
    adapter: string;
    skipped: boolean;
    skipReason?: string;
    cardsUpserted: number;
    snapshotsWritten: number;
  }>;
}

async function upsertCard(l: IngestedListing): Promise<string> {
  const admin = getSupabaseAdmin();
  const slug = listingSlug(l);
  const { data: card, error } = await admin
    .from("cards")
    .upsert(
      {
        name: l.name,
        set_name: l.setName,
        year: l.year,
        category: l.category,
        card_number: l.cardNumber,
        image_url: l.imageUrl,
        slug,
        source: l.source,
        external_id: l.externalId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();
  if (error || !card) throw error ?? new Error("card upsert returned no row");
  return card.id as string;
}

/** Which price bucket a listing belongs in.
 *  Courtyard grade traits look like "10 PRISTINE" / "9 MINT" with a separate
 *  Grader trait, so by the time we see it the grade is "CGC 10" (grader
 *  FIRST). Extract the numeric grade instead of expecting it at the start. */
function gradeBucket(grade: string | null): "psa10" | "psa9" | "raw" {
  const m = (grade ?? "").toUpperCase().match(/(\d+(?:\.\d+)?)/);
  if (!m) return "raw";
  const num = parseFloat(m[1]);
  if (num === 10) return "psa10";
  if (num >= 9) return "psa9";
  return "raw";
}

async function writeSnapshot(
  cardId: string,
  askUsd: number | null,
  grade: string | null,
  source: string,
  capturedAt: string
) {
  const admin = getSupabaseAdmin();
  const snapshot: Record<string, unknown> = {
    card_id: cardId,
    sales_count: 0, // ask-side data: 0 solds; the eBay adapter fills real solds later
    source,
    captured_at: capturedAt,
  };
  if (askUsd != null) {
    const bucket = gradeBucket(grade);
    if (bucket === "psa10") snapshot.psa10_price = askUsd;
    else if (bucket === "psa9") snapshot.psa9_price = askUsd;
    else snapshot.raw_price = askUsd;
  }
  const { error } = await admin
    .from("price_snapshots")
    .upsert(snapshot, { onConflict: "card_id,captured_at" });
  if (error) throw error;
}

export async function getKnownOpenseaIds(): Promise<Set<string>> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("cards")
    .select("external_id")
    .eq("source", "opensea")
    .not("external_id", "is", null);
  if (error || !data) return new Set();
  return new Set(data.map((r: { external_id: string }) => r.external_id));
}

async function cardIdByExternalId(externalId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("cards")
    .select("id")
    .eq("external_id", externalId)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

export async function runNightlyIngest(): Promise<IngestSummary> {
  const summary: IngestSummary = { ranAt: new Date().toISOString(), adapters: [] };
  if (!isSupabaseConfigured()) {
    summary.adapters.push({
      adapter: "all",
      skipped: true,
      skipReason: "Supabase not configured — nothing to write to",
      cardsUpserted: 0,
      snapshotsWritten: 0,
    });
    return summary;
  }

  // ── Courtyard (OpenSea v2) ──────────────────────────────────────────
  try {
    const known = await getKnownOpenseaIds();
    const result = await fetchCourtyardListings({ knownExternalIds: known });
    const entry = {
      adapter: result.adapter,
      skipped: result.skipped,
      skipReason: result.skipReason,
      cardsUpserted: 0,
      snapshotsWritten: 0,
    };
    if (!result.skipped) {
      // New tokens: upsert card + snapshot
      for (const listing of result.listings) {
        try {
          const cardId = await upsertCard(listing);
          await writeSnapshot(cardId, listing.askPriceUsd, listing.grade, "opensea", listing.capturedAt);
          entry.cardsUpserted += 1;
          entry.snapshotsWritten += 1;
        } catch (e) {
          console.error(`ingest: failed on ${listing.externalId}`, e);
        }
      }
      // Known tokens: snapshot-only (ask price may have moved overnight)
      const today = new Date().toISOString().slice(0, 10);
      const newIds = new Set(result.listings.map((l) => l.externalId));
      for (const { externalId, askUsd } of result.priceUpdates) {
        if (newIds.has(externalId)) continue; // already snapshotted above
        try {
          const cardId = await cardIdByExternalId(externalId);
          if (cardId) {
            await writeSnapshot(cardId, askUsd, null, "opensea", today);
            entry.snapshotsWritten += 1;
          }
        } catch (e) {
          console.error(`ingest: snapshot failed for ${externalId}`, e);
        }
      }
    }
    summary.adapters.push(entry);
  } catch (e) {
    summary.adapters.push({
      adapter: "courtyard",
      skipped: true,
      skipReason: e instanceof Error ? e.message : "adapter threw",
      cardsUpserted: 0,
      snapshotsWritten: 0,
    });
  }

  // ── eBay (stub until API approval) ──────────────────────────────────
  try {
    const result = await fetchEbaySoldListings();
    summary.adapters.push({
      adapter: result.adapter,
      skipped: result.skipped,
      skipReason: result.skipReason,
      cardsUpserted: 0,
      snapshotsWritten: 0,
    });
  } catch (e) {
    summary.adapters.push({
      adapter: "ebay",
      skipped: true,
      skipReason: e instanceof Error ? e.message : "adapter threw",
      cardsUpserted: 0,
      snapshotsWritten: 0,
    });
  }

  return summary;
}

/**
 * Upsert cards discovered by live search (or any ad-hoc listing batch).
 * Returns the DB ids of the upserted cards so callers can re-query them.
 */
export async function upsertLiveListings(
  listings: IngestedListing[]
): Promise<{ upserted: number; ids: string[] }> {
  const ids: string[] = [];
  let upserted = 0;
  for (const l of listings) {
    try {
      const cardId = await upsertCard(l);
      await writeSnapshot(cardId, l.askPriceUsd, l.grade, l.source, l.capturedAt);
      ids.push(cardId);
      upserted += 1;
    } catch (e) {
      console.error(`upsertLiveListings: failed on ${l.externalId}`, e);
    }
  }
  return { upserted, ids };
}

/**
 * One-time accelerated backfill: pages deeper into Courtyard listings and
 * upserts up to ~100 new tokens in a single run. Trigger manually via
 * GET /api/cron/ingest?secret=...&mode=backfill (safe to re-run — upserts
 * dedupe by slug, snapshots dedupe by (card_id, captured_at)).
 */
export async function runBackfillIngest(): Promise<IngestSummary> {
  const summary: IngestSummary = { ranAt: new Date().toISOString(), adapters: [] };
  if (!isSupabaseConfigured()) {
    summary.adapters.push({
      adapter: "backfill",
      skipped: true,
      skipReason: "Supabase not configured — nothing to write to",
      cardsUpserted: 0,
      snapshotsWritten: 0,
    });
    return summary;
  }
  try {
    const known = await getKnownOpenseaIds();
    const result = await fetchCourtyardListings({
      limit: 200,
      maxPages: 10,
      maxNewTokens: 100,
      knownExternalIds: known,
    });
    const entry = {
      adapter: "courtyard-backfill",
      skipped: result.skipped,
      skipReason: result.skipReason,
      cardsUpserted: 0,
      snapshotsWritten: 0,
    };
    if (!result.skipped) {
      const { upserted } = await upsertLiveListings(result.listings);
      entry.cardsUpserted = upserted;
      entry.snapshotsWritten = upserted;
    }
    summary.adapters.push(entry);
  } catch (e) {
    summary.adapters.push({
      adapter: "courtyard-backfill",
      skipped: true,
      skipReason: e instanceof Error ? e.message : "adapter threw",
      cardsUpserted: 0,
      snapshotsWritten: 0,
    });
  }
  return summary;
}
