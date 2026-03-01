import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import ApiKeysClient from './client';

export default async function ApiKeysPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.teamId) redirect('/login');

  const teamId = session.user.teamId;

  let apiKeys;
  try {
    apiKeys = await prisma.apiKey.findMany({
      where: { teamId, revoked: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
        lastUsed: true,
      },
    });
  } catch (err) {
    logger.error('Dashboard page data fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err; // surfaces to nearest error.tsx boundary
  }

  const serialized = apiKeys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    createdAt: k.createdAt.toISOString().split('T')[0],
    lastUsed: k.lastUsed ? k.lastUsed.toISOString().split('T')[0] : null,
  }));

  return <ApiKeysClient initialKeys={serialized} />;
}
