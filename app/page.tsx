import Link from "next/link";
import CalculatorSection from "@/components/CalculatorSection";
import PricingCards from "@/components/PricingCards";
import Faq from "@/components/Faq";

export const metadata = {
  title: "WorthASlab — Is it worth a slab?",
  description:
    "Type any trading card, see raw price vs PSA 9 vs PSA 10, and get a data-backed verdict: grade it or skip it.",
};

function SectionHeading({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12">
      <div className="text-accent text-xs font-extrabold uppercase tracking-[0.2em] mb-3">{kicker}</div>
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">{title}</h2>
      {sub && <p className="text-muted mt-4 leading-relaxed">{sub}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 pt-20 md:pt-28 pb-8 text-center">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest border border-yellow-400/40 text-yellow-300 rounded-full px-4 py-1.5 mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
          Demo data — live market prices launching soon
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
          PSA 10 vs Raw <span className="text-accent">— instantly.</span>
        </h1>
        <p className="text-muted text-lg md:text-xl mt-6 max-w-2xl mx-auto leading-relaxed">
          Type any trading card. See what it sells for raw, as a PSA 9, and as a PSA 10 —
          then get a data-backed verdict: <span className="text-white font-semibold">grade it or skip it.</span>
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <a href="#calculator" className="btn-accent">Try the calculator</a>
          <Link href="/pricing" className="btn-ghost">See pricing</Link>
        </div>
      </section>

      {/* SEARCH + CALCULATOR */}
      <CalculatorSection />

      {/* HOW IT WORKS */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 py-16">
        <SectionHeading kicker="How it works" title="Three steps. Five seconds." />
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

      {/* STATS BAR */}
      <section className="relative z-10 border-y border-line/70 bg-surface/40">
        <div className="max-w-6xl mx-auto px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            ["<5s", "to a verdict"],
            ["$0", "to start"],
            ["6", "PSA tiers tracked"],
            ["100%", "transparent math"],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="text-3xl md:text-4xl font-extrabold text-accent font-mono">{v}</div>
              <div className="text-muted text-sm mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DATA SOURCES */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 py-20">
        <SectionHeading
          kicker="Data sources"
          title="Built on real sold prices"
          sub="Live ingestion from the hobby's major marketplaces is in progress. Until then, every sample price is clearly badged DEMO."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["eBay Sold Listings", "PSA Auction Prices", "TCGplayer", "Price Snapshots"].map((s) => (
            <div key={s} className="bg-surface border border-line rounded-xl px-5 py-6 text-center card-glow">
              <div className="font-bold text-sm">{s}</div>
              <div className="text-[11px] text-muted mt-2 uppercase tracking-widest">Ingestion soon</div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY WORTHASLAB */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 py-16">
        <SectionHeading kicker="Why WorthASlab" title="The question every collector asks" sub="“Should I grade this?” — we turned that gut feeling into math." />
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

      {/* PRICING */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 py-20">
        <SectionHeading kicker="Pricing" title="Free to start. Pro when you're serious." />
        <PricingCards />
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 py-16">
        <SectionHeading kicker="FAQ" title="Questions collectors ask" />
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
