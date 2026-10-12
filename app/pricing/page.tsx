import PricingCards from "@/components/PricingCards";
import Faq from "@/components/Faq";

export const metadata = {
  title: "Pricing — WorthASlab",
  description: "Free: 5 grading calculations a month. Pro: unlimited, $9.99/mo or $99/yr, paid in crypto.",
};

export default function Pricing() {
  return (
    <div className="relative z-10 max-w-7xl mx-auto px-5 py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="text-accent text-xs font-extrabold uppercase tracking-[0.2em] mb-3">Pricing</div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Free to start. Pro when you&apos;re serious.</h1>
        <p className="text-muted mt-4 leading-relaxed">
          One avoided bad submission pays for months of Pro. Checkout is in crypto —
          BTC, ETH, or USDT — so collectors anywhere can subscribe.
        </p>
      </div>
      <PricingCards />
      <div className="max-w-3xl mx-auto mt-20">
        <h2 className="text-2xl font-extrabold text-center mb-8">Pricing questions</h2>
        <Faq />
      </div>
    </div>
  );
}
