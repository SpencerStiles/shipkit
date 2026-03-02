# ShipKit

**Ship an AI-powered SaaS in days, not months.**

ShipKit is a production-ready Next.js 14 starter with everything you need to launch: auth, Stripe billing, AI proxy with token metering, API key management, and a beautiful dashboard — all wired up and working.

[**Get ShipKit →**](https://cal.com/spencerstiles) | [Live Demo](https://shipkit.spencerstiles.com)

---

## What's Included

| Feature | Details |
|---------|---------|
| **Auth** | NextAuth.js, GitHub + Google OAuth, teams, role-based access |
| **AI Proxy** | Route OpenAI requests through your API with automatic token metering |
| **Stripe Billing** | Usage-based plans (Free/Pro/Enterprise), webhooks, subscription lifecycle |
| **API Keys** | Generate, revoke, and track usage per key |
| **Usage Dashboard** | Token usage, costs, and call history by model |
| **Landing Page** | Marketing page with feature grid, pricing table, and CTA |
| **Rate Limiting** | In-memory sliding window (Redis-upgradeable) |
| **Security** | CSP headers, CORS, NEXTAUTH_SECRET rotation, input validation |
| **CI/CD** | GitHub Actions: type-check + build on every push |

## Pricing

| | Free | Pro ($29/mo) |
|-|------|-------------|
| Projects | 1 | Unlimited |
| API Keys | 3 | Unlimited |
| Token metering | ✓ | ✓ |
| Team members | 1 | 5 |
| Priority support | — | ✓ |

[**Buy ShipKit — $97 one-time →**](https://cal.com/spencerstiles)

*One-time license includes full source code + 6 months of updates.*

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, Server Actions) |
| Auth | NextAuth.js v4 |
| Database | PostgreSQL via Prisma |
| Billing | Stripe |
| AI | OpenAI API (provider-agnostic proxy) |
| Styling | Tailwind CSS |
| Validation | Zod |
| Email | Resend |
| CI/CD | GitHub Actions |

## Quick Start (Self-Host)

```bash
git clone https://github.com/SpencerStiles/shipkit
cd shipkit
pnpm install
cp .env.example .env.local
# Fill in .env.local
pnpm dev
```

Required environment variables: see `.env.example`.

## What You Ship vs. What You Skip

Without ShipKit, a typical founder spends 2–4 weeks on auth, billing, and boilerplate before writing any product code. ShipKit collapses that to an afternoon.

## Self-Hosting vs. Hosted

- **Self-host:** Clone the repo, fill in `.env`, deploy to Vercel. Free forever.
- **Hosted (coming soon):** Managed version with zero config. $29/mo.

## License

MIT for personal/OSS projects. Commercial license required for SaaS products — [contact us](https://cal.com/spencerstiles).
