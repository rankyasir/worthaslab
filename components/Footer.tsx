import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-line/70 mt-24">
      <div className="max-w-7xl mx-auto px-5 py-14 grid gap-10 md:grid-cols-4">
        <div>
          <div className="font-extrabold tracking-tight text-lg mb-3">
            Worth<span className="text-accent">A</span>Slab
          </div>
          <p className="text-muted text-sm leading-relaxed">
            Is it worth a slab? Data-backed grading decisions for trading card collectors.
          </p>
        </div>
        <div>
          <div className="text-sm font-bold mb-4 text-white">Product</div>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link href="/#calculator" className="hover:text-accent transition-colors">ROI Calculator</Link></li>
            <li><Link href="/pricing" className="hover:text-accent transition-colors">Pricing</Link></li>
            <li><Link href="/blog" className="hover:text-accent transition-colors">Blog</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-bold mb-4 text-white">Company</div>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link href="/about" className="hover:text-accent transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-accent transition-colors">Contact Us</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-bold mb-4 text-white">Account</div>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link href="/signin" className="hover:text-accent transition-colors">Sign In</Link></li>
            <li><Link href="/signup" className="hover:text-accent transition-colors">Create Account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line/70">
        <div className="max-w-7xl mx-auto px-5 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted">
          <span>© 2026 WorthASlab. All rights reserved.</span>
          <span>Card prices shown are sample data until live market ingestion launches.</span>
        </div>
      </div>
    </footer>
  );
}
