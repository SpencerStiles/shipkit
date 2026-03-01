/**
 * API key utilities — generation, validation, and team resolution.
 */

import crypto from 'crypto';
import { prisma } from './db';
import { logger } from './logger';

const KEY_PREFIX = 'sk_';

/** Generate a new API key */
export function generateApiKey(): { key: string; prefix: string } {
  const raw = crypto.randomBytes(32).toString('base64url');
  const key = `${KEY_PREFIX}${raw}`;
  const prefix = key.slice(0, 11);
  return { key, prefix };
}

/** Hash an API key for storage comparison */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/** Validate an API key and return team/user info */
export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  teamId?: string;
  apiKeyId?: string;
  userId?: string;
  error?: string;
}> {
  if (!key.startsWith(KEY_PREFIX)) {
    return { valid: false, error: 'Invalid key format' };
  }

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key },
      include: { team: true },
    });

    if (!apiKey) {
      return { valid: false, error: 'Key not found' };
    }

    if (apiKey.revoked) {
      return { valid: false, error: 'Key has been revoked' };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: 'Key has expired' };
    }

    return {
      valid: true,
      teamId: apiKey.teamId,
      apiKeyId: apiKey.id,
      userId: apiKey.userId,
    };
  } catch (err) {
    logger.error('Database error validating API key', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { valid: false, error: 'Internal error validating key' };
  }
}
