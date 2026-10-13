import { NextResponse } from "next/server";
import { runNightlyIngest, runBackfillIngest } from "@/lib/ingestion";

// GET /api/cron/ingest — nightly price ingestion.
// Protected by CRON_SECRET (Vercel Cron sends it as Authorization: Bearer <secret>).
// Schedule is configured in vercel.json (free tier: once daily).
// Add &mode=backfill for a one-time accelerated catalog sync (safe to re-run).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    const url = new URL(req.url);
    const q = url.searchParams.get("secret") || "";
    if (auth !== `Bearer ${secret}` && q !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const url = new URL(req.url);
    const summary =
      url.searchParams.get("mode") === "backfill" ? await runBackfillIngest() : await runNightlyIngest();
    return NextResponse.json(summary);
  } catch (e) {
    console.error("nightly ingest failed:", e);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
