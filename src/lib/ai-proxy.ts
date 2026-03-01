/**
 * AI Proxy — routes requests to OpenAI/Anthropic with token metering.
 *
 * This is the core billing engine: every AI call goes through here,
 * gets metered, and usage is tracked against the team's plan limits.
 */

import OpenAI from 'openai';
import { prisma } from './db';
import { estimateCostCents } from './stripe';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

export interface AIChatRequest {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface AIChatResponse {
  id: string;
  model: string;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  estimatedCostCents: number;
}

export interface AIProxyError {
  error: string;
  code: 'RATE_LIMIT' | 'QUOTA_EXCEEDED' | 'INVALID_KEY' | 'MODEL_ERROR' | 'INTERNAL';
}

/**
 * Check if a team has remaining token budget for the current period.
 */
export async function checkQuota(teamId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
}> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { tokenLimit: true, tokensUsed: true },
  });

  if (!team) {
    return { allowed: false, remaining: 0, limit: 0, used: 0 };
  }

  const remaining = Math.max(0, team.tokenLimit - team.tokensUsed);
  return {
    allowed: remaining > 0,
    remaining,
    limit: team.tokenLimit,
    used: team.tokensUsed,
  };
}

/**
 * Proxy an AI chat request through OpenAI with full metering.
 */
export async function proxyChatCompletion(
  teamId: string,
  apiKeyId: string | null,
  request: AIChatRequest,
): Promise<AIChatResponse | AIProxyError> {
  const model = request.model ?? 'gpt-4o-mini';
  const start = Date.now();

  // Check quota
  const quota = await checkQuota(teamId);
  if (!quota.allowed) {
    return {
      error: `Token quota exceeded. Used ${quota.used.toLocaleString()} of ${quota.limit.toLocaleString()} tokens.`,
      code: 'QUOTA_EXCEEDED',
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: request.messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 2048,
    });

    const usage = {
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    };

    const costCents = estimateCostCents(model, usage.prompt_tokens, usage.completion_tokens);
    const durationMs = Date.now() - start;

    // Record usage and update team counters in a transaction
    await prisma.$transaction([
      prisma.usageRecord.create({
        data: {
          teamId,
          apiKeyId,
          model,
          endpoint: '/api/ai/chat',
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          durationMs,
          status: 'success',
          estimatedCostCents: costCents,
        },
      }),
      prisma.team.update({
        where: { id: teamId },
        data: { tokensUsed: { increment: usage.total_tokens } },
      }),
      ...(apiKeyId
        ? [prisma.apiKey.update({ where: { id: apiKeyId }, data: { lastUsed: new Date() } })]
        : []),
    ]);

    return {
      id: response.id,
      model: response.model,
      content: response.choices[0]?.message?.content ?? '',
      usage,
      estimatedCostCents: costCents,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Log failed request
    await prisma.usageRecord.create({
      data: {
        teamId,
        apiKeyId,
        model,
        endpoint: '/api/ai/chat',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        durationMs,
        status: 'error',
        errorMessage,
      },
    });

    return { error: errorMessage, code: 'MODEL_ERROR' };
  }
}
