import type { MetadataRoute } from "next";
import { getPostMetas } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/pricing", "/about", "/contact", "/blog", "/signin", "/signup"];
  const now = new Date();

  const routes: MetadataRoute.Sitemap = staticPages.map((p) => ({
    url: `${SITE_URL}${p || "/"}`,
    lastModified: now,
    changeFrequency: p === "" ? "daily" : "weekly",
    priority: p === "" ? 1 : p === "/blog" ? 0.9 : 0.7,
  }));

  for (const post of getPostMetas()) {
    routes.push({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  return routes;
}
