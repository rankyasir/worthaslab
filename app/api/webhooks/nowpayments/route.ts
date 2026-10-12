import { NextResponse } from "next/server";
import { verifyIpnSignature, PLANS, type PlanId } from "@/lib/nowpayments";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-server";

// POST /api/webhooks/nowpayments  (NOWPayments IPN callback)
// Verifies HMAC signature, then activates the subscription in Supabase.
export async function POST(req: Request) {
  const signature = req.headers.get("x-nowpayments-sig") || "";
  const payload = await req.json().catch(() => null);

  if (!payload || !verifyIpnSignature(payload, signature)) {
    console.warn("NOWPayments IPN: bad signature");
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const { payment_status, order_id } = payload as {
    payment_status: string;
    order_id: string;
  };

  // order_id format from createPayment(): userId:planId:timestamp
  const [userId, planId] = String(order_id || "").split(":");

  try {
    if (payment_status === "finished" && userId && PLANS[planId as PlanId]) {
      await activateSubscription(userId, planId as PlanId, String(payload.payment_id ?? ""));
    } else if (["failed", "expired", "refunded"].includes(payment_status)) {
      console.warn(`NOWPayments payment ${payment_status}: order ${order_id}`);
    }
    // "waiting" / "confirming" / "sending" / "partially_paid": wait for final status.
  } catch (err) {
    console.error("NOWPayments IPN handling failed:", err);
    // Return 500 so NOWPayments retries the IPN.
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function activateSubscription(userId: string, planId: PlanId, paymentId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured — cannot activate subscription");
  }
  const admin = getSupabaseAdmin();
  const days = PLANS[planId].days;
  const currentPeriodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: planId,
      status: "active",
      nowpayments_id: paymentId,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}
