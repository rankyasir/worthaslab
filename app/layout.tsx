import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "WorthASlab — Is it worth a slab?",
  description:
    "Type any trading card, see raw price vs PSA 9 vs PSA 10, and get a data-backed verdict: grade it or skip it. Built for Pokémon, sports, MTG and Yu-Gi-Oh! collectors.",
  keywords: "psa grading worth it, should i grade my cards, psa grading cost, card grading roi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-ink text-white font-sans antialiased">
        <div className="bg-grid" aria-hidden="true" />
        <Nav />
        <main className="relative z-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
