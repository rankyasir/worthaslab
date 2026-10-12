import ContactForm from "@/components/ContactForm";

export const metadata = {
  title: "Contact Us — WorthASlab",
  description: "Get in touch with the WorthASlab team — support, data corrections, partnerships.",
};

export default function Contact() {
  return (
    <div className="relative z-10 max-w-3xl mx-auto px-5 py-16 md:py-24">
      <div className="text-accent text-xs font-extrabold uppercase tracking-[0.2em] mb-3">Contact Us</div>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Talk to a human</h1>
      <p className="text-muted mb-10 leading-relaxed">
        Support, data corrections, partnership ideas, or just to tell us about the slab that got
        away — we read everything and reply within 2 business days.
      </p>
      <ContactForm />
      <div className="mt-10 grid md:grid-cols-2 gap-4 text-sm">
        <div className="bg-surface border border-line rounded-xl p-5">
          <div className="font-bold mb-1">Data corrections</div>
          <p className="text-muted">Spotted a wrong price or a missing card? Tell us the card + set and we&apos;ll fix it.</p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-5">
          <div className="font-bold mb-1">Partnerships</div>
          <p className="text-muted">Breakers, grading middlemen, hobby shops — let&apos;s talk about working together.</p>
        </div>
      </div>
    </div>
  );
}
