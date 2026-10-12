import { NextResponse } from "next/server";
import { createPayment, PLANS, type PlanId } from "@/lib/nowpayments";
import { getSessionUser, isSupabaseConfigured } from "@/lib/supabase-server";

// POST /api/payments/create  { planId: "pro_monthly" | "pro_yearly", payCurrency?: "usdt" }
// Returns NOWPayments invoice/payment details for the checkout UI.
// Requires a signed-in user (Supabase Auth).
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Payments activate after the database is connected. See DEPLOY.md." },
      { status: 503 }
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { planId, payCurrency } = await req.json().catch(() => ({}));
  if (!planId || !PLANS[planId as PlanId]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const payment = await createPayment({
      planId: planId as PlanId,
      userId: user.id,
      payCurrency,
    });
    return NextResponse.json({
      payment_id: payment.payment_id,
      invoice_url: payment.invoice_url,
      pay_address: payment.pay_address,
      pay_amount: payment.pay_amount,
      pay_currency: payment.pay_currency,
    });
  } catch (err) {
    console.error("createPayment failed:", err);
    return NextResponse.json({ error: "Payment creation failed" }, { status: 502 });
  }
}
