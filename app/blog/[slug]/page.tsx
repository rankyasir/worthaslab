import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPostMetas } from "@/lib/blog";

export async function generateStaticParams() {
  return getPostMetas().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} — WorthASlab Blog`,
    description: post.excerpt,
    keywords: post.keywords,
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  return (
    <article className="relative z-10 max-w-3xl mx-auto px-5 py-14 md:py-20">
      <Link href="/blog" className="text-sm text-muted hover:text-accent transition-colors">← All articles</Link>
      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mt-6 mb-4 leading-tight">{post.title}</h1>
      <div className="text-sm text-muted font-mono mb-10">
        {post.date} · {post.minutes} min read
      </div>
      <div className="prose-dark" dangerouslySetInnerHTML={{ __html: post.html }} />
      <div className="mt-14 bg-surface border border-accent/30 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-extrabold mb-2">Run the math on your own cards</h2>
        <p className="text-muted text-sm mb-6">Five free grading calculations a month. No card required.</p>
        <Link href="/#calculator" className="btn-accent inline-block">Is it worth a slab?</Link>
      </div>
    </article>
  );
}
