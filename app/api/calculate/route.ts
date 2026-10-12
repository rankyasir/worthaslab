import { NextResponse } from "next/server";
import { getSessionUser, isSupabaseConfigured } from "@/lib/supabase-server";
import { getUsage, logCalculation } from "@/lib/data";
import { FREE_CALCULATIONS_PER_MONTH } from "@/lib/demo-data";

// POST /api/calculate — records a calculation and enforces the free-tier limit.
// Guests (no session): math is computed client-side; nothing is logged here.
// Signed-in free users: 5/month; Pro: unlimited. Over-limit → 402 (client still shows math).
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isSupabaseConfigured()) {
    return NextResponse.json({ logged: false, isPro: false, remaining: null });
  }

  const body = await req.json().catch(() => ({}));
  const { cardId, tierId, rawPrice, psa10Price, allInCost, upside, verdict } = body;

  const usage = await getUsage(user.id);
  if (!usage.isPro && usage.used >= usage.limit) {
    return NextResponse.json(
      { error: "limit", remaining: 0, isPro: false, limit: FREE_CALCULATIONS_PER_MONTH },
      { status: 402 }
    );
  }

  await logCalculation({
    userId: user.id,
    cardId: String(cardId ?? ""),
    tierId: String(tierId ?? ""),
    rawPrice: Number(rawPrice ?? 0),
    psa10Price: Number(psa10Price ?? 0),
    allInCost: Number(allInCost ?? 0),
    upside: Number(upside ?? 0),
    verdict: String(verdict ?? ""),
  });

  const after = await getUsage(user.id);
  return NextResponse.json({
    logged: true,
    isPro: after.isPro,
    remaining: after.isPro ? null : Math.max(0, after.limit - after.used),
  });
}
