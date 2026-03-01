import Stripe from 'stripe';
import { env } from './env';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});

/** Plan definitions — maps Stripe price IDs to plan metadata */
export const PLANS = {
  free: {
    name: 'Free',
    tokenLimit: 10_000,
    priceMonthly: 0,
    features: ['10K tokens/month', '1 API key', 'Community support'],
  },
  pro: {
    name: 'Pro',
    tokenLimit: 500_000,
    priceMonthly: 29,
    stripePriceId: env.STRIPE_PRO_PRICE_ID,
    features: [
      '500K tokens/month',
      '10 API keys',
      'Priority support',
      'All models',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    tokenLimit: 5_000_000,
    priceMonthly: 199,
    stripePriceId: env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      '5M tokens/month',
      'Unlimited API keys',
      'Dedicated support',
      'Custom models',
      'SSO',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

/** Token cost per model (per 1M tokens, in cents) */
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 250, output: 1000 },
  'gpt-4o-mini': { input: 15, output: 60 },
  'gpt-3.5-turbo': { input: 50, output: 150 },
  'claude-sonnet-4-20250514': { input: 300, output: 1500 },
  'claude-3-haiku-20240307': { input: 25, output: 125 },
  'text-embedding-3-small': { input: 2, output: 0 },
  'text-embedding-3-large': { input: 13, output: 0 },
};

/** Estimate cost in cents for a given model and token count */
export function estimateCostCents(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const costs = MODEL_COSTS[model] ?? { input: 100, output: 300 };
  return (
    (promptTokens / 1_000_000) * costs.input +
    (completionTokens / 1_000_000) * costs.output
  );
}
