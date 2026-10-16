import Link from "next/link";
import CalculatorSection from "@/components/CalculatorSection";
import PricingCards from "@/components/PricingCards";
import Faq from "@/components/Faq";
import CardScroller from "@/components/CardScroller";
import Sparkline from "@/components/Sparkline";
import { getHomepageData, timeAgo } from "@/lib/homepage-data";

export const metadata = {
  title: "WorthASlab — Is it worth a slab?",
  description:
    "Type any trading card, see raw price vs PSA 9 vs PSA 10, and get a data-backed verdict: grade it or skip it.",
};

// Cache the homepage for 5 minutes — fast loads, fresh numbers.
export const revalidate = 300;

function SectionHeading({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12">
      <div className="text-accent text-xs font-extrabold uppercase tracking-[0.2em] mb-3">{kicker}</div>
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">{title}</h2>
      {sub && <p className="text-muted mt-4 leading-relaxed">{sub}</p>}
    </div>
  );
}

function multBadge(m: number | null) {
  if (m == null) {
    return (
      <span className="font-mono text-sm px-2.5 py-1 rounded-lg border text-muted border-line bg-white/[0.03]">
        —
      </span>
    );
  }
  const label = `${m.toFixed(1)}x`;
  const cls =
    m >= 8
      ? "text-accent border-accent/50 bg-accent/10"
      : m >= 4
        ? "text-yellow-300 border-yellow-400/40 bg-yellow-400/10"
        : "text-muted border-line bg-white/[0.03]";
  return (
    <span className={`font-mono text-sm font-bold px-2.5 py-1 rounded-lg border ${cls}`}>{label}</span>
  );
}

