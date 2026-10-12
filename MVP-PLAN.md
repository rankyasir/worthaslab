# WorthASlab — MVP Plan

**Tagline:** "Is it worth a slab?"
**One-liner:** A collector types a card name → sees raw price vs PSA 9/PSA 10 price → gets a data-backed verdict: grade it or skip it.
**Monetization:** Freemium subscription, crypto payments.
**Target user:** Pokémon/TCG + sports card collectors who submit cards to PSA/CGC.

---

## 1. MVP Scope — Strict IN / OUT

### IN (v1 must-have)
1. Card search (name/set/year) with autocomplete
2. Price panel: raw price vs PSA 9 vs PSA 10 (recent sold data, dated)
3. Grading ROI calculator: tier selector → all-in cost → profit/loss math → verdict
4. Verdict engine (rule-based, transparent math shown)
5. Free tier: 5 calculations/month (account required)
6. Pro subscription: $9.99/mo or $99/yr, unlimited calculations
7. Crypto checkout (BTC, ETH, USDT) + customer portal (invoices, cancel)
8. SEO-friendly card detail pages (`/cards/<slug>`) — each page is a landing page
9. Basic analytics (signups, calculations, conversion)

### OUT (explicitly NOT in v1)
- AI photo pre-grading (Phase 2)
- Portfolio/collection tracking (Phase 2)
- Price alerts (Phase 2)
- Mobile app (web-first; PWA later if needed)
- CGC/BGS support (PSA only in v1 — 71% of grading volume is PSA-tracked TCG anyway)
- Bulk CSV upload (Phase 2)

**Rule:** If a feature doesn't serve the single question "is it worth a slab?", it waits.

---

## 2. Tech Stack

| Layer | Choice | Why | Cost |
|---|---|---|---|
| Framework | Next.js 14 (App Router) | One codebase: marketing pages + app + API routes; best SEO story | $0 (Vercel free tier) |
| Database + Auth | Supabase (Postgres) | Auth, Postgres, and cron in one; free tier covers MVP (500MB, 50k monthly active users) | $0 |
| Hosting | Vercel | Zero-config deploys, edge fast globally | $0 |
| Price ingestion | Vercel Cron (daily) + Node workers | Pull sold-listing data nightly; store snapshots | $0 |
| Crypto payments | NOWPayments (v1) → BTCPay Server (later) | NOWPayments: instant setup, ~0.5% fee, recurring invoices via email. BTCPay: 0% fee, self-custody, but needs a VPS + maintenance — migrate at $2k+ MRR | 0.5%/tx |
| Domain | Porkbun / Namecheap | worthaslab.com | ~$12/yr |
| Analytics | Plausible (or PostHog free) | Privacy-friendly, simple funnels | $0–$9/mo |

**Total running cost at launch: $0.** Domain tumhare paas already hai — uske ilawa har cheez ke free tier se kaam chal jayega (neeche breakdown).

---

## 3. Database Schema (Supabase Postgres)

```sql
-- Core card catalog (seeded, curated)
cards (
  id            uuid PK,
  name          text,            -- "Charizard"
  set_name      text,            -- "Base Set"
  year          int,
  category      text,            -- 'pokemon' | 'sports' | 'yugioh' | 'mtg' ...
  card_number   text,            -- "4/102"
  image_url     text,
  slug          text unique,     -- "charizard-base-set-4-102"
  created_at    timestamptz
)

-- Price history (one row per card per day)
price_snapshots (
  id            uuid PK,
  card_id       uuid FK,
  raw_price     numeric,         -- avg of recent eBay sold, ungraded
  psa9_price    numeric,
  psa10_price   numeric,
  sales_count   int,             -- how many sold listings the avg is based on
  source        text,            -- 'ebay' | 'psa_auction' | 'tcgplayer'
  captured_at   date
)

-- PSA tiers (admin-editable; PSA changes these)
grading_tiers (
  id            uuid PK,
  name          text,            -- 'Standard'
  fee           numeric,         -- 59.99
  max_declared_value numeric,    -- 1000
  turnaround_days text,          -- '90-100 business days'
  active        bool
)

-- App users (Supabase Auth) + subscription state
subscriptions (
  user_id       uuid PK FK (auth.users),
  plan          text,            -- 'free' | 'pro_monthly' | 'pro_yearly'
  status        text,            -- 'active' | 'past_due' | 'canceled'
  nowpayments_id text,
  current_period_end timestamptz
)

-- Every calculation (powers free-tier limits + analytics)
calculations (
  id            uuid PK,
  user_id       uuid FK,
  card_id       uuid FK,
  tier_id       uuid FK,
  raw_price     numeric,         -- snapshot at calc time
  psa10_price   numeric,
  all_in_cost   numeric,
  upside        numeric,
  verdict       text,            -- 'worth_it' | 'maybe' | 'not_worth_it'
  created_at    timestamptz
)
```

