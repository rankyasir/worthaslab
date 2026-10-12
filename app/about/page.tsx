import Link from "next/link";

export const metadata = {
  title: "About Us — WorthASlab",
  description: "What WorthASlab is, how the grading ROI verdict works, and where our data comes from.",
};

export default function About() {
  return (
    <div className="relative z-10 max-w-3xl mx-auto px-5 py-16 md:py-24">
      <div className="text-accent text-xs font-extrabold uppercase tracking-[0.2em] mb-3">About Us</div>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8">
        Is it worth <span className="text-accent">a slab?</span>
      </h1>

      <div className="prose-dark">
        <p>
          <strong>WorthASlab</strong> answers the single most expensive question in the trading card
          hobby: <em>should I pay to grade this card?</em> With PSA&apos;s cheapest tier now $59.99
          and all-in costs around $85 per card, grading the wrong card isn&apos;t a hobby expense —
          it&apos;s a loss. We turn that gut feeling into transparent math.
        </p>

        <h2>How it works</h2>
        <p>
          Search any card, see what it recently sold for raw, as a PSA 9, and as a PSA 10. Pick a
          grading tier. WorthASlab computes your profit at PSA 10, your break-even sale price, and
          the slab multiplier — then gives you a clear verdict: <strong>Worth It ✓</strong> or{" "}
          <strong>Skip It ✗</strong>. Every number is shown. No black box, ever.
        </p>

        <h2>Our data — honestly labeled</h2>
        <p>
          The catalog currently runs on clearly-badged <strong>sample data</strong> while we finish
          live market ingestion. Our pipeline pulls current Courtyard vault listings through the
          OpenSea API and accumulates nightly price snapshots — the only way to build real history,
          since marketplaces only show today&apos;s inventory. eBay sold-listing data (what cards{" "}
          <em>actually sold for</em>) is being wired as the ground truth for verdicts. Until a price
          is live, it wears a DEMO badge. We will never present sample data as real.
        </p>

        <h2>Who it&apos;s for</h2>
        <p>
          Pokémon, sports, Magic: The Gathering and Yu-Gi-Oh! collectors who submit to PSA — from
          first-timers grading five cards to flippers running the math on fifty. If you&apos;ve ever
          stared at a raw card and wondered whether the slab would pay for itself, this was built
          for you.
        </p>

        <h2>Pricing, plainly</h2>
        <p>
          Free covers 5 calculations a month. Pro ($9.99/mo or $99/yr) is unlimited, paid in crypto
          (BTC, ETH, USDT) because our collectors are global and crypto doesn&apos;t care about
          borders. Cancel anytime.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap gap-4">
        <Link href="/#calculator" className="btn-accent">Try the calculator</Link>
        <Link href="/contact" className="btn-ghost">Contact us</Link>
      </div>
    </div>
  );
}
