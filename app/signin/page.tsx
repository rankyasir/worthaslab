"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase-client";

function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();
  const next = params.get("next") || "/account";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error("Auth is not connected yet.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setBusy(false);
    }
  }

  async function google() {
    setError("");
    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error("Auth is not connected yet.");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed.");
    }
  }

  return (
    <div className="relative z-10 max-w-md mx-auto px-5 py-16 md:py-24">
      <h1 className="text-3xl font-extrabold tracking-tight text-center mb-2">Welcome back</h1>
      <p className="text-muted text-center text-sm mb-8">Sign in to your WorthASlab account.</p>

      {!configured && (
        <div className="bg-yellow-400/10 border border-yellow-400/40 text-yellow-200 text-sm rounded-xl p-4 mb-6">
          Auth activates once the database is connected (see DEPLOY.md). The form below is a live preview.
        </div>
      )}

      <div className="bg-surface border border-line rounded-2xl p-8">
        <button onClick={google} className="btn-ghost w-full mb-5 flex items-center justify-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5.2c1.6 0 3.1.6 4.2 1.6l3.1-3.1C17.4 1.9 14.9 1 12 1 7.7 1 3.9 3.5 2 7.1l3.6 2.8C6.5 7.2 9 5.2 12 5.2z"/><path fill="#4285F4" d="M23 12.3c0-.9-.1-1.5-.2-2.3H12v4.5h6.3c-.3 1.4-1.1 2.6-2.3 3.4l3.5 2.7c2-1.9 3.5-4.7 3.5-8.3z"/><path fill="#FBBC05" d="M5.6 14.1c-.3-.9-.4-1.4-.4-2.1s.2-1.5.5-2.1L2 7.1C.8 9.3 0 10.6 0 12s.7 3.4 2 5.4l3.6-3.3z"/><path fill="#34A853" d="M12 23c3.2 0 5.9-1.1 7.9-2.9l-3.5-2.7c-1 .7-2.3 1.1-4.4 1.1-3 0-5.5-2-6.4-4.7L2 17.1C3.9 20.6 7.7 23 12 23z"/></svg>
          Continue with Google
        </button>
        <div className="flex items-center gap-3 text-xs text-muted mb-5">
          <span className="flex-1 border-t border-line" /> or <span className="flex-1 border-t border-line" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input type="email" required className="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required className="field" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={busy} className="btn-accent w-full disabled:opacity-60">
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="text-center text-sm text-muted mt-6">
          No account? <Link href="/signup" className="text-accent font-semibold">Create one free</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div className="relative z-10 max-w-md mx-auto px-5 py-24 text-center text-muted">Loading…</div>}>
      <SignInInner />
    </Suspense>
  );
}
