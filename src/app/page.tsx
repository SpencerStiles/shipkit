import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-bold text-brand-700">ShipKit</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Ship AI-powered SaaS
          <br />
          <span className="text-brand-600">in days, not months</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-gray-500">
          Production-ready Next.js starter with auth, Stripe billing, AI proxy
          with token metering, and a beautiful dashboard. Everything you need to
          launch an AI SaaS product.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700"
          >
            Start Building
          </Link>
          <a
            href="https://github.com"
            className="rounded-lg border px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Everything you need
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                title: 'Auth & Teams',
                desc: 'NextAuth.js with GitHub/Google OAuth, team management, and role-based access.',
              },
              {
                title: 'AI Proxy + Metering',
                desc: 'Route AI requests through your API, track token usage per-team, enforce quotas automatically.',
              },
              {
                title: 'Stripe Billing',
                desc: 'Usage-based billing with Stripe. Free, Pro, and Enterprise plans out of the box.',
              },
              {
                title: 'API Keys',
                desc: 'Generate and manage API keys for programmatic access. Revoke, expire, and track usage.',
              },
              {
                title: 'Usage Dashboard',
                desc: 'Beautiful dashboard showing token usage, costs, and API call history by model.',
              },
              {
                title: 'Production Ready',
                desc: 'Prisma ORM, TypeScript, Tailwind CSS, and best practices baked in from day one.',
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-lg border bg-white p-6">
                <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-gray-500">
        ShipKit — AI SaaS Starter
      </footer>
    </div>
  );
}
