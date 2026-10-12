"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "How does WorthASlab decide if grading is worth it?",
    a: "Simple transparent math: PSA 10 recent sold price minus raw price minus your all-in grading cost (tier fee + shipping + supplies). If the upside at PSA 10 clears $100 with a 2.5x+ slab multiplier, it's Worth It. You always see every number — we never hide the math.",
  },
  {
    q: "How much does PSA grading cost in 2026?",
    a: "PSA's cheapest open tier is Standard at $59.99 per card (90–100 business days). Priority is $79.99, Express $199, Super Express $349, Premier $599, and Premium 1 $999. The old Value tiers ($24.99–$64.99) have been paused since June 2026. All-in, expect ~$85 per card in a batch once shipping and supplies are included.",
  },
  {
    q: "What does the free plan include?",
    a: "5 grading calculations per month, access to all PSA tiers, and the full transparent breakdown. No credit card, no crypto wallet needed to start.",
  },
  {
    q: "How do crypto payments work?",
    a: "Checkout creates a NOWPayments invoice — you pay in BTC, ETH, or USDT (your choice). Crypto can't auto-charge like a card, so before each renewal you get a fresh invoice link by email. Pay it and your Pro stays active. Cancel anytime.",
  },
  {
    q: "Are the card prices live?",
    a: "Right now the catalog runs on clearly-labeled sample data while we finish the live market ingestion (eBay sold listings + PSA auction prices realized). Every sample card carries a DEMO badge — we will never present sample data as live.",
  },
  {
    q: "Which cards should I never grade?",
    a: "As a rule of thumb: if the PSA 10 premium over raw doesn't comfortably cover the ~$85 all-in cost, skip it. Cards worth under ~$40 raw almost never pencil out at current tier prices. Run the calculator — it takes five seconds.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="max-w-3xl mx-auto">
      {FAQS.map((f, i) => (
        <div key={i} className="border-b border-line/70">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left py-5 flex items-center justify-between gap-4"
          >
            <span className="font-bold">{f.q}</span>
            <span className={`text-accent text-xl shrink-0 transition-transform ${open === i ? "rotate-45" : ""}`}>+</span>
          </button>
          {open === i && <p className="pb-6 text-muted text-sm leading-relaxed">{f.a}</p>}
        </div>
      ))}
    </div>
  );
}
