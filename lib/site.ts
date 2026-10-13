// Canonical site URL used for sitemap, robots, canonical tags and OG metadata.
// Set SITE_URL in Vercel env to the real domain (e.g. https://worthaslab.com).
// Falls back to the Vercel deployment URL so previews still emit valid tags.
export const SITE_URL = (process.env.SITE_URL || "https://worthaslab.vercel.app").replace(/\/+$/, "");

export const SITE_NAME = "WorthASlab";
export const SITE_TAGLINE = "Is it worth a slab?";
export const SITE_DESCRIPTION =
  "Type any trading card, see raw price vs PSA 9 vs PSA 10, and get a data-backed verdict: grade it or skip it. Built for Pokémon, sports, MTG and Yu-Gi-Oh! collectors.";
