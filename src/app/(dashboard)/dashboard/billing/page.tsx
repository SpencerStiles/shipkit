'use client';

import { useState } from 'react';

type PlanId = 'free' | 'pro' | 'enterprise';

const plans: Array<{
  id: PlanId;
  name: string;
  price: string;
  tokens: string;
  features: string[];
}> = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    tokens: '10K',
    features: ['10K tokens/month', '1 API key', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    tokens: '500K',
    features: ['500K tokens/month', '10 API keys', 'Priority support', 'All models'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$199',
    tokens: '5M',
    features: ['5M tokens/month', 'Unlimited API keys', 'Dedicated support', 'Custom models', 'SSO'],
  },
];

export default function BillingPage() {
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(planId: PlanId) {
    if (planId === 'free') return;
    setLoading(planId);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to start checkout');
      }
      const { url } = await res.json() as { url: string };
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#fafafa]">Billing</h1>
        <p className="mt-1 text-sm text-[#71717a]">
          Manage your subscription and payment method.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-[#7f1d1d] bg-[#1c0a0a] p-3 text-sm text-[#fca5a5]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="rounded-md border border-[#2d2d35] bg-[#111114] p-6"
          >
            <h3 className="text-lg font-semibold text-[#fafafa]">{plan.name}</h3>
            <p className="mt-2">
              <span className="text-3xl font-bold text-[#fafafa]">{plan.price}</span>
              <span className="text-sm text-[#71717a]">/month</span>
            </p>
            <p className="mt-1 text-sm text-[#71717a]">{plan.tokens} tokens/month</p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-[#a1a1aa]">
                  <span className="text-[#22d3ee]">&#10003;</span>
                  {feature}
                </li>
              ))}
            </ul>
            {plan.id !== 'free' && (
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading !== null}
                className="mt-6 w-full rounded-md bg-[#22d3ee] px-4 py-2 text-sm font-semibold text-[#09090b] hover:bg-[#67e8f9] disabled:opacity-50 transition-colors"
              >
                {loading === plan.id ? 'Redirecting\u2026' : `Upgrade to ${plan.name}`}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-md border border-[#2d2d35] bg-[#111114] p-6">
        <h2 className="text-lg font-semibold text-[#fafafa]">Payment Method</h2>
        <p className="mt-1 text-sm text-[#71717a]">
          Payment is managed securely through Stripe. Use the upgrade buttons above to subscribe or change plans.
        </p>
      </div>
    </div>
  );
}
