/**
 * POST /api/ai/chat — Metered AI chat completion endpoint.
 *
 * Authenticates via API key (Bearer token) or session,
 * validates the request body with Zod, proxies to OpenAI,
 * and tracks token usage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateApiKey } from '@/lib/api-key';
import { proxyChatCompletion } from '@/lib/ai-proxy';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function', 'tool']),
  content: z.string().min(1),
});

const chatRequestSchema = z.object({
  model: z.string().min(1).optional(),
  messages: z
    .array(messageSchema)
    .min(1, 'At least one message is required')
    .max(100, 'Too many messages — maximum 100'),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(32_768).optional(),
  stream: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // Rate limit: 60 requests per minute per IP
    // -----------------------------------------------------------------------
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = rateLimit(`chat:${ip}`, { limit: 60, windowMs: 60_000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }

    // -----------------------------------------------------------------------
    // Authentication — API key (Bearer) or session
    // -----------------------------------------------------------------------
    let teamId: string | undefined;
    let apiKeyId: string | null = null;

    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const key = authHeader.slice(7);
      const validation = await validateApiKey(key);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error ?? 'Invalid API key', code: 'UNAUTHORIZED' },
          { status: 401 },
        );
      }
      teamId = validation.teamId;
      apiKeyId = validation.apiKeyId ?? null;
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'UNAUTHORIZED' },
          { status: 401 },
        );
      }
      const user = await prisma.user.findUnique({
        where: { id: (session.user as { id: string }).id },
        select: { teamId: true },
      });
      teamId = user?.teamId ?? undefined;
    }

    if (!teamId) {
      return NextResponse.json(
        { error: 'No team associated with this account', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    // -----------------------------------------------------------------------
    // Input validation
    // -----------------------------------------------------------------------
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON', code: 'BAD_REQUEST' },
        { status: 400 },
      );
    }

    const parsed = chatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const message = firstIssue
        ? `${firstIssue.path.join('.') || 'body'}: ${firstIssue.message}`
        : 'Invalid request body';
      return NextResponse.json(
        { error: message, code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    const body = parsed.data;

    // -----------------------------------------------------------------------
    // Proxy to AI provider
    // -----------------------------------------------------------------------
    const result = await proxyChatCompletion(teamId, apiKeyId, body);

    if ('code' in result) {
      const status = result.code === 'QUOTA_EXCEEDED' ? 429 : 500;
      logger.warn('AI proxy returned error', {
        code: result.code,
        teamId,
        status,
      });
      return NextResponse.json(result, { status });
    }

    logger.info('AI chat completion served', {
      teamId,
      model: result.model,
      totalTokens: result.usage.total_tokens,
    });

    return NextResponse.json(result);
  } catch (err) {
    logger.error('Unexpected error in AI chat route', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
