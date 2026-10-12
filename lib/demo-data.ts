// Demo catalog — clearly labeled DEMO data used when Supabase is not
// configured yet, and as the seed reference for supabase/schema.sql.
// Real price ingestion (eBay / PSA auction data) replaces this later.

export interface DemoCard {
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
}

export interface GradingTier {
  id: string;
  name: string;
  fee: number;
  max_declared_value: number;
  turnaround_days: string;
  active: boolean;
}

// Current PSA tiers (2026). Source: PSA published pricing; Value tiers paused.
export const GRADING_TIERS: GradingTier[] = [
  { id: "standard", name: "Standard", fee: 59.99, max_declared_value: 1000, turnaround_days: "90–100 business days", active: true },
  { id: "priority", name: "Priority", fee: 79.99, max_declared_value: 1500, turnaround_days: "70–80 business days", active: true },
  { id: "express", name: "Express", fee: 199.0, max_declared_value: 2500, turnaround_days: "20–30 business days", active: true },
  { id: "super-express", name: "Super Express", fee: 349.0, max_declared_value: 5000, turnaround_days: "10–15 business days", active: true },
  { id: "premier", name: "Premier", fee: 599.0, max_declared_value: 10000, turnaround_days: "7–10 business days", active: true },
  { id: "premium-1", name: "Premium 1", fee: 999.0, max_declared_value: 25000, turnaround_days: "5–7 business days", active: true },
];

// 12 sample cards. Prices are ILLUSTRATIVE samples for the demo —
// the UI always labels them DEMO. Replace with ingested medians later.
export const DEMO_CARDS: DemoCard[] = [
  { id: "d1", name: "Charizard", set_name: "Base Set", year: 1999, category: "pokemon", card_number: "4/102", slug: "charizard-base-set-4-102", raw_price: 380, psa9_price: 1400, psa10_price: 5200, sales_count: 48 },
  { id: "d2", name: "Pikachu", set_name: "Base Set", year: 1999, category: "pokemon", card_number: "58/102", slug: "pikachu-base-set-58-102", raw_price: 12, psa9_price: 45, psa10_price: 210, sales_count: 63 },
  { id: "d3", name: "Blastoise", set_name: "Base Set", year: 1999, category: "pokemon", card_number: "2/102", slug: "blastoise-base-set-2-102", raw_price: 95, psa9_price: 320, psa10_price: 1150, sales_count: 31 },
  { id: "d4", name: "Umbreon VMAX", set_name: "Evolving Skies", year: 2021, category: "pokemon", card_number: "215/203", slug: "umbreon-vmax-evolving-skies-215-203", raw_price: 420, psa9_price: 520, psa10_price: 980, sales_count: 74 },
  { id: "d5", name: "Moonbreon", set_name: "Evolving Skies", year: 2021, category: "pokemon", card_number: "215/203", slug: "moonbreon-alt-art-evolving-skies", raw_price: 700, psa9_price: 850, psa10_price: 1400, sales_count: 52 },
  { id: "d6", name: "Luka Doncic", set_name: "Prizm Silver", year: 2018, category: "sports", card_number: "280", slug: "luka-doncic-prizm-silver-280", raw_price: 210, psa9_price: 260, psa10_price: 640, sales_count: 41 },
  { id: "d7", name: "Mike Trout", set_name: "Topps Chrome Update", year: 2011, category: "sports", card_number: "US175", slug: "mike-trout-topps-chrome-update-us175", raw_price: 480, psa9_price: 700, psa10_price: 2100, sales_count: 29 },
  { id: "d8", name: "Victor Wembanyama", set_name: "Prizm Silver", year: 2023, category: "sports", card_number: "136", slug: "wembanyama-prizm-silver-136", raw_price: 85, psa9_price: 110, psa10_price: 290, sales_count: 88 },
  { id: "d9", name: "Black Lotus", set_name: "Limited Edition Alpha", year: 1993, category: "mtg", card_number: "232", slug: "black-lotus-alpha-232", raw_price: 18000, psa9_price: 42000, psa10_price: 95000, sales_count: 6 },
  { id: "d10", name: "Blue-Eyes White Dragon", set_name: "Legend of Blue Eyes", year: 2002, category: "yugioh", card_number: "LOB-001", slug: "blue-eyes-white-dragon-lob-001", raw_price: 65, psa9_price: 180, psa10_price: 720, sales_count: 37 },
  { id: "d11", name: "Shohei Ohtani", set_name: "Topps Chrome Rookie Auto", year: 2018, category: "sports", card_number: "RA-SO", slug: "shohei-ohtani-topps-chrome-auto-ra-so", raw_price: 950, psa9_price: 1600, psa10_price: 4800, sales_count: 22 },
  { id: "d12", name: "Gengar", set_name: "Fossil Holo", year: 1999, category: "pokemon", card_number: "5/62", slug: "gengar-fossil-holo-5-62", raw_price: 38, psa9_price: 120, psa10_price: 410, sales_count: 45 },
];

export const FREE_CALCULATIONS_PER_MONTH = 5;
