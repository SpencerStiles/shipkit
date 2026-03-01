/**
 * GET  /api/api-keys — List API keys for the authenticated team
 * POST /api/api-keys — Create a new API key
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateApiKey } from '@/lib/api-key';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    const keys = await prisma.apiKey.findMany({
      where: { teamId: session.user.teamId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        revoked: true,
        createdAt: true,
        lastUsed: true,
        expiresAt: true,
      },
    });
    return NextResponse.json({ keys });
  } catch (err) {
    logger.error('Failed to list API keys', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Rate limit: 20 key creations per minute per user
    const rl = rateLimit(`apikeys:${session.user.id}`, { limit: 20, windowMs: 60_000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON', code: 'BAD_REQUEST' },
        { status: 400 },
      );
    }
    const parsed = createKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Name is required (max 100 chars)', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }
    const { key, prefix } = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        name: parsed.data.name,
        key,
        prefix,
        teamId: session.user.teamId,
        userId: session.user.id,
      },
    });
    logger.info('API key created', { teamId: session.user.teamId, apiKeyId: apiKey.id });
    // Return the raw key once — it will not be shown again
    return NextResponse.json(
      { id: apiKey.id, name: apiKey.name, key, prefix, createdAt: apiKey.createdAt },
      { status: 201 },
    );
  } catch (err) {
    logger.error('Failed to create API key', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
