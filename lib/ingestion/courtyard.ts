// Courtyard.io adapter via the OpenSea API v2.
//
// Courtyard tokenizes vaulted physical cards as NFTs on Polygon and exposes
// NO direct public API. Their live listings ARE reachable through OpenSea v2.
//
// RESOLVED IDENTIFIERS (verified against the public MIT reference
// github.com/Evan-Kim2028/pokemon_tcg_marketplace_aggregator,
// src/marketplace_aggregator/sources/courtyard.py):
//   - Collection slug:  "courtyard-nft"   (NOT "courtyard" — that slug returns
//     an unrelated "Japanese Natural Landscape" collection)
//   - Contract (Polygon): 0x251be3a17af4892035c37ebf5890f4a4d889dcad
//   - Listings endpoint:  /api/v2/listings/collection/courtyard-nft/all
//   - NFT traits endpoint: /api/v2/chain/matic/contract/{CONTRACT}/nfts/{token_id}
//
// KEY CONSTRAINT: OpenSea returns CURRENT inventory state only — there is NO
// historical sold data. History is built by OUR nightly snapshots accumulating
// rows in price_snapshots (see app/api/cron/ingest/route.ts).
//
// Courtyard NFT traits (from the reference implementation):
//   "Card Name", "Set", "Card Number", "Grade" (e.g. "10 PRISTINE" — first
//   token is the numeric grade), "Grader", "Serial", "Insured Value", "Category".
// Traits are NOT inline in the listings response — each token needs one NFT
// fetch. To stay within rate limits, tokens already in our DB (matched by
// external_id) skip the trait fetch; only new tokens are fetched (capped/run).
//
// Env needed (placeholders only — never commit real keys):
//   OPENSEA_API_KEY   free key from the OpenSea developer portal

import type { AdapterResult, IngestedListing } from "./types";

const OPENSEA_BASE = "https://api.opensea.io/api/v2";
const DEFAULT_CONTRACT = "0x251be3a17af4892035c37ebf5890f4a4d889dcad";
const DEFAULT_SLUG = "courtyard-nft";

interface ListingItem {
  price?: { current?: { value?: string; decimals?: number } };
  protocol_data?: { parameters?: { offer?: Array<{ identifierOrCriteria?: string }> } };
}

interface NftResponse {
  nft?: {
    name?: string | null;
    image_url?: string | null;
    display_image_url?: string | null;
    opensea_url?: string | null;
    traits?: Array<{ trait_type: string; value: string | number }> | null;
  };
}

function traitOf(
  traits: Array<{ trait_type: string; value: string | number }> | null | undefined,
  name: string
): string | null {
  const hit = (traits ?? []).find(
    (t) => t.trait_type.toLowerCase() === name.toLowerCase()
  );
  return hit ? String(hit.value) : null;
}

function guessCategory(name: string, setName: string, categoryTrait: string | null): string {
  const fromTrait = (categoryTrait ?? "").toLowerCase();
  if (fromTrait.includes("pok")) return "pokemon";
  if (fromTrait.includes("sport") || fromTrait.includes("nba") || fromTrait.includes("nfl"))
    return "sports";
  const hay = `${name} ${setName}`.toLowerCase();
  if (/(charizard|pikachu|pokemon|pokémon)/.test(hay)) return "pokemon";
  if (/(topps|panini|prizm|bowman|upper deck)/.test(hay)) return "sports";
  if (/(blue-eyes|yu-gi-oh|yugioh)/.test(hay)) return "yugioh";
  if (/(black lotus|\bmtg\b|magic)/.test(hay)) return "mtg";
  return "other";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  attempts = 3
): Promise<Response> {
  let res = await fetch(url, { headers });
  for (let i = 0; i < attempts && res.status === 429; i++) {
    await sleep(2000 * 2 ** i);
    res = await fetch(url, { headers });
  }
  return res;
}

export interface CourtyardFetch {
  /** New tokens (traits fetched) — need card upsert + snapshot */
  listings: IngestedListing[];
  /** ALL tokens seen this run (externalId + current ask) — snapshot-only for known tokens */
  priceUpdates: Array<{ externalId: string; askUsd: number }>;
}