---

## 4. Verdict Engine (the core IP — keep it transparent)

```
inputs: raw, psa9, psa10, all_in_cost

upside_10  = psa10 - raw - all_in_cost
upside_9   = psa9  - raw - all_in_cost
breakeven  = raw + all_in_cost        # min PSA-10 sale needed
premium_x  = psa10 / raw              # the "slab multiplier"

VERDICT:
  if sales_count < 3               → "NOT ENOUGH DATA" (never guess)
  elif upside_10 >= 100 and premium_x >= 2.5  → "WORTH A SLAB" 🟢
  elif upside_10 > 0                 → "MAYBE — only if likely PSA 10" 🟡
  elif upside_9 > 0                  → "RISKY — needs a 9 minimum" 🟠
  else                               → "NOT WORTH IT" 🔴

ALWAYS SHOW THE MATH:
  "PSA 10 sells ~$720 · Raw ~$90 · All-in cost ~$85
   → Profit if PSA 10: +$545 · Break-even sale: $175
   → A PSA 9 ($155) would LOSE money."
```

**Why rule-based, not AI, in v1:** it's explainable (collectors trust math they can see), deterministic, and free to run. AI pre-grading comes in Phase 2 as an upsell.

---

## 5. Data Pipeline

**Sources (priority order):**
1. **eBay sold listings** — via eBay Browse API + Marketplace Insights API (sold data needs API approval; apply on day 1, approval takes days–weeks)
2. **PSA Auction Prices Realized** — public pages, periodic import for graded prices
3. **TCGplayer API** — for Pokémon/MTG/Yu-Gi-Oh raw prices

**Seeding strategy (Week 1):** Don't boil the ocean. Manually curate the **top 500 most-graded cards** (PSA pop report is public — sort by population). For each: pull last 90 days of eBay sold listings, compute raw/psa9/psa10 medians (median, not mean — kills outlier sales). This seed alone covers ~80% of real user queries.

**Nightly cron:** refresh prices for all tracked cards; store a new `price_snapshots` row daily → powers "trending" later.

**Honest caveat:** eBay API approval for sold-data access can be slow. Fallback for v1: seed from manually exported sold listings + PSA's public data, automate after approval. Never scrape eBay against ToS as the long-term plan.

---

## 6. Pages / UX Flow (v1)

1. `/` — Landing: hero ("Is it worth a slab?"), live search box, 3 example verdicts, pricing, FAQ (SEO content)
2. `/cards/<slug>` — Card page: price chart (raw vs PSA 9 vs 10), calculator widget, verdict, "last updated" date. **Every card page is an SEO landing page.**
3. `/pricing` — Free vs Pro, crypto badges
4. `/account` — plan status, invoices, cancel (NOWPayments customer portal link)
5. `/blog/*` — SEO articles: "Is PSA grading worth it in 2026?", "How much does PSA grading cost?", per-set guides

**The 5-second test:** a collector lands from Google → types card → sees verdict + math in under 5 seconds. Everything else is secondary.

---

## 7. Crypto Payments (NOWPayments v1)

