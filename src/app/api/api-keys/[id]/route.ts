/**
 * DELETE /api/api-keys/[id] — Revoke an API key
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
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
