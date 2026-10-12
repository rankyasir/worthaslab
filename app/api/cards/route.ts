import { NextResponse } from "next/server";
import { searchCards } from "@/lib/data";

// GET /api/cards?q=charizard — search the card catalog (demo data until Supabase is wired).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const cards = await searchCards(q);
  return NextResponse.json({ cards });
}
