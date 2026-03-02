/**
 * POST /api/billing/checkout — Create a Stripe Checkout session.
 *
 * Accepts a planId ('pro' | 'enterprise'), creates or retrieves the Stripe
 * customer for the team, and returns a hosted checkout URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe, PLANS } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const bodySchema = z.object({
  planId: z.enum(['pro', 'enterprise']),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.teamId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 },
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

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'planId must be "pro" or "enterprise"', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    const { planId } = parsed.data;
    const plan = PLANS[planId];
    if (!('stripePriceId' in plan) || !plan.stripePriceId) {
      return NextResponse.json(
        { error: 'Plan has no associated Stripe price', code: 'BAD_REQUEST' },
        { status: 400 },
      );
    }

    const teamId = session.user.teamId;

    // Fetch team to get or create Stripe customer
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { select: { email: true, name: true }, take: 1 } },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    // Create Stripe customer if one does not exist yet
    let customerId = team.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: team.members[0]?.email ?? undefined,
        name: team.name,
        metadata: { teamId },
      });
      customerId = customer.id;
      await prisma.team.update({
        where: { id: teamId },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = env.NEXTAUTH_URL;

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/billing?success=1`,
      cancel_url: `${baseUrl}/dashboard/billing?canceled=1`,
      metadata: { teamId },
      subscription_data: { metadata: { teamId } },
      allow_promotion_codes: true,
    });

    logger.info('Stripe checkout session created', {
      teamId,
      planId,
      sessionId: checkoutSession.id,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    logger.error('Failed to create checkout session', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