- Create products: `pro_monthly` ($9.99), `pro_yearly` ($99)
- Checkout: NOWPayments hosted invoice → user pays BTC/ETH/USDT → webhook hits `/api/webhooks/nowpayments` → verify signature → set `subscriptions.status='active'`, `current_period_end = +30d / +365d`
- Recurring: NOWPayments sends a fresh invoice link by email before expiry (crypto can't auto-charge — this is the standard pattern). In-app banner: "Your Pro renews in 3 days — invoice sent to email."
- Past-due grace: 7 days read-only Pro, then drop to free tier. Never delete user data.
- Migrate to BTCPay Server when MRR > $2k (0% fees, full custody).

---

## 8. 30-Day Launch Checklist

### Week 1 — Foundation + Data
- [ ] Register worthaslab.com; set up Vercel + Supabase projects
- [ ] Next.js scaffold; run DB migrations (schema above)
- [ ] Apply for eBay API keys (Browse + Marketplace Insights) — day 1, don't wait
- [ ] Build `grading_tiers` admin seed (current PSA tiers/fees)
- [ ] Seed top 500 cards: names/sets/images + price medians from sold listings
- [ ] NOWPayments account + sandbox invoices tested

### Week 2 — Core Product
- [ ] Search with autocomplete (name/set/year)
- [ ] Card detail page: price panel + chart (last 90 days)
- [ ] Calculator widget + verdict engine (Section 4 logic)
- [ ] "Not enough data" state for thin markets
- [ ] Mobile-responsive pass (most collectors browse on phones)

### Week 3 — Monetization + Accounts
- [ ] Supabase Auth (email + Google)
- [ ] Free-tier gate: 5 calculations/month, counter in UI
- [ ] NOWPayments checkout → webhook → subscription activation
- [ ] `/pricing`, `/account`, cancel flow, invoice history
- [ ] Past-due/dunning email copy (3 reminders)

### Week 4 — Launch
- [ ] Landing page final copy + FAQ schema markup
- [ ] 10 SEO articles published (`/blog/*`) — target "should I grade", "psa grading cost", "is grading worth it" keywords
- [ ] Beta: invite 50 collectors from your Reddit/IG audience; fix top 5 friction points
- [ ] Launch posts: r/PokemonTCG, r/sportscards (follow each sub's promo rules — lead with free value), IG/Pinterest, Product Hunt, hobby Discords
- [ ] Analytics dashboard: signups → calculations → Pro conversion funnel

---

## 9. Cost Estimate

| Item | One-time | Monthly |
|---|---|---|
| Domain (already owned) | $0 | $0 |
| Vercel + Supabase (free tiers) | $0 | $0 |
| NOWPayments fees | — | 0.5% of revenue only (no upfront) |
| eBay API (free tier) | $0 | $0 |
| PostHog analytics (free tier) | — | $0 |
| **Total to launch** | **$0** | **$0/mo until you earn** |

Your main investment is time, not money.

---

## 10. Success Metrics (first 60 days post-launch)

| Metric | Target | Decision |
|---|---|---|
| Signups | 500 | If <150: distribution problem → double down on SEO/Reddit |
| Calculations/user | ≥3 | If ~1: verdict UX isn't compelling → interview users |
| Free → Pro conversion | ≥4% | If <2%: pricing or paywall placement wrong → test $7.99 |
| Paying users | 20+ | The "continue" signal |
| Churn (monthly) | <10% | If higher: data freshness is the usual culprit → check price update cadence |

**Kill-or-continue rule:** 60 days, <10 paying users after genuine distribution effort → pause and interview; don't add features to fix a distribution problem.

---

## 11. Phase 2 Triggers (only after 50+ paying users)

1. **AI photo pre-grade** — upload card photo → estimated grade probability (upsell: Pro+ tier $19.99)
2. **Price alerts** — "Charizard PSA 10 crossed $800"
3. **Portfolio tracker** — "my 40 cards, total grading upside $2,300"
4. **CGC/BGS support** — second grading company
5. **Bulk mode** — paste 50 cards, get a grading shortlist

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| eBay API sold-data approval slow | Manual seed first; automate after approval |
| PSA changes tiers/pricing | `grading_tiers` table is admin-editable; 10-min update |
| Incumbent adds verdict feature | Speed: launch in 30 days, own the SEO for "should I grade" |
| Thin data → wrong verdicts | "Not enough data" state; never show a verdict on <3 sales |
| Crypto UX friction | NOWPayments hosted checkout (no wallet setup needed from you); USDT option for price stability |
