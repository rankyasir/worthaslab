"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase-client";

function SlabMark() {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-accent/50 bg-accent/10">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="6" y="3" width="12" height="18" rx="2" stroke="#00ff88" strokeWidth="1.8" />
        <rect x="9" y="6" width="6" height="6" rx="1" stroke="#00ff88" strokeWidth="1.4" />
        <line x1="9" y1="15.5" x2="15" y2="15.5" stroke="#00ff88" strokeWidth="1.4" />
        <line x1="9" y1="18" x2="13" y2="18" stroke="#00ff88" strokeWidth="1.4" opacity="0.6" />
      </svg>
    </span>
  );
}

export default function Nav() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="relative z-20 border-b border-line/70 bg-ink/80 backdrop-blur-md sticky top-0">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <SlabMark />
          <span className="font-extrabold tracking-tight text-lg">
            Worth<span className="text-accent">A</span>Slab
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted">
          <Link href="/#calculator" className="hover:text-white transition-colors">Calculator</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
        </nav>
        <div className="flex items-center gap-3">
          {email ? (
            <Link href="/account" className="btn-ghost !py-2 !px-4 text-sm">
              Account
            </Link>
          ) : (
            <>
              <Link href="/signin" className="text-sm text-muted hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="btn-accent !py-2 !px-4 text-sm">
                Start Free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
