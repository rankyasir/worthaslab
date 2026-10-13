// Live Courtyard.io search fallback.
//
// The DB catalog is the fast primary search, but it only knows cards the
// nightly ingestion (or a previous live search) has already seen. When the
// user searches for something missing, this module scans Courtyard's LIVE
// OpenSea listings, fetches traits for unknown tokens, matches them against
// the query, and returns the hits so the caller can upsert them into the DB.
// Every live search therefore grows the catalog — the next search for the
// same card is instant.
//
// Cost control: trait fetches are capped per search (OpenSea rate limits),
// and results are only fetched on explicit user action ("Search live"),
// never on as-you-type keystrokes.

import { fetchCourtyardListings } from "./courtyard";
import { getKnownOpenseaIds } from "./index";
import type { IngestedListing } from "./types";

export interface LiveSearchResult {
  skipped: boolean;
  skipReason?: string;
  /** matched listings (unknown tokens, traits fetched this call) */
  matched: IngestedListing[];
  /** how many live listing tokens were scanned */
  scanned: number;
}

function queryTokens(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
}

function matchesQuery(l: IngestedListing, tokens: string[]): boolean {
  const hay = `${l.name} ${l.setName} ${l.cardNumber ?? ""}`.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

export async function searchCourtyardLive(
  query: string,
  opts?: { maxTraitFetches?: number; pages?: number }
): Promise<LiveSearchResult> {
  if (!process.env.OPENSEA_API_KEY) {
    return { skipped: true, skipReason: "OPENSEA_API_KEY not set", matched: [], scanned: 0 };
  }
  const tokens = queryTokens(query);
  if (tokens.length === 0) {
    return { skipped: true, skipReason: "query too short", matched: [], scanned: 0 };
  }

  const known = await getKnownOpenseaIds();
  const result = await fetchCourtyardListings({
    limit: 200,
    maxPages: opts?.pages ?? 4,
    maxNewTokens: opts?.maxTraitFetches ?? 24,
    knownExternalIds: known,
  });
  if (result.skipped) {
    return { skipped: true, skipReason: result.skipReason, matched: [], scanned: 0 };
  }

  const matched = result.listings.filter((l) => matchesQuery(l, tokens));
  return { skipped: false, matched, scanned: result.priceUpdates.length };
}
