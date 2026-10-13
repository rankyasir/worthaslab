import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  keywords: string;
  minutes: number;
}

export interface Post extends PostMeta {
  html: string;
}

function readSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .sort()
    .reverse();
}

export function getPostMetas(): PostMeta[] {
  return readSlugs().map((slug) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, `${slug}.md`), "utf8");
    const { data, content } = matter(raw);
    const words = content.split(/\s+/).length;
    return {
      slug,
      title: String(data.title ?? slug),
      date: String(data.date ?? ""),
      excerpt: String(data.excerpt ?? ""),
      keywords: String(data.keywords ?? ""),
      minutes: Math.max(4, Math.round(words / 200)),
    };
  });
}

export function getPost(slug: string): Post | null {
  const file = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  const words = content.split(/\s+/).length;
  const html = marked.parse(content, { async: false }) as string;
  return {
    slug,
    title: String(data.title ?? slug),
    date: String(data.date ?? ""),
    excerpt: String(data.excerpt ?? ""),
    keywords: String(data.keywords ?? ""),
    minutes: Math.max(4, Math.round(words / 200)),
    html,
  };
}

// Related posts for internal linking: score by shared keyword tokens,
// fall back to recency. Powers the "Keep reading" section on article pages.
export function getRelatedPosts(slug: string, count = 3): PostMeta[] {
  const all = getPostMetas().filter((p) => p.slug !== slug);
  const current = getPostMetas().find((p) => p.slug === slug);
  const tokens = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2)
    );
  const base = tokens(`${current?.keywords ?? ""} ${current?.title ?? ""}`);
  const scored = all.map((p) => {
    const t = tokens(`${p.keywords} ${p.title}`);
    let score = 0;
    base.forEach((w) => {
      if (t.has(w)) score++;
    });
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score || (b.p.date > a.p.date ? 1 : -1));
  return scored.slice(0, count).map((s) => s.p);
}
