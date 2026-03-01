# ShipKit Production Hardening Plan

## Scope
- Error handling (try-catch) in server components and lib utilities
- Rate limiting on API routes (in-memory, upgradeable to Redis)
- CI/CD via GitHub Actions (type-check + build)
- Security headers in next.config.js
- Create missing `/api/api-keys` route (broken feature discovered in audit)

## What's Already Done (skip these)
- ✅ Stripe webhook signature verification — fully implemented in `src/app/api/webhooks/stripe/route.ts`
- ✅ Error handling in API routes — `POST /api/ai/chat` and `POST /api/webhooks/stripe` both have complete try-catch coverage
- ✅ Structured logging — `src/lib/logger.ts` exists and is used
- ✅ Zod env validation — `src/lib/env.ts` validates at startup

## Existing Patterns to Follow

### Error response shape (from `/api/ai/chat/route.ts`)
```ts
return NextResponse.json(
  { error: 'Human-readable message', code: 'SCREAMING_SNAKE_CASE' },
  { status: 400 },
);
```

### Logging pattern (from `src/lib/logger.ts`)
```ts
logger.error('Description of what failed', { error: err instanceof Error ? err.message : String(err) });
logger.warn('...', { ... });
logger.info('...', { ... });
```

---

## Phase 1: Fix Error Handling Gaps

**Files to modify:**
- `src/lib/api-key.ts` — wrap Prisma call in `validateApiKey` with try-catch
- `src/lib/auth.ts` — wrap `session` callback's `prisma.user.findUnique` with try-catch
- `src/app/(dashboard)/dashboard/page.tsx` — wrap `Promise.all` with try-catch, render error state
- `src/app/(dashboard)/dashboard/usage/page.tsx` — same pattern
- `src/app/(dashboard)/dashboard/api-keys/page.tsx` — same pattern

### 1a. `src/lib/api-key.ts` — validateApiKey

Wrap the `prisma.apiKey.findUnique` call:

```ts
export async function validateApiKey(key: string): Promise<{ ... }> {
  if (!key.startsWith(KEY_PREFIX)) {
    return { valid: false, error: 'Invalid key format' };
  }
  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key },
      include: { team: true },
    });
    // ... rest of validation
  } catch (err) {
    logger.error('Database error validating API key', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { valid: false, error: 'Internal error validating key' };
  }
}
```

### 1b. `src/lib/auth.ts` — session callback

Wrap the `prisma.user.findUnique` in the `session` callback:

```ts
async session({ session, user }) {
  if (session.user) {
    session.user.id = user.id;
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { team: true },
      });
      session.user.teamId = dbUser?.teamId ?? undefined;
      session.user.plan = dbUser?.team?.plan ?? 'free';
    } catch (err) {
      logger.error('Error fetching user in session callback', {
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
      // Return session without team info rather than crashing
    }
  }
  return session;
},
```

### 1c. Dashboard server components

Pattern to apply to `dashboard/page.tsx`, `usage/page.tsx`, `api-keys/page.tsx`:

```ts
try {
  const [a, b, c] = await Promise.all([...]);
  // render with data
} catch (err) {
  logger.error('Dashboard data fetch failed', {
    error: err instanceof Error ? err.message : String(err),
  });
  // render error state (simple: throw to Next.js error boundary is acceptable,
  // or return a <DashboardError /> component)
  throw err; // surfaces to nearest error.tsx
}
```

**Verification:** After changes, `pnpm exec tsc --noEmit` passes. No new TypeScript errors.

---

## Phase 2: Create Missing `/api/api-keys` Route

The `src/app/(dashboard)/dashboard/api-keys/client.tsx` calls:
- `POST /api/api-keys` — create a new key
- `DELETE /api/api-keys/[id]` — revoke a key

Neither route exists. Create them.

**Files to create:**
- `src/app/api/api-keys/route.ts` — GET (list) + POST (create)
- `src/app/api/api-keys/[id]/route.ts` — DELETE (revoke)

