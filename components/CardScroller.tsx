// Horizontal card scroller — PullValue-style visual card row:
// image, name, PSA 10 price, multiplier badge. Scrolls sideways on all screens.

import type { TopOpportunity } from "@/lib/homepage-data";

function CardImage({ card }: { card: TopOpportunity }) {
  if (card.imageUrl) {
    return (
      <img
        src={card.imageUrl}
        alt={card.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-contain p-3"
      />
    );
  }
  // Placeholder for cards without an ingested image yet.
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/[0.03]">
      <span className="text-5xl font-extrabold text-white/10">
        {card.name.charAt(0)}
      </span>
    </div>
  );
}

export default function CardScroller({ cards }: { cards: TopOpportunity[] }) {
  if (cards.length === 0) return null;
  return (
    <div
      className="flex gap-4 overflow-x-auto pb-3 -mx-5 px-5 snap-x"
      aria-label="Trending cards"
    >
      {cards.map((c) => (
        <a
          key={c.id}
          href="#calculator"
          className="w-[190px] md:w-[216px] shrink-0 snap-start group"
          title={`${c.name} — run the calculator`}
        >
          <div className="relative overflow-hidden rounded-xl border border-line bg-surface card-glow">
            <div className="relative aspect-[3/4] bg-[#0d0d14]">
              <CardImage card={c} />
              {c.demo && (
                <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-400/40 text-yellow-300 bg-black/60">
                  DEMO
                </span>
              )}
              <span className="absolute top-2 right-2 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/60 border border-accent/40 text-accent">
                {c.multiplier.toFixed(1)}x
              </span>
            </div>
            <div className="border-t border-line p-3">
              <p className="truncate text-xs text-muted" title={c.name}>
                {c.name}
              </p>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="font-mono text-sm font-bold text-accent">
                  ${c.psa10.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted uppercase tracking-wider">
                  PSA 10
                </span>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