export async function fetchCourtyardListings(opts?: {
  limit?: number;
  /** external_ids already in DB — their traits are stable, skip re-fetch */
  knownExternalIds?: Set<string>;
  /** cap on new-token trait fetches per run (rate-limit safety) */
  maxNewTokens?: number;
  /** cap on listing pages per run (each page = up to `limit` tokens) */
  maxPages?: number;
}): Promise<AdapterResult & CourtyardFetch> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return {
      adapter: "courtyard",
      skipped: true,
      skipReason: "OPENSEA_API_KEY not set",
      listings: [],
      priceUpdates: [],
    };
  }

  const contract = process.env.COURTYARD_CONTRACT_ADDRESS || DEFAULT_CONTRACT;
  const slug = process.env.COURTYARD_COLLECTION_SLUG || DEFAULT_SLUG;
  const headers = { Accept: "application/json", "X-API-KEY": apiKey };
  const pageLimit = Math.min(opts?.limit ?? 100, 200);
  const maxNewTokens = opts?.maxNewTokens ?? 60;
  const maxPages = opts?.maxPages ?? 5;
  const known = opts?.knownExternalIds ?? new Set<string>();
  const now = new Date().toISOString().slice(0, 10);

  // 1) Page through live listings. Price here is already USD (Courtyard lists in USD).
  const rawListings: Array<{ tokenId: string; askUsd: number }> = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const url =
      `${OPENSEA_BASE}/listings/collection/${slug}/all?limit=${pageLimit}` +
      (cursor ? `&next=${encodeURIComponent(cursor)}` : "");
    const res = await fetchWithRetry(url, headers);
    if (!res.ok) {
      throw new Error(`OpenSea listings request failed: ${res.status}`);
    }
    const body = (await res.json()) as { listings?: ListingItem[]; next?: string | null };
    for (const item of body.listings ?? []) {
      const tokenId = String(
        item.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria ?? ""
      );
      const val = item.price?.current?.value;
      if (!tokenId || val == null) continue;
      const decimals = item.price?.current?.decimals ?? 6;
      const askUsd = Number(val) / 10 ** decimals;
      if (Number.isFinite(askUsd)) rawListings.push({ tokenId, askUsd });
    }
    cursor = body.next ?? null;
    pages += 1;
    await sleep(250);
  } while (cursor && pages < maxPages);

  // 2) Fetch traits per token (new tokens only — traits never change).
  // Every token seen also goes into priceUpdates so known tokens still get
  // their nightly snapshot (ask prices move even when traits don't).
  const listings: IngestedListing[] = [];
  const priceUpdates: Array<{ externalId: string; askUsd: number }> = [];
  let fetched = 0;
  for (const { tokenId, askUsd } of rawListings) {
    const externalId = `opensea:matic:${tokenId}`;
    priceUpdates.push({ externalId, askUsd });
    if (known.has(externalId)) continue; // already in DB — price snapshot handled by caller
    if (fetched >= maxNewTokens) continue; // cap trait fetches, keep scanning for priceUpdates
    fetched += 1;

    const nftRes = await fetchWithRetry(
      `${OPENSEA_BASE}/chain/matic/contract/${contract}/nfts/${tokenId}`,
      headers
    );
    if (!nftRes.ok) continue;
    const nftJson = (await nftRes.json()) as NftResponse;
    const nft = nftJson.nft;
    const traits = nft?.traits ?? null;

    const gradeRaw = traitOf(traits, "Grade"); // e.g. "10 PRISTINE"
    const grade = gradeRaw ? gradeRaw.split(/\s+/)[0] : null;
    const grader = traitOf(traits, "Grader");
    const name = traitOf(traits, "Card Name") || nft?.name || `Courtyard #${tokenId}`;
    const setName = traitOf(traits, "Set") || "Courtyard Vault";

    listings.push({
      externalId,
      name,
      setName,
      year: null,
      category: guessCategory(name, setName, traitOf(traits, "Category")),
      cardNumber: traitOf(traits, "Card Number"),
      grade: grader && grade ? `${grader.toUpperCase()} ${grade}` : grade,
      askPriceUsd: askUsd,
      imageUrl: nft?.image_url || nft?.display_image_url || null,
      source: "opensea",
      capturedAt: now,
    });
    await sleep(150); // be polite to the API
  }

  return { adapter: "courtyard", skipped: false, listings, priceUpdates };
}

// Stable card slug for DB upserts.
export function listingSlug(l: IngestedListing): string {
  return slugify(`${l.name}-${l.setName}-${l.cardNumber ?? "vault"}`);
}
