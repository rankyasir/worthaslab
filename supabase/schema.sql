-- WorthASlab — Supabase schema (run in the SQL editor of a NEW free project)
-- From MVP-PLAN.md section 3, plus ingestion support (source/external_id)
-- and the contact inbox table.

-- ── Cards ──────────────────────────────────────────────────────────────
create table if not exists cards (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  set_name      text not null default '',
  year          int,
  category      text not null default 'pokemon',   -- pokemon | sports | mtg | yugioh | other
  card_number   text,
  image_url     text,
  slug          text unique not null,
  source        text,                               -- 'demo' | 'opensea' | 'ebay'
  external_id   text,                               -- adapter's stable id
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists cards_name_idx on cards (name);
create index if not exists cards_slug_idx on cards (slug);

-- ── Price snapshots (one row per card per day = the price history) ─────
create table if not exists price_snapshots (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid not null references cards(id) on delete cascade,
  raw_price     numeric,
  psa9_price    numeric,
  psa10_price   numeric,
  sales_count   int not null default 0,
  source        text not null default 'demo',      -- ebay | psa_auction | tcgplayer | opensea | demo
  captured_at   date not null default current_date,
  unique (card_id, captured_at)
);
create index if not exists price_snapshots_card_idx on price_snapshots (card_id, captured_at desc);

-- ── PSA grading tiers (admin-editable; PSA changes these) ───────────────
create table if not exists grading_tiers (
  id                  text primary key,
  name                text not null,
  fee                 numeric not null,
  max_declared_value  numeric not null,
  turnaround_days     text not null,
  active              boolean not null default true
);

-- ── Subscriptions (one row per auth user) ──────────────────────────────
create table if not exists subscriptions (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  plan                text not null default 'free',   -- free | pro_monthly | pro_yearly
  status              text not null default 'active',  -- active | past_due | canceled
  nowpayments_id      text,
  current_period_end  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── Calculations (powers free-tier limits + analytics) ─────────────────
create table if not exists calculations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  card_id       text not null,
  tier_id       text not null,
  raw_price     numeric not null,
  psa10_price   numeric not null,
  all_in_cost   numeric not null,
  upside        numeric not null,
  verdict       text not null,
  created_at    timestamptz not null default now()
);
create index if not exists calculations_user_idx on calculations (user_id, created_at desc);

-- ── Contact inbox ──────────────────────────────────────────────────────
create table if not exists contact_messages (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  message       text not null,
  created_at    timestamptz not null default now()
);

-- ── Row Level Security ─────────────────────────────────────────────────
alter table cards enable row level security;
alter table price_snapshots enable row level security;
alter table grading_tiers enable row level security;
alter table subscriptions enable row level security;
alter table calculations enable row level security;
alter table contact_messages enable row level security;

-- Public read: catalog, prices, tiers (the product is a public price tool)
create policy "public read cards" on cards for select using (true);
create policy "public read snapshots" on price_snapshots for select using (true);
create policy "public read tiers" on grading_tiers for select using (true);

-- Users see/insert only their own rows
create policy "own subscription" on subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own calculations" on calculations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Contact: anyone may insert; only service role reads (no select policy)
create policy "anyone can write contact" on contact_messages
  for insert with check (true);

-- ── Seed: PSA tiers (2026 — Value tiers paused) ─────────────────────────
insert into grading_tiers (id, name, fee, max_declared_value, turnaround_days, active) values
  ('standard',      'Standard',      59.99,  1000, '90–100 business days', true),
  ('priority',      'Priority',      79.99,  1500, '70–80 business days',  true),
  ('express',       'Express',      199.00,  2500, '20–30 business days',   true),
  ('super-express', 'Super Express',349.00,  5000, '10–15 business days',   true),
  ('premier',       'Premier',      599.00, 10000, '7–10 business days',    true),
  ('premium-1',     'Premium 1',    999.00, 25000, '5–7 business days',     true)
on conflict (id) do update set
  fee = excluded.fee, max_declared_value = excluded.max_declared_value,
  turnaround_days = excluded.turnaround_days, active = excluded.active;

-- ── Seed: 60 DEMO cards (sample prices — replaced by ingestion later) ────
insert into cards (name, set_name, year, category, card_number, slug, source) values
  ('Charizard', 'Base Set', 1999, 'pokemon', '4/102', 'charizard-base-set-4-102', 'demo'),
  ('Pikachu', 'Base Set', 1999, 'pokemon', '58/102', 'pikachu-base-set-58-102', 'demo'),
  ('Blastoise', 'Base Set', 1999, 'pokemon', '2/102', 'blastoise-base-set-2-102', 'demo'),
  ('Umbreon VMAX', 'Evolving Skies', 2021, 'pokemon', '215/203', 'umbreon-vmax-evolving-skies-215-203', 'demo'),
  ('Umbreon VMAX Alt Art', 'Evolving Skies', 2021, 'pokemon', '215/203', 'moonbreon-alt-art-evolving-skies', 'demo'),
  ('Luka Doncic', 'Prizm Silver', 2018, 'sports', '280', 'luka-doncic-prizm-silver-280', 'demo'),
  ('Mike Trout', 'Topps Chrome Update', 2011, 'sports', 'US175', 'mike-trout-topps-chrome-update-us175', 'demo'),
  ('Victor Wembanyama', 'Prizm Silver', 2023, 'sports', '136', 'wembanyama-prizm-silver-136', 'demo'),
  ('Black Lotus', 'Limited Edition Alpha', 1993, 'mtg', '232', 'black-lotus-alpha-232', 'demo'),
  ('Blue-Eyes White Dragon', 'Legend of Blue Eyes', 2002, 'yugioh', 'LOB-001', 'blue-eyes-white-dragon-lob-001', 'demo'),
  ('Shohei Ohtani', 'Topps Chrome Rookie Auto', 2018, 'sports', 'RA-SO', 'shohei-ohtani-topps-chrome-auto-ra-so', 'demo'),
  ('Gengar', 'Fossil Holo', 1999, 'pokemon', '5/62', 'gengar-fossil-holo-5-62', 'demo'),
  ('Mewtwo', 'Base Set', 1999, 'pokemon', '10/102', 'mewtwo-base-set-10-102', 'demo'),
  ('Venusaur', 'Base Set', 1999, 'pokemon', '15/102', 'venusaur-base-set-15-102', 'demo'),
  ('Lugia', 'Neo Genesis', 2000, 'pokemon', '9/111', 'lugia-neo-genesis-9-111', 'demo'),
  ('Charizard 1st Edition', 'Base Set', 1999, 'pokemon', '4/102', 'charizard-1st-edition-base-set', 'demo'),
  ('Rayquaza VMAX Alt Art', 'Evolving Skies', 2021, 'pokemon', '217/203', 'rayquaza-vmax-alt-art-evolving-skies', 'demo'),
  ('Gengar VMAX Alt Art', 'Fusion Strike', 2021, 'pokemon', '157/264', 'gengar-vmax-alt-art-fusion-strike', 'demo'),
  ('Giratina V Alt Art', 'Lost Origin', 2022, 'pokemon', '186/196', 'giratina-v-alt-art-lost-origin', 'demo'),
  ('Charizard VMAX Shiny', 'Shining Fates', 2021, 'SV107/SV122', 'charizard-vmax-shiny-shining-fates', 'demo'),
  ('Espeon VMAX Alt Art', 'Evolving Skies', 2021, 'pokemon', '270/203', 'espeon-vmax-alt-art-evolving-skies', 'demo'),
  ('Sylveon VMAX Alt Art', 'Evolving Skies', 2021, 'pokemon', '211/203', 'sylveon-vmax-alt-art-evolving-skies', 'demo'),
  ('Alakazam', 'Base Set', 1999, 'pokemon', '1/102', 'alakazam-base-set-1-102', 'demo'),
  ('Zapdos', 'Base Set', 1999, 'pokemon', '16/102', 'zapdos-base-set-16-102', 'demo'),
  ('Tyranitar', 'Neo Discovery', 2001, 'pokemon', '12/75', 'tyranitar-neo-discovery-12-75', 'demo'),
  ('Shining Charizard', 'Neo Destiny', 2002, 'pokemon', '107/105', 'shining-charizard-neo-destiny', 'demo'),
  ('Charizard ex', 'Obsidian Flames', 2023, 'pokemon', '125/197', 'charizard-ex-obsidian-flames', 'demo'),
  ('Bubble Mew ex', '151', 2023, 'pokemon', '151/165', 'bubble-mew-ex-151', 'demo'),
  ('Charizard ex', '151', 2023, 'pokemon', '199/165', 'charizard-ex-151-199', 'demo'),
  ('Greninja ex', 'Twilight Masquerade', 2024, 'pokemon', '214/167', 'greninja-ex-twilight-masquerade', 'demo'),
  ('Leafeon VMAX Alt Art', 'Evolving Skies', 2021, 'pokemon', '206/203', 'leafeon-vmax-alt-art-evolving-skies', 'demo'),
  ('Glaceon VMAX Alt Art', 'Evolving Skies', 2021, 'pokemon', '209/203', 'glaceon-vmax-alt-art-evolving-skies', 'demo'),
  ('Mickey Mantle', '1952 Topps', 1952, 'sports', '311', 'mickey-mantle-1952-topps-311', 'demo'),
  ('Patrick Mahomes', 'Prizm Silver', 2017, 'sports', '269', 'patrick-mahomes-prizm-silver-269', 'demo'),
  ('Joe Burrow', 'Prizm Silver', 2020, 'sports', '145', 'joe-burrow-prizm-silver-145', 'demo'),
  ('Justin Herbert', 'Prizm Silver', 2020, 'sports', '205', 'justin-herbert-prizm-silver-205', 'demo'),
  ('LeBron James', 'Topps Chrome Rookie', 2003, 'sports', '111', 'lebron-james-topps-chrome-rookie-111', 'demo'),
  ('Stephen Curry', 'Topps Chrome Rookie', 2009, 'sports', '101', 'stephen-curry-topps-chrome-rookie-101', 'demo'),
  ('Tom Brady', 'Contenders Rookie Ticket', 2000, 'sports', '144', 'tom-brady-contenders-rookie-ticket', 'demo'),
  ('Anthony Edwards', 'Prizm Silver', 2020, 'sports', '282', 'anthony-edwards-prizm-silver-282', 'demo'),
  ('Connor Bedard', 'Young Guns', 2023, 'sports', '451', 'connor-bedard-young-guns-451', 'demo'),
  ('Aaron Judge', 'Topps Chrome Rookie', 2017, 'sports', '169', 'aaron-judge-topps-chrome-rookie-169', 'demo'),
  ('Caitlin Clark', 'Prizm', 2024, 'sports', '145', 'caitlin-clark-prizm-145', 'demo'),
  ('Connor McDavid', 'Young Guns', 2015, 'sports', '201', 'connor-mcdavid-young-guns-201', 'demo'),
  ('Auston Matthews', 'Young Guns', 2016, 'sports', '201', 'auston-matthews-young-guns-201', 'demo'),
  ('Jayson Tatum', 'Prizm Silver', 2017, 'sports', '16', 'jayson-tatum-prizm-silver-16', 'demo'),
  ('C.J. Stroud', 'Prizm Silver', 2023, 'sports', '339', 'cj-stroud-prizm-silver-339', 'demo'),
  ('Jayden Daniels', 'Prizm Silver', 2024, 'sports', '347', 'jayden-daniels-prizm-silver-347', 'demo'),
  ('Ancestral Recall', 'Limited Edition Alpha', 1993, 'mtg', '48', 'ancestral-recall-alpha', 'demo'),
  ('Time Walk', 'Limited Edition Alpha', 1993, 'mtg', '66', 'time-walk-alpha', 'demo'),
  ('Mox Sapphire', 'Limited Edition Alpha', 1993, 'mtg', '260', 'mox-sapphire-alpha', 'demo'),
  ('Mox Jet', 'Limited Edition Alpha', 1993, 'mtg', '262', 'mox-jet-alpha', 'demo'),
  ('Timetwister', 'Limited Edition Alpha', 1993, 'mtg', '65', 'timetwister-alpha', 'demo'),
  ('The One Ring', 'Tales of Middle-earth', 2023, 'mtg', '451', 'the-one-ring-tales-of-middle-earth', 'demo'),
  ('Dark Magician', 'Legend of Blue Eyes', 2002, 'yugioh', 'LOB-001', 'dark-magician-lob-001', 'demo'),
  ('Exodia the Forbidden One', 'Legend of Blue Eyes', 2002, 'yugioh', 'LOB-124', 'exodia-lob-124', 'demo'),
  ('Dark Magician Girl', 'Magician''s Force', 2003, 'yugioh', 'MFC-000', 'dark-magician-girl-mfc-000', 'demo'),
  ('Red-Eyes B. Dragon', 'Legend of Blue Eyes', 2002, 'yugioh', 'LOB-070', 'red-eyes-b-dragon-lob-070', 'demo'),
  ('Monkey D. Luffy Manga Alt Art', 'Awakening of the New Era OP05', 2023, 'onepiece', 'OP05-119', 'luffy-manga-alt-art-op05-119', 'demo'),
  ('Roronoa Zoro Manga Alt Art', 'Romance Dawn OP01', 2022, 'onepiece', 'OP01-001', 'zoro-manga-alt-art-op01-001', 'demo')
on conflict (slug) do nothing;

-- One sample snapshot per demo card (raw, psa9, psa10, sales_count)
insert into price_snapshots (card_id, raw_price, psa9_price, psa10_price, sales_count, source)
select id, raw, p9, p10, sc, 'demo' from (values
  ('charizard-base-set-4-102', 380, 1400, 5200, 48),
  ('pikachu-base-set-58-102', 12, 45, 210, 63),
  ('blastoise-base-set-2-102', 95, 320, 1150, 31),
  ('umbreon-vmax-evolving-skies-215-203', 420, 520, 980, 74),
  ('moonbreon-alt-art-evolving-skies', 700, 850, 1400, 52),
  ('luka-doncic-prizm-silver-280', 210, 260, 640, 41),
  ('mike-trout-topps-chrome-update-us175', 480, 700, 2100, 29),
  ('wembanyama-prizm-silver-136', 85, 110, 290, 88),
  ('black-lotus-alpha-232', 18000, 42000, 95000, 6),
  ('blue-eyes-white-dragon-lob-001', 65, 180, 720, 37),
  ('shohei-ohtani-topps-chrome-auto-ra-so', 950, 1600, 4800, 22),
  ('gengar-fossil-holo-5-62', 38, 120, 410, 45),
  ('mewtwo-base-set-10-102', 45, 150, 620, 52),
  ('venusaur-base-set-15-102', 55, 180, 700, 44),
  ('lugia-neo-genesis-9-111', 280, 900, 3400, 28),
  ('charizard-1st-edition-base-set', 2500, 9000, 35000, 9),
  ('rayquaza-vmax-alt-art-evolving-skies', 180, 240, 520, 61),
  ('gengar-vmax-alt-art-fusion-strike', 120, 170, 380, 58),
  ('giratina-v-alt-art-lost-origin', 95, 140, 310, 66),
  ('charizard-vmax-shiny-shining-fates', 140, 190, 420, 72),
  ('espeon-vmax-alt-art-evolving-skies', 110, 150, 330, 49),
  ('sylveon-vmax-alt-art-evolving-skies', 105, 145, 320, 51),
  ('alakazam-base-set-1-102', 18, 60, 240, 38),
  ('zapdos-base-set-16-102', 22, 70, 280, 41),
  ('tyranitar-neo-discovery-12-75', 65, 200, 750, 24),
  ('shining-charizard-neo-destiny', 900, 2600, 9500, 11),
  ('charizard-ex-obsidian-flames', 28, 45, 120, 83),
  ('bubble-mew-ex-151', 35, 60, 150, 77),
  ('charizard-ex-151-199', 60, 95, 240, 69),
  ('greninja-ex-twilight-masquerade', 45, 70, 180, 62),
  ('leafeon-vmax-alt-art-evolving-skies', 90, 130, 290, 47),
  ('glaceon-vmax-alt-art-evolving-skies', 85, 125, 280, 46),
  ('mickey-mantle-1952-topps-311', 45000, 120000, 480000, 4),
  ('patrick-mahomes-prizm-silver-269', 320, 420, 1100, 36),
  ('joe-burrow-prizm-silver-145', 95, 130, 340, 54),
  ('justin-herbert-prizm-silver-205', 70, 95, 260, 57),
  ('lebron-james-topps-chrome-rookie-111', 850, 1400, 4200, 19),
  ('stephen-curry-topps-chrome-rookie-101', 420, 700, 2100, 26),
  ('tom-brady-contenders-rookie-ticket', 3200, 8000, 28000, 8),
  ('anthony-edwards-prizm-silver-282', 45, 65, 170, 63),
  ('connor-bedard-young-guns-451', 120, 150, 380, 71),
  ('aaron-judge-topps-chrome-rookie-169', 55, 85, 240, 48),
  ('caitlin-clark-prizm-145', 75, 100, 260, 66),
  ('connor-mcdavid-young-guns-201', 180, 260, 720, 33),
  ('auston-matthews-young-guns-201', 90, 130, 340, 44),
  ('jayson-tatum-prizm-silver-16', 60, 85, 230, 52),
  ('cj-stroud-prizm-silver-339', 55, 80, 210, 59),
  ('jayden-daniels-prizm-silver-347', 65, 90, 240, 61),
  ('ancestral-recall-alpha', 4500, 11000, 32000, 5),
  ('time-walk-alpha', 3800, 9500, 28000, 6),
  ('mox-sapphire-alpha', 5200, 13000, 38000, 5),
  ('mox-jet-alpha', 4800, 12000, 34000, 4),
  ('timetwister-alpha', 3200, 8000, 24000, 5),
  ('the-one-ring-tales-of-middle-earth', 65, 110, 320, 74),
  ('dark-magician-lob-001', 45, 140, 580, 42),
  ('exodia-lob-124', 180, 420, 1500, 21),
  ('dark-magician-girl-mfc-000', 220, 520, 1800, 18),
  ('red-eyes-b-dragon-lob-070', 60, 170, 640, 35),
  ('luffy-manga-alt-art-op05-119', 850, 1100, 2400, 16),
  ('zoro-manga-alt-art-op01-001', 420, 580, 1300, 23)
) as v(slug, raw, p9, p10, sc)
join cards c on c.slug = v.slug
on conflict (card_id, captured_at) do nothing;
