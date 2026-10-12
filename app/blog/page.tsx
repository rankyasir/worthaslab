import Link from "next/link";
import { getPostMetas } from "@/lib/blog";

export const metadata = {
  title: "Blog — WorthASlab",
  description: "Grading guides, ROI math, and tier breakdowns for trading card collectors.",
};

export default function Blog() {
  const posts = getPostMetas();
  return (
    <div className="relative z-10 max-w-4xl mx-auto px-5 py-16 md:py-24">
      <div className="text-accent text-xs font-extrabold uppercase tracking-[0.2em] mb-3">Blog</div>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Grading, decoded</h1>
      <p className="text-muted mb-12 leading-relaxed">
        Costs, tiers, break-even math and card-by-card verdicts — written for collectors, not algorithms.
      </p>
      <div className="grid gap-5">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="bg-surface border border-line rounded-2xl p-6 md:p-8 card-glow block">
            <div className="text-xs text-muted mb-2 font-mono">
              {p.date} · {p.minutes} min read
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-2">{p.title}</h2>
            <p className="text-muted text-sm leading-relaxed">{p.excerpt}</p>
            <span className="inline-block mt-4 text-accent text-sm font-bold">Read guide →</span>
          </Link>
        ))}
        {posts.length === 0 && (
          <p className="text-muted">No articles yet — check back soon.</p>
        )}
      </div>
    </div>
  );
}