### POST /api/api-keys (create)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateApiKey } from '@/lib/api-key';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const parsed = createKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Name is required', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    const { key, prefix } = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        name: parsed.data.name,
        key,               // stored as-is (matches validateApiKey's findUnique pattern)
        prefix,
        teamId: session.user.teamId,
        userId: session.user.id,
      },
    });
    logger.info('API key created', { teamId: session.user.teamId, apiKeyId: apiKey.id });
    // Return the raw key ONCE — never stored in plaintext
    return NextResponse.json({ ...apiKey, key }, { status: 201 });
  } catch (err) {
    logger.error('Failed to create API key', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
```

### DELETE /api/api-keys/[id] (revoke)

```ts
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    // Verify ownership before revoking
    const existing = await prisma.apiKey.findFirst({
      where: { id: params.id, teamId: session.user.teamId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Key not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    await prisma.apiKey.update({
      where: { id: params.id },
      data: { revoked: true },
    });
    logger.info('API key revoked', { teamId: session.user.teamId, apiKeyId: params.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Failed to revoke API key', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
```

**Note on key storage:** Check the Prisma schema first — if `key` field stores the raw key currently, keep that behavior. If it should be hashed, the client.tsx and validateApiKey need to be consistent.

**Verification:** `pnpm exec tsc --noEmit` passes.

---

## Phase 3: Rate Limiting

No rate-limiting package exists in package.json. Install `@upstash/ratelimit` + `@upstash/redis` (Redis-backed, production-grade) OR use a simple in-memory implementation.

**Decision: Use in-memory rate limiter for now** (no new infra required, upgradeable to Redis). Create a small utility.

**File to create:** `src/lib/rate-limit.ts`

```ts
/**
 * Simple in-memory rate limiter using a sliding window.
 * For multi-instance deployments, replace with @upstash/ratelimit + Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  limit: number;       // max requests
  windowMs: number;    // window in milliseconds
}

export function rateLimit(
  key: string,
  config: RateLimitConfig,
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + config.windowMs };
    store.set(key, newEntry);
    return { success: true, remaining: config.limit - 1, resetAt: newEntry.resetAt };
  }

  if (entry.count >= config.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);
```

**Apply to `POST /api/ai/chat`** — rate limit by teamId (50 req/min):

```ts
// At top of POST handler, before auth:
const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
const rl = rateLimit(`chat:${ip}`, { limit: 50, windowMs: 60_000 });
if (!rl.success) {
  return NextResponse.json(
    { error: 'Too many requests', code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
  );
}
```

**Apply to `/api/api-keys`** — rate limit by session user (20 req/min):

Same pattern, key by `session.user.id` after auth resolves.

**Verification:** `pnpm exec tsc --noEmit` passes. Manual test: rapid POST requests return 429 after limit.

---

## Phase 4: Security Headers in next.config.js

**File to modify:** `next.config.js`

Replace the current minimal config:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

**Verification:** `curl -I http://localhost:3000` shows security headers.

---

## Phase 5: CI/CD (GitHub Actions)

**File to create:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  ci:
    name: Type-check & Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: pnpm exec prisma generate

      - name: Type-check
        run: pnpm exec tsc --noEmit

      - name: Build
        run: pnpm build
        env:
          # Stub env vars — must satisfy Zod validators in src/lib/env.ts
          DATABASE_URL: postgresql://user:pass@localhost:5432/db
          NEXTAUTH_SECRET: ci-secret-stub-minimum-32-characters-long
          NEXTAUTH_URL: http://localhost:3000
          GITHUB_CLIENT_ID: stub
          GITHUB_CLIENT_SECRET: stub
          GOOGLE_CLIENT_ID: stub
          GOOGLE_CLIENT_SECRET: stub
          OPENAI_API_KEY: sk-stub000000000000000000000000000000000000000
          STRIPE_SECRET_KEY: sk_test_stub
          STRIPE_WEBHOOK_SECRET: whsec_stub
          STRIPE_PRO_PRICE_ID: price_stub
          STRIPE_ENTERPRISE_PRICE_ID: price_stub
```

**Note:** Check `src/lib/env.ts` for the exact required env var names and add all of them as stubs.

**Verification:** Push to GitHub, workflow runs green.

---

## Execution Order

Run phases in order. After each phase, run `pnpm exec tsc --noEmit` before moving to the next.

1. Phase 1 — Error handling (lowest risk, pure additions)
2. Phase 2 — Missing API routes (medium risk, new files)
3. Phase 3 — Rate limiting (new utility + small additions to routes)
4. Phase 4 — Security headers (next.config.js edit)
5. Phase 5 — CI/CD (new file, no code risk)

## Final Verification

```bash
cd /Users/spencer/Work/shipkit
pnpm exec tsc --noEmit  # must pass with 0 errors
pnpm build              # must succeed
```
