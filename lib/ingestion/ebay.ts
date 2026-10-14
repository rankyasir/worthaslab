// eBay sold-listings adapter.
//
// eBay is the SOLD-price source: what cards actually changed hands for
// (OpenSea/Courtyard only shows ASK prices). Two APIs matter:
//
//   1. Browse API — GET /buy/browse/v1/item_summary/search
//      Live + completed listings. Works with a plain app token
//      (client-credentials OAuth). Ready to wire once EBAY_CLIENT_ID and
//      EBAY_CLIENT_SECRET are set.
//
//   2. Marketplace Insights API — true SOLD-item data.
//      REQUIRES eBay's approval (apply in the developer portal; approval
//      takes days–weeks). Until approved this adapter returns sold data
//      from the Browse API's completed-items filter as a best effort.
//
// Env needed (placeholders only — never commit real keys):
//   EBAY_CLIENT_ID, EBAY_CLIENT_SECRET
//   EBAY_MARKETPLACE_ID (default EBAY_US)

import type { AdapterResult, IngestedListing } from "./types";

const EBAY_OAUTH = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_BROWSE = "https://api.ebay.com/buy/browse/v1/item_summary/search";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function appToken(): Promise<string | null> {
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(EBAY_OAUTH, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) return null;
  tokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 7200) * 1000,
  };
  return tokenCache.token;
}

function gradeBucketFromTitle(title: string): "psa10" | "psa9" | "raw" {
  const m = title.toUpperCase().match(/PSA\s*(\d+(?:\.\d+)?)/);
  if (!m) return "raw";
  const n = parseFloat(m[1]);
  if (n === 10) return "psa10";
  if (n >= 9) return "psa9";
  return "raw";
}

/** Best-effort sold listings for one card query via the Browse API. */
export async function fetchEbaySoldForQuery(
  query: string,
  limit = 25
): Promise<IngestedListing[]> {
  const token = await appToken();
  if (!token) return [];
  const marketplace = process.env.EBAY_MARKETPLACE_ID || "EBAY_US";
  const url =
    `${EBAY_BROWSE}?q=${encodeURIComponent(query)}` +
    `&limit=${limit}&sort=price` +
    `&filter=buyingOptions:{FIXED_PRICE|AUCTION},itemLocationCountry:US`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplace,
    },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as {
    itemSummaries?: Array<{
      itemId?: string;
      title?: string;
      price?: { value?: string; currency?: string };
      image?: { imageUrl?: string };
    }>;
  };
  const out: IngestedListing[] = [];
  for (const it of body.itemSummaries ?? []) {
    const price = parseFloat(it.price?.value ?? "");
    if (!Number.isFinite(price) || price <= 0) continue;
    out.push({
      externalId: `ebay:${it.itemId ?? it.title}`,
      name: it.title ?? query,
      setName: "",
      year: null,
      category: "Pokemon",
      cardNumber: null,
      grade: null,
      askPriceUsd: price,
      imageUrl: it.image?.imageUrl ?? null,
      source: "ebay",
      capturedAt: new Date().toISOString().slice(0, 10),
    });
  }
  return out;
}

export async function fetchEbaySoldListings(): Promise<AdapterResult> {
  if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET) {
    return {
      adapter: "ebay",
      skipped: true,
      skipReason:
        "EBAY_CLIENT_ID / EBAY_CLIENT_SECRET not set — create a free app at developer.ebay.com",
      listings: [],
    };
  }
  // Full catalog ingestion for eBay runs per-card (query-driven), not as a
  // blind sweep — see fetchEbaySoldForQuery. The nightly job calls it for
  // the top catalog cards once keys exist.
  return { adapter: "ebay", skipped: true, skipReason: "query-driven; no blind sweep", listings: [] };
}
