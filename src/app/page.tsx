import Link from 'next/link';

const features = [
  { title: 'OAuth Auth', desc: 'GitHub and Google sign-in with NextAuth.js. Teams auto-provisioned on first login.' },
  { title: 'AI Proxy + Metering', desc: 'Route all AI requests through your server. Track token usage per-team, enforce quotas.' },
  { title: 'Stripe Billing', desc: 'Checkout sessions, webhook handling, subscription lifecycle. Pro and Enterprise plans.' },
  { title: 'API Key Management', desc: 'Generate, revoke, and audit API keys. Per-key usage tracking with expiry support.' },
  { title: 'Usage Dashboard', desc: 'Token counts, model breakdown, cost estimates. Real data from your Prisma database.' },
  { title: 'Production Hardened', desc: 'Zod env validation, rate limiting, JSON logging, CSP headers. Ship with confidence.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]" style={{ backgroundImage: 'radial-gradient(circle, #2d2d35 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      {/* Nav */}
      <header className="border-b border-[#2d2d35] bg-[#09090b]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="font-['Syne',sans-serif] text-lg font-bold tracking-tight">
            Ship<span className="text-[#22d3ee]">Kit</span>
          </span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-[#a1a1aa] hover:text-[#fafafa] transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="rounded-md bg-[#22d3ee] px-4 py-1.5 text-sm font-semibold text-[#09090b] hover:bg-[#67e8f9] transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-32 pb-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2d2d35] bg-[#111114] px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]" />
          <span className="font-mono text-xs text-[#a1a1aa]">v1.0 — production ready</span>
        </div>
        <h1 className="font-['Syne',sans-serif] text-6xl font-bold tracking-tight text-[#fafafa] leading-[1.05]">
          Ship AI SaaS<br />
          <span className="text-[#22d3ee]">in days.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-[#a1a1aa] text-lg leading-relaxed">
          Next.js 14 starter with auth, Stripe billing, AI token metering, and a full dashboard. Skip the boilerplate, build the product.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/login" className="rounded-md bg-[#22d3ee] px-6 py-2.5 text-sm font-semibold text-[#09090b] hover:bg-[#67e8f9] transition-colors">
            Start Building
          </Link>
          <a href="https://github.com/SpencerStiles/shipkit" className="rounded-md border border-[#2d2d35] px-6 py-2.5 text-sm font-medium text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#52525b] transition-colors">
            View on GitHub &rarr;
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#2d2d35] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-['Syne',sans-serif] text-center text-3xl font-bold text-[#fafafa] mb-3">
            Everything included
          </h2>
          <p className="text-center text-[#71717a] mb-14">No glue code. No tutorials. Just ship.</p>
          <div className="grid grid-cols-1 gap-px md:grid-cols-3 border border-[#2d2d35] rounded-lg overflow-hidden">
            {features.map((f, i) => (
              <div key={f.title} className="bg-[#111114] p-6 hover:bg-[#1e1e24] transition-colors">
                <div className="font-mono text-xs text-[#22d3ee] mb-3">0{i + 1}</div>
                <h3 className="font-['Syne',sans-serif] font-semibold text-[#fafafa] mb-2">{f.title}</h3>
                <p className="text-sm text-[#71717a] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="border-t border-[#2d2d35] py-20 text-center">
        <h2 className="font-['Syne',sans-serif] text-4xl font-bold mb-4">Ready to ship?</h2>
        <p className="text-[#a1a1aa] mb-8">Clone, configure, deploy. Your AI SaaS is live before lunch.</p>
        <Link href="/login" className="rounded-md bg-[#22d3ee] px-8 py-3 text-sm font-semibold text-[#09090b] hover:bg-[#67e8f9] transition-colors">
          Get Started Free
        </Link>
      </section>

      <footer className="border-t border-[#2d2d35] py-8 text-center">
        <span className="font-mono text-xs text-[#52525b]">ShipKit &middot; Built with Next.js 14 &middot; &copy; 2026</span>
      </footer>
    </div>
  );
}
