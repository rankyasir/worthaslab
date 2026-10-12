# Price Ingestion — how WorthASlab gets card data ($0 architecture)

## Sources

| Source | What it provides | Status |
|---|---|---|
| **OpenSea API v2** (Courtyard listings) | Current ask prices + images + traits (grade, set) for Courtyard's vaulted cards (Polygon NFTs) | Live — needs `OPENSEA_API_KEY` |
| **eBay sold listings** | Actual SOLD prices (raw / PSA 9 / PSA 10) — the ground truth for verdicts | Stub — needs eBay API approval |

## Key facts

1. **Courtyard.io has no public API.** Their vaulted cards are tokenized as NFTs on
   Polygon, and those live listings are reachable via the OpenSea API v2.
   **Resolved identifiers** (verified against the public MIT reference
   `github.com/Evan-Kim2028/pokemon_tcg_marketplace_aggregator`,
   `src/marketplace_aggregator/sources/courtyard.py`):
   - Collection slug: **`courtyard-nft`** — do NOT use `courtyard` (that slug
     returns an unrelated "Japanese Natural Landscape" collection)
   - Contract (Polygon): **`0x251be3a17af4892035c37ebf5890f4a4d889dcad`**
   - Listings: `GET /api/v2/listings/collection/courtyard-nft/all` (price is
     already USD; `price.current.value` / 10^`decimals`)
   - Traits per token: `GET /api/v2/chain/matic/contract/{contract}/nfts/{token_id}`
     — traits used: `Card Name`, `Set`, `Card Number`, `Grade` (e.g. "10 PRISTINE",
     first token = numeric grade), `Grader`, `Serial`, `Insured Value`, `Category`.
   - Traits are NOT inline in listings → one NFT fetch per token. Our adapter
     skips tokens already in the DB (traits never change) and caps new-token
     fetches per run (default 60) to respect rate limits.
2. **OpenSea shows CURRENT inventory only — no sold history.** The nightly
   snapshot job is therefore the ONLY path to price history: every run writes
   one `price_snapshots` row per card per day. Charts get better the longer the
   job runs. Day 1 = 1 data point; day 90 = a real trend line.
3. **eBay remains the sold-price source.** Wire `lib/ingestion/ebay.ts` after
   eBay developer approval (Browse API + Marketplace Insights API), then sold
   medians replace ask prices in verdict math.

## Env vars (placeholders only — never commit real keys)

```
OPENSEA_API_KEY=            # free key from the OpenSea developer portal
COURTYARD_CONTRACT_ADDRESS= # default 0x251be3a17af4892035c37ebf5890f4a4d889dcad (override only if Courtyard migrates)
COURTYARD_COLLECTION_SLUG=  # default "courtyard-nft" (NOT "courtyard")
EBAY_API_KEY=               # stub for now — fill after eBay approval
CRON_SECRET=                # random string; Vercel Cron sends it as Bearer token
```

## Nightly job

- Route: `GET /api/cron/ingest` (runs each adapter → upserts `cards` by slug →
  inserts one `price_snapshots` row per card per day).
- Protected by `CRON_SECRET` (`?secret=` query param or `Authorization: Bearer`).
- Schedule ($0): free account at **cron-job.org** → daily GET at 02:00 UTC to
  `https://<your-domain>/api/cron/ingest?secret=<CRON_SECRET>`.
  (Vercel's built-in cron can't inject the secret into the scheduled URL, so an
  external free scheduler is the reliable $0 path.)
- Manual trigger: `curl "https://<domain>/api/cron/ingest?secret=<CRON_SECRET>"`

## "Everything automate" checklist

- [x] Nightly refresh (cron route + vercel.json)
- [x] Snapshot history accumulation (one row/card/day)
- [x] Courtyard adapter (OpenSea v2)
- [ ] eBay sold adapter (pending API approval — TODO in `lib/ingestion/ebay.ts`)
- [ ] Blog drip: 10 pillar posts ship now; 40 backlog titles in `content/backlog.md`
      publish 2/week manually or via a scheduled content job later
