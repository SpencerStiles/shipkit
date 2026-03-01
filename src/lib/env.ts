/**
 * env.ts — Centralized environment variable validation.
 *
 * Validates all required env vars at startup using Zod. Import `env` from
 * here instead of accessing `process.env` directly in application code so
 * misconfigured deployments fail fast with a clear error message.
 */

import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_PRO_PRICE_ID: z.string().min(1),
  STRIPE_ENTERPRISE_PRICE_ID: z.string().min(1),
  RESEND_API_KEY: z.string().optional(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type Env = z.infer<typeof schema>;

// Parse once — throws with a descriptive ZodError if any variable is missing
// or malformed. The error surfaces immediately at module load time, before any
// request is served.
export const env: Env = schema.parse(process.env);
