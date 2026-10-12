// Shared types for price-ingestion adapters.

export interface IngestedListing {
  /** Stable external id, e.g. `opensea:<chain>:<order_hash>` */
  externalId: string;
  name: string;
  setName: string;
  year: number | null;
  category: string; // 'pokemon' | 'sports' | 'mtg' | 'yugioh' | 'other'
  cardNumber: string | null;
  /** e.g. "PSA 10", "CGC 9.5", or null when ungraded/raw */
  grade: string | null;
  /** Current ask price in USD (converted from native token amount) */
  askPriceUsd: number | null;
  imageUrl: string | null;
  source: string; // 'opensea' | 'ebay'
  capturedAt: string; // ISO date
}

export interface AdapterResult {
  adapter: string;
  skipped: boolean;
  skipReason?: string;
  listings: IngestedListing[];
}
