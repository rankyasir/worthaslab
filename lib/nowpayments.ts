// NOWPayments integration for WorthASlab
// Server-side ONLY. Required env vars (never expose to client):
//   NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET,
//   NOWPAYMENTS_IPN_CALLBACK_URL, SITE_URL
// Set NOWPAYMENTS_SANDBOX=true to test against the sandbox API.

import crypto from "crypto";

const API_BASE = "https://api.nowpayments.io/v1";
const SANDBOX_BASE = "https://api-sandbox.nowpayments.io/v1";

function base() {
  return process.env.NOWPAYMENTS_SANDBOX === "true" ? SANDBOX_BASE : API_BASE;
}

export const PLANS = {
  pro_monthly: { price: 9.99, currency: "usd", days: 30, label: "WorthASlab Pro — Monthly" },
  pro_yearly: { price: 99.0, currency: "usd", days: 365, label: "WorthASlab Pro — Yearly" },
} as const;

export type PlanId = keyof typeof PLANS;

export async function createPayment(opts: {
  planId: PlanId;
  userId: string;
  payCurrency?: string; // default "usdt"
}) {
  const plan = PLANS[opts.planId];

  const res = await fetch(`${base()}/payment`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.NOWPAYMENTS_API_KEY as string,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      price_amount: plan.price,
      price_currency: plan.currency,
      pay_currency: (opts.payCurrency || "usdt").toLowerCase(),
      // order_id carries who paid for what; webhook parses it back
      order_id: `${opts.userId}:${opts.planId}:${Date.now()}`,
      order_description: plan.label,
      ipn_callback_url: process.env.NOWPAYMENTS_IPN_CALLBACK_URL,
      success_url: `${process.env.SITE_URL}/account?payment=success`,
      cancel_url: `${process.env.SITE_URL}/pricing?payment=cancelled`,
    }),
  });

  if (!res.ok) {
    throw new Error(`NOWPayments create payment failed: ${res.status} ${await res.text()}`);
  }
  // { payment_id, pay_address, pay_amount, pay_currency, invoice_url, ... }
  return res.json();
}

// Verify NOWPayments IPN signature.
// Algorithm per NOWPayments docs: sort body keys alphabetically,
// JSON.stringify, HMAC-SHA512 with the IPN secret, compare against
// the x-nowpayments-sig header.
export function verifyIpnSignature(
  payload: Record<string, unknown>,
  signature: string
): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET as string;
  const sorted = JSON.stringify(payload, Object.keys(payload).sort());
  const hmac = crypto.createHmac("sha512", secret).update(sorted).digest("hex");
  if (hmac.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

export async function getPaymentStatus(paymentId: string) {
  const res = await fetch(`${base()}/payment/${paymentId}`, {
    headers: { "x-api-key": process.env.NOWPAYMENTS_API_KEY as string },
  });
  if (!res.ok) {
    throw new Error(`NOWPayments status check failed: ${res.status}`);
  }
  // { payment_status: "waiting" | "confirming" | "finished" | "failed" | "expired" | ... }
  return res.json();
}