export default async function Home() {
  const data = getHomepageData();
  const { liveData, cardsTracked, snapshots, avgMultiplier, lastUpdated, top, fresh } = await data;

  const heroStats: Array<[string, string]> = [
    [cardsTracked.toLocaleString(), "cards tracked"],
    [snapshots.toLocaleString(), "price snapshots"],
    [avgMultiplier ? `${avgMultiplier.toFixed(1)}x` : "—", "avg slab multiplier"],
    [liveData ? timeAgo(lastUpdated) : "demo", "last price update"],
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 pt-10 md:pt-16 pb-8">
        {!liveData && (
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest border border-yellow-400/40 text-yellow-300 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
            Demo data — live market prices launching soon
          </div>
        )}
        <div className="grid lg:grid-cols-[1.02fr_.98fr] gap-10 lg:gap-14 items-center">
          <div className="max-w-2xl">
            <div className="text-accent text-xs font-extrabold uppercase tracking-[0.2em] mb-4">The collector&apos;s grading dashboard</div>
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.02]">
              Is this card worth a <span className="text-accent">slab?</span>
            </h1>
            <p className="text-muted text-lg md:text-xl mt-6 max-w-xl leading-relaxed">
              Compare raw, PSA 9 and PSA 10 prices, factor in grading costs, and get a clear data-backed verdict before you submit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#calculator" className="btn-accent">Calculate a card <span aria-hidden="true">→</span></a>
              <Link href="#rankings" className="btn-ghost">Explore card rankings</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <span><b className="text-white">{cardsTracked.toLocaleString()}</b> cards in the catalog</span>
              <span><b className="text-white">{snapshots.toLocaleString()}</b> price records</span>
              <span className="text-accent">Free to explore</span>
            </div>
          </div>

          {/* At-a-glance market board */}
          <div className="rounded-3xl border border-line bg-surface/90 p-4 sm:p-6 shadow-[0_28px_90px_rgba(0,0,0,.45)]">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-4 mb-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted">Grading market</div>
                <div className="font-bold mt-1">Cards collectors are watching</div>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-accent">
                <span className={`w-1.5 h-1.5 rounded-full ${liveData ? "bg-accent" : "bg-yellow-300"}`} />{liveData ? "Catalog data" : "Preview data"}
              </span>
            </div>
            <div className="space-y-2">
              {top.slice(0, 4).map((card, i) => (
                <a href="#calculator" key={card.id} className="group flex items-center gap-3 rounded-2xl border border-transparent bg-white/[0.025] px-3 py-3 hover:border-accent/30 hover:bg-white/[0.045] transition-colors">
                  <div className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-accent/20 via-[#151924] to-[#0d0e13]">
                    {card.imageUrl ? <img src={card.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : <span className="font-mono text-sm font-black text-accent/80">{String(i + 1).padStart(2, "0")}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold group-hover:text-accent transition-colors">{card.name}</div>
                    <div className="truncate text-xs text-muted mt-1">{card.setName}{card.year ? ` · ${card.year}` : ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-bold">{card.psa10 > 0 ? `$${card.psa10.toLocaleString()}` : "—"}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted mt-1">PSA 10</div>
                  </div>
                  <div className="hidden sm:block min-w-[58px] text-right">
                    {multBadge(card.multiplier)}
                    <div className="text-[9px] uppercase tracking-wider text-muted mt-1">multiplier</div>
                  </div>
                </a>
              ))}
              {top.length === 0 && <div className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">Card rankings are being prepared. Try the calculator or browse the catalog soon.</div>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {heroStats.slice(2).map(([v, l]) => <div key={l} className="rounded-xl border border-line bg-black/20 px-4 py-3"><div className="font-mono text-lg font-bold">{v}</div><div className="text-[10px] uppercase tracking-widest text-muted mt-1">{l}</div></div>)}
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH + CALCULATOR */}
      <CalculatorSection />

      {/* FRESH IN THE VAULT — visual card scroller */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 pt-4 pb-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-accent text-sm font-bold mb-3">Fresh in the vault</div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Newest cards tracked</h2>
            <p className="text-muted mt-3 max-w-2xl leading-relaxed">
              The latest additions to the catalog — tap any card to run it through the calculator.
            </p>
          </div>
        </div>
        <CardScroller cards={fresh} />
      </section>

      {/* 01 / TOP OPPORTUNITIES — ranked table */}
      <section id="rankings" className="relative z-10 max-w-6xl mx-auto px-5 py-16">
        <div className="mb-10">
          <div className="font-mono text-accent text-sm font-bold mb-3">01 / Rankings</div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Top grading opportunities right now</h2>
          <p className="text-muted mt-3 max-w-2xl leading-relaxed">
            Every tracked card ranked by slab multiplier — PSA 10 price ÷ raw price.
            The higher the multiple, the more grading pays.
          </p>
        </div>
        <div className="bg-surface border border-line rounded-2xl overflow-hidden card-glow">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-widest border-b border-line">
                  <th className="py-4 px-5 font-bold">#</th>
                  <th className="py-4 px-5 font-bold">Card</th>
                  <th className="py-4 px-5 font-bold text-right">Raw</th>
                  <th className="py-4 px-5 font-bold text-right">PSA 10</th>
                  <th className="py-4 px-5 font-bold text-right">Multiplier</th>
                  <th className="py-4 px-5 font-bold text-right">Trend</th>
                </tr>
              </thead>
              <tbody>
                {top.map((t, i) => (
                  <tr key={t.id} className="border-b border-line/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-5 font-mono text-muted font-bold">{String(i + 1).padStart(2, "0")}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        {t.imageUrl ? (
                          <img
                            src={t.imageUrl}
                            alt=""
                            loading="lazy"
                            className="w-9 h-12 object-contain rounded bg-white/[0.04] shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-12 rounded bg-white/[0.04] shrink-0 flex items-center justify-center">
                            <span className="font-extrabold text-white/15">{t.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold flex items-center gap-2">
                            <span className="truncate">{t.name}</span>
                            {t.demo && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-400/40 text-yellow-300 shrink-0">DEMO</span>
                            )}
                          </div>
                          <div className="text-xs text-muted mt-0.5 truncate">{t.setName}{t.year ? ` · ${t.year}` : ""}{t.cardNumber ? ` · #${t.cardNumber}` : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-muted">{t.raw > 0 ? `$${t.raw.toLocaleString()}` : "—"}</td>
                    <td className="py-4 px-5 text-right font-mono text-accent font-bold">{t.psa10 > 0 ? `$${t.psa10.toLocaleString()}` : "—"}</td>
                    <td className="py-4 px-5 text-right">{multBadge(t.multiplier)}</td>
                    <td className="py-4 px-5">
                      <div className="flex justify-end">
                        <Sparkline points={t.history} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-center mt-6">
          <a href="#calculator" className="text-accent text-sm font-bold hover:underline">Run the math on your own card →</a>
        </p>
      </section>

      {/* 02 / HOW IT WORKS */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 py-16">
        <div className="mb-10">
          <div className="font-mono text-accent text-sm font-bold mb-3">02 / How it works</div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Three steps. Five seconds.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Search your card", d: "Name, set, or year. Pick your card from live-search results with recent sold prices attached." },
            { n: "02", t: "Pick a grading tier", d: "Standard through Premium 1 — with real 2026 PSA fees and turnaround times baked in." },
            { n: "03", t: "Get the verdict", d: "Worth It ✓ or Skip It ✗ — with every number shown. Profit at PSA 10, break-even sale, slab multiplier." },
          ].map((s) => (
            <div key={s.n} className="bg-surface border border-line rounded-2xl p-8 card-glow">
              <div className="font-mono text-accent text-sm font-bold mb-4">{s.n}</div>
              <h3 className="text-xl font-extrabold mb-2">{s.t}</h3>
              <p className="text-muted text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 03 / DATA SOURCES */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 py-16">
        <div className="mb-10">
          <div className="font-mono text-accent text-sm font-bold mb-3">03 / Data</div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Built on real sold prices</h2>
          <p className="text-muted mt-3 max-w-2xl leading-relaxed">
            Live ingestion from the hobby&apos;s major marketplaces is in progress. Until then, every sample price is clearly badged DEMO.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["Courtyard Vault", liveData ? "Live" : "Connecting"],
            ["eBay Sold Listings", "Ingestion soon"],
            ["PSA Auction Prices", "Ingestion soon"],
            ["Nightly Snapshots", liveData ? "Active" : "Ready"],
          ].map(([s, st]) => (
            <div key={s} className="bg-surface border border-line rounded-xl px-5 py-6 text-center card-glow">
              <div className="font-bold text-sm">{s}</div>
              <div className={`text-[11px] mt-2 uppercase tracking-widest font-bold ${st === "Live" || st === "Active" ? "text-accent" : "text-muted"}`}>
                {st === "Live" || st === "Active" ? `● ${st}` : st}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 04 / WHY WORTHASLAB */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 py-16">
        <div className="mb-10">
          <div className="font-mono text-accent text-sm font-bold mb-3">04 / Why WorthASlab</div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">The question every collector asks</h2>
          <p className="text-muted mt-3 max-w-2xl leading-relaxed">“Should I grade this?” — we turned that gut feeling into math.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { t: "No more $85 mistakes", d: "Grading a $30 card at $59.99+ a slab is lighting money on fire. The calculator kills those submissions before you ship." },
            { t: "Every number visible", d: "No black box, no “trust us”. Raw, PSA 9, PSA 10, fees, shipping — the full breakdown in a monospace table." },
            { t: "Built for the 2026 market", d: "Value tiers are paused and the floor is $59.99. Our tier data and break-even math reflect grading as it actually costs today." },
          ].map((c) => (
            <div key={c.t} className="bg-surface border border-line rounded-2xl p-8 card-glow">
              <h3 className="text-xl font-extrabold mb-2">{c.t}</h3>
              <p className="text-muted text-sm leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 05 / PRICING */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 py-16">
        <SectionHeading kicker="05 / Pricing" title="Free to start. Pro when you're serious." />
        <PricingCards />
      </section>

      {/* 06 / FAQ */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 py-16">
        <SectionHeading kicker="06 / FAQ" title="Questions collectors ask" />
        <Faq />
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-5 py-20 text-center">
        <div className="bg-surface border border-accent/30 rounded-3xl px-8 py-14 shadow-[0_0_60px_rgba(0,255,136,0.08)]">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Stop guessing. <span className="text-accent">Start grading smart.</span>
          </h2>
          <p className="text-muted mt-4 mb-8">Five free calculations a month. No card required.</p>
          <a href="#calculator" className="btn-accent inline-block">Is it worth a slab?</a>
        </div>
      </section>
    </>
  );
}
