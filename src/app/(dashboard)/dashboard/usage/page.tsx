import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Default to 30-day window when no searchParam is provided
const PERIOD_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

interface Props {
  searchParams: { period?: string };
}

export default async function UsagePage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.teamId) redirect('/login');

  const teamId = session.user.teamId;
  const periodKey = (searchParams.period ?? '30d') as keyof typeof PERIOD_DAYS;
  const days = PERIOD_DAYS[periodKey] ?? 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let records, summary;
  try {
    [records, summary] = await Promise.all([
      prisma.usageRecord.findMany({
        where: { teamId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          model: true,
          totalTokens: true,
          promptTokens: true,
          completionTokens: true,
          estimatedCostCents: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.usageRecord.aggregate({
        where: { teamId, createdAt: { gte: since } },
        _count: { id: true },
        _sum: {
          totalTokens: true,
          estimatedCostCents: true,
        },
      }),
    ]);
  } catch (err) {
    logger.error('Dashboard page data fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err; // surfaces to nearest error.tsx boundary
  }

  const totalTokens = summary._sum.totalTokens ?? 0;
  const totalCalls = summary._count.id;
  const totalCostCents = summary._sum.estimatedCostCents ?? 0;
  const totalCostDollars = (totalCostCents / 100).toFixed(2);

  const periods = ['7d', '30d', '90d'] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usage</h1>
          <p className="mt-1 text-sm text-gray-500">
            Detailed token usage and cost breakdown by model.
          </p>
        </div>
        {/* Period selector — links so the server re-fetches with the right window */}
        <div className="flex gap-1 rounded-lg border bg-white p-1">
          {periods.map((p) => (
            <a
              key={p}
              href={`?period=${p}`}
              className={`rounded-md px-3 py-1 text-sm ${
                periodKey === p
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-medium text-gray-500">Total Tokens</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {totalTokens.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-medium text-gray-500">Total Calls</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {totalCalls.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-medium text-gray-500">Est. Cost</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            ${totalCostDollars}
          </p>
        </div>
      </div>

      {/* Usage table */}
      <div className="rounded-lg border bg-white">
        {records.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No usage records for this period.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-gray-500">
                <th className="p-4">Date</th>
                <th className="p-4">Model</th>
                <th className="p-4 text-right">Tokens</th>
                <th className="p-4 text-right">Est. Cost</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-b last:border-0 text-sm">
                  <td className="p-4 text-gray-900">
                    {row.createdAt.toISOString().split('T')[0]}
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {row.model}
                    </span>
                  </td>
                  <td className="p-4 text-right text-gray-600">
                    {row.totalTokens.toLocaleString()}
                  </td>
                  <td className="p-4 text-right font-medium text-gray-900">
                    ${(row.estimatedCostCents / 100).toFixed(4)}
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
