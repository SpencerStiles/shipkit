'use client';

const plans = [
  {
    name: 'Free',
    price: '$0',
    tokens: '10K',
    features: ['10K tokens/month', '1 API key', 'Community support'],
    current: false,
  },
  {
    name: 'Pro',
    price: '$29',
    tokens: '500K',
    features: ['500K tokens/month', '10 API keys', 'Priority support', 'All models'],
    current: true,
  },
  {
    name: 'Enterprise',
    price: '$199',
    tokens: '5M',
    features: ['5M tokens/month', 'Unlimited API keys', 'Dedicated support', 'Custom models', 'SSO'],
    current: false,
  },
];

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription and payment method.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-lg border p-6 ${
              plan.current
                ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                : 'bg-white'
            }`}
          >
            <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
            <p className="mt-2">
              <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
              <span className="text-sm text-gray-500">/month</span>
            </p>
            <p className="mt-1 text-sm text-gray-500">{plan.tokens} tokens/month</p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              className={`mt-6 w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                plan.current
                  ? 'bg-brand-600 text-white cursor-default'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              disabled={plan.current}
            >
              {plan.current ? 'Current Plan' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
        <p className="mt-1 text-sm text-gray-500">
          Managed securely through Stripe.
        </p>
        <div className="mt-4 flex items-center gap-3 rounded-lg border p-3">
          <div className="flex h-8 w-12 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-500">
            VISA
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">•••• 4242</p>
            <p className="text-xs text-gray-500">Expires 12/27</p>
          </div>
          <button className="ml-auto text-sm text-brand-600 hover:text-brand-700">
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
