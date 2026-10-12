// WorthASlab verdict engine — rule-based, transparent, deterministic.
// From MVP-PLAN.md section 4. Never guess: thin data → "not_enough_data".

export type Verdict = "worth_it" | "maybe" | "risky" | "not_worth_it" | "not_enough_data";

export interface VerdictInput {
  raw: number;
  psa9: number;
  psa10: number;
  allInCost: number;
  salesCount: number;
}

export interface VerdictResult {
  verdict: Verdict;
  upside10: number;
  upside9: number;
  breakeven: number;
  premiumX: number;
  label: string;
  detail: string;
}

export function computeVerdict(input: VerdictInput): VerdictResult {
  const { raw, psa9, psa10, allInCost, salesCount } = input;
  const upside10 = psa10 - raw - allInCost;
  const upside9 = psa9 - raw - allInCost;
  const breakeven = raw + allInCost;
  const premiumX = raw > 0 ? psa10 / raw : 0;

  if (salesCount < 3) {
    return {
      verdict: "not_enough_data",
      upside10,
      upside9,
      breakeven,
      premiumX,
      label: "Not Enough Data",
      detail:
        "Fewer than 3 recent sales found for this card. We never guess — check back when more sales are recorded.",
    };
  }
  if (upside10 >= 100 && premiumX >= 2.5) {
    return {
      verdict: "worth_it",
      upside10,
      upside9,
      breakeven,
      premiumX,
      label: "Worth It ✓",
      detail: `Strong slab multiplier (${premiumX.toFixed(1)}x) with $${Math.round(
        upside10
      )} upside at PSA 10. This is exactly the kind of card grading was made for.`,
    };
  }
  if (upside10 > 0) {
    return {
      verdict: "maybe",
      upside10,
      upside9,
      breakeven,
      premiumX,
      label: "Maybe — PSA 10 Only",
      detail: `Profitable only if it grades a 10 (+$${Math.round(
        upside10
      )}). A PSA 9 would ${
        upside9 > 0 ? `make $${Math.round(upside9)}` : `lose $${Math.abs(Math.round(upside9))}`
      }. Only submit if the card looks gem mint.`,
    };
  }
  if (upside9 > 0) {
    return {
      verdict: "risky",
      upside10,
      upside9,
      breakeven,
      premiumX,
      label: "Risky",
      detail: `A PSA 10 loses money here. Only a PSA 9 (+$${Math.round(
        upside9
      )}) breaks even — too narrow a margin for most collectors.`,
    };
  }
  return {
    verdict: "not_worth_it",
    upside10,
    upside9,
    breakeven,
    premiumX,
    label: "Skip It ✗",
    detail: `Even a PSA 10 loses $${Math.abs(
      Math.round(upside10)
    )}. Keep it raw or sell it ungraded.`,
  };
}

export const VERDICT_STYLES: Record<Verdict, { badge: string; text: string }> = {
  worth_it: { badge: "bg-accent/15 text-accent border-accent/40", text: "text-accent" },
  maybe: { badge: "bg-yellow-400/10 text-yellow-300 border-yellow-400/30", text: "text-yellow-300" },
  risky: { badge: "bg-orange-400/10 text-orange-300 border-orange-400/30", text: "text-orange-300" },
  not_worth_it: { badge: "bg-red-500/10 text-red-400 border-red-500/30", text: "text-red-400" },
  not_enough_data: { badge: "bg-muted/10 text-muted border-line", text: "text-muted" },
};
