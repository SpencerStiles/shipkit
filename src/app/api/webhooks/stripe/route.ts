/**
 * POST /api/webhooks/stripe — Stripe webhook handler.
 *
 * Handles subscription lifecycle events to keep team plan
 * and billing state in sync.
 *
 * Security: signature verification via stripe.webhooks.constructEvent()
 * ensures only genuine Stripe events are processed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, PLANS } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import {
  subscriptionConfirmationEmail,
  paymentFailedEmail,
} from '@/lib/email';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  // Read the raw body as text — Stripe's signature verification requires the
  // exact bytes that were transmitted; any re-serialisation will break the HMAC.
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Stripe webhook signature verification failed', { message });
    return NextResponse.json(
      { error: 'Invalid signature', code: 'INVALID_SIGNATURE' },
      { status: 400 },
    );
  }

  logger.info('Stripe webhook received', { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.metadata?.teamId) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          const team = await updateTeamSubscription(
            session.metadata.teamId,
            subscription,
          );

          // Send confirmation email if we have a customer email
          if (team?.members?.[0]?.email) {
            const planName = team.plan;
            await subscriptionConfirmationEmail(
              planName.charAt(0).toUpperCase() + planName.slice(1),
              team.members[0].email,
            ).catch((emailErr) =>
              logger.error('Failed to send subscription confirmation email', {
                error:
                  emailErr instanceof Error
                    ? emailErr.message
                    : String(emailErr),
                teamId: session.metadata?.teamId,
              }),
            );
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const team = await prisma.team.findFirst({
          where: { stripeCustomerId: subscription.customer as string },
        });
        if (team) {
          await updateTeamSubscription(team.id, subscription);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const team = await prisma.team.findFirst({
            where: { stripeCustomerId: invoice.customer as string },
          });
          if (team) {
            // Reset monthly usage on successful payment
            await prisma.team.update({
              where: { id: team.id },
              data: {
                tokensUsed: 0,
                periodStart: new Date(),
              },
            });
            logger.info('Monthly usage reset after successful invoice payment', {
              teamId: team.id,
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const team = await prisma.team.findFirst({
            where: { stripeCustomerId: invoice.customer as string },
            include: { members: { select: { email: true }, take: 1 } },
          });
          if (team?.members?.[0]?.email) {
            await paymentFailedEmail(team.members[0].email).catch(
              (emailErr) =>
                logger.error('Failed to send payment failed email', {
                  error:
                    emailErr instanceof Error
                      ? emailErr.message
                      : String(emailErr),
                  teamId: team.id,
                }),
            );
          }
          logger.warn('Invoice payment failed', {
            teamId: team?.id,
            invoiceId: invoice.id,
          });
        }
        break;
      }

      default:
        // Acknowledge but do not process unhandled event types.
        logger.debug('Unhandled Stripe event type', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Stripe webhook processing error', {
      type: event.type,
      id: event.id,
      error: message,
    });
    return NextResponse.json(
      { error: 'Webhook processing failed', code: 'PROCESSING_ERROR' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Synchronise a team's subscription state from a Stripe Subscription object.
 * Returns the updated team (with members) so callers can send emails.
 */
async function updateTeamSubscription(
  teamId: string,
  subscription: Stripe.Subscription,
) {
  const priceId = subscription.items.data[0]?.price.id;

  // Determine plan from price ID
  let plan = 'free';
  let tokenLimit: number = PLANS.free.tokenLimit;

  if (priceId === PLANS.pro.stripePriceId) {
    plan = 'pro';
    tokenLimit = PLANS.pro.tokenLimit;
  } else if (priceId === PLANS.enterprise.stripePriceId) {
    plan = 'enterprise';
    tokenLimit = PLANS.enterprise.tokenLimit;
  }

  // If subscription is cancelled or unpaid, downgrade to free
  if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    plan = 'free';
    tokenLimit = PLANS.free.tokenLimit;
  }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(
        subscription.current_period_end * 1000,
      ),
      plan,
      tokenLimit,
    },
    include: {
      members: { select: { email: true }, take: 1 },
    },
  });

  logger.info('Team subscription updated', {
    teamId,
    plan,
    status: subscription.status,
  });

  return updated;
}
