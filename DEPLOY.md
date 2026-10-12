# WorthASlab — Deploy Guide ($0)

Everything below uses free tiers only. Total cost: $0 (plus the domain you already own).

## Step 1 — Supabase (free database + auth)

1. Go to **supabase.com** → sign up (GitHub login is fastest) → **New Project**.
   - Name: `worthaslab` · pick any region · **free plan** (do NOT add a credit card).
   - Wait ~2 minutes for the project to spin up.
2. Open **SQL Editor** → **New query** → paste the entire contents of
   `supabase/schema.sql` from this repo → **Run**.
   - This creates: `cards`, `price_snapshots`, `grading_tiers`, `subscriptions`,
     `calculations`, `contact_messages` (+ RLS policies) and seeds the PSA tiers
     and 60 DEMO cards.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (never expose publicly)
4. **Auth → Providers → Google**: turn it ON (needs a Google Cloud OAuth client —
   follow Supabase's 5-minute guide; optional — email/password works without it).
5. **Auth → URL Configuration**: set **Site URL** to your domain
   (e.g. `https://worthaslab.com`) and add it under **Redirect URLs** too.

## Step 2 — Vercel (free hosting)

1. Go to **vercel.com** → sign up (GitHub login) → **Add New → Project**.
2. Either:
   - **Import this repo** from GitHub (push the `worthaslab/` folder to a repo first), or
   - Install the CLI (`npm i -g vercel`) and run `npx vercel` inside `worthaslab/`.
3. Framework preset: **Next.js** (auto-detected). Deploy.
4. **Add your domain**: Project → **Settings → Domains** → add `worthaslab.com`
   (follow the DNS instructions at your registrar).

## Step 3 — Environment variables (YOU paste these yourself)

Project → **Settings → Environment Variables**. Add each, then **Redeploy**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase Step 1.3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase Step 1.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase Step 1.3 |
| `NOWPAYMENTS_API_KEY` | your NOWPayments API key (you already have it — paste it yourself, never send it to anyone again) |
| `NOWPAYMENTS_IPN_SECRET` | your NOWPayments IPN secret (same — paste it yourself) |
| `NOWPAYMENTS_IPN_CALLBACK_URL` | `https://worthaslab.com/api/webhooks/nowpayments` (your real domain) |
| `SITE_URL` | `https://worthaslab.com` (your real domain) |
| `OPENSEA_API_KEY` | your OpenSea API key (free from the OpenSea developer portal — paste it yourself) |
| `CRON_SECRET` | any long random string you invent (used by the nightly job) |

> `NOWPAYMENTS_SANDBOX=true` is the default — flip to `false` only when you're
> ready for real payments.

## Step 4 — NOWPayments: set the IPN URL

1. NOWPayments dashboard → your API key settings → **IPN callback URL**:
   `https://worthaslab.com/api/webhooks/nowpayments` (your real domain).
2. Save. Done — when a customer pays, NOWPayments pings this URL and Pro activates automatically.

## Step 5 — Nightly price ingestion (free)

1. Create a free account at **cron-job.org**.
2. New cron job → URL: `https://worthaslab.com/api/cron/ingest?secret=YOUR_CRON_SECRET`
   → schedule: **daily, 02:00 UTC** → save.
3. This pulls Courtyard listings via OpenSea, upserts cards, and writes one price
   snapshot per card per day (snapshots ARE the price history).

## Step 6 — Verify it's all working

- [ ] Homepage loads, search finds the 60 DEMO cards (badged DEMO)
- [ ] Calculator shows verdict + math, updates live
- [ ] Sign up with email → confirm → sign in → account page shows Free plan
- [ ] Make 6 calculations → the 6th shows the upgrade nudge (5/month free limit)
- [ ] Pricing → Pro → checkout creates a NOWPayments invoice (sandbox first!)
- [ ] Pay a sandbox invoice → webhook fires → account page shows Pro active
- [ ] Contact form saves a message (check `contact_messages` in Supabase)
- [ ] Blog lists 10 articles; each article page renders

## When something breaks

- **Build fails on Vercel**: check the build logs; 99% of the time it's a missing env var.
- **Auth emails not arriving**: Supabase free tier has email rate limits — fine for launch; add a custom SMTP later if needed.
- **Webhook not firing**: IPN URL must be public HTTPS and match Step 4 exactly.
- **OpenSea 429s**: the adapter caps new-token fetches per run (60) and skips known tokens — check cron-job.org execution logs.
