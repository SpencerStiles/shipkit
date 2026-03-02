import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.teamId) redirect('/login');

  const teamId = session.user.teamId;

  // Fetch all stats in parallel
  let team, totalKeys, activeKeys, usageSummary;
  try {
    [team, totalKeys, activeKeys, usageSummary] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        select: {
          plan: true,
          tokenLimit: true,
          tokensUsed: true,
          periodStart: true,
        },
      }),
      prisma.apiKey.count({
        where: { teamId },
      }),
      prisma.apiKey.count({
        where: { teamId, revoked: false },
      }),
      prisma.usageRecord.aggregate({
        where: { teamId },
        _count: { id: true },
        _sum: { totalTokens: true },
      }),
    ]);
  } catch (err) {
    logger.error('Dashboard page data fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err; // surfaces to nearest error.tsx boundary
  }

  const plan = team?.plan ?? 'free';
  const tokenLimit = team?.tokenLimit ?? 10_000;
  const tokensUsed = team?.tokensUsed ?? 0;
  const usageRecordCount = usageSummary._count.id;
  const totalTokensAllTime = usageSummary._sum.totalTokens ?? 0;

  const usagePct = tokenLimit > 0 ? Math.min((tokensUsed / tokenLimit) * 100, 100) : 0;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#fafafa]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#71717a]">
          Overview of your AI usage and billing for the current period.
        </p>
      </div>

      {/* Plan badge */}
      <div className="rounded-md border border-[#2d2d35] bg-[#111114] p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#a1a1aa]">Current Plan</p>
          <p className="text-lg font-semibold text-[#22d3ee]">{planLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#a1a1aa]">Token Budget</p>
          <p className="text-sm font-medium text-[#fafafa]">
            {tokensUsed.toLocaleString()} / {tokenLimit.toLocaleString()}
          </p>
          <div className="mt-1 h-2 w-40 rounded-full bg-[#1e1e24]">
            <div
              className="h-2 rounded-full bg-[#22d3ee]"
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-[#2d2d35] bg-[#111114] p-4">
          <p className="text-sm font-medium text-[#a1a1aa]">Total API Keys</p>
          <p className="mt-1 text-2xl font-semibold text-[#fafafa]">
            {totalKeys.toLocaleString()}
          </p>
        </div>
        <div className="rounded-md border border-[#2d2d35] bg-[#111114] p-4">
          <p className="text-sm font-medium text-[#a1a1aa]">Active API Keys</p>
          <p className="mt-1 text-2xl font-semibold text-[#fafafa]">
            {activeKeys.toLocaleString()}
          </p>
        </div>
        <div className="rounded-md border border-[#2d2d35] bg-[#111114] p-4">
          <p className="text-sm font-medium text-[#a1a1aa]">Usage Records</p>
          <p className="mt-1 text-2xl font-semibold text-[#fafafa]">
            {usageRecordCount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-md border border-[#2d2d35] bg-[#111114] p-4">
          <p className="text-sm font-medium text-[#a1a1aa]">Total Tokens Used</p>
          <p className="mt-1 text-2xl font-semibold text-[#fafafa]">
            {totalTokensAllTime.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Quick start */}
      <div className="rounded-md border border-[#2d2d35] bg-[#111114] p-6">
        <h2 className="text-lg font-semibold text-[#fafafa]">Quick Start</h2>
        <p className="mt-1 text-sm text-[#71717a]">
          Make your first API call in seconds.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-[#09090b] border border-[#2d2d35] p-4 text-sm text-[#a1a1aa] font-mono">
{`curl -X POST https://your-app.com/api/ai/chat \\
  -H "Authorization: Bearer sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`}
        </pre>
      </div>
    </div>
  );
}
