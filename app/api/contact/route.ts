import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-server";

// POST /api/contact — { name, email, message }. Saved to contact_messages.
// Requires Supabase (service role). Honest 503 when not configured yet.
export async function POST(req: Request) {
  const { name, email, message } = await req.json().catch(() => ({}));

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email and message are required." }, { status: 400 });
  }
  if (String(message).length > 5000) {
    return NextResponse.json({ error: "Message is too long (max 5000 chars)." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Contact inbox activates once the database is connected. Email us directly instead." },
      { status: 503 }
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("contact_messages").insert({
      name: String(name).slice(0, 120),
      email: String(email).slice(0, 200),
      message: String(message).slice(0, 5000),
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("contact insert failed:", e);
    return NextResponse.json({ error: "Could not save your message. Please try again." }, { status: 500 });
  }
}
