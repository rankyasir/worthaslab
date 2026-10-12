// eBay sold-listings adapter (STUB).
//
// eBay is the SOLD-price source: what cards actually changed hands for.
// Endpoints to wire once API access is approved:
//   1. Browse API  — GET /buy/browse/v1/item_summary/search  (live listings)
//   2. Marketplace Insights API — sold-item data (REQUIRES eBay approval;
//      apply on day 1, approval takes days–weeks).
//
// Env needed: EBAY_API_KEY (placeholder only — never commit real keys).
//
// TODO: implement fetchEbaySoldListings() after eBay developer approval:
//   - OAuth client-credentials flow for the app token
//   - search "pokemon <card> psa 10" with filter=soldItemsOnly (Insights API)
//   - compute MEDIAN (not mean) of last-90-day solds per card/grade
//   - return IngestedListing[] with source: 'ebay'

import type { AdapterResult } from "./types";

export async function fetchEbaySoldListings(): Promise<AdapterResult> {
  return {
    adapter: "ebay",
    skipped: true,
    skipReason:
      "STUB — eBay Marketplace Insights API approval pending. See TODO in lib/ingestion/ebay.ts.",
    listings: [],
  };
}
