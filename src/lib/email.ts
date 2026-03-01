/**
 * email.ts — Transactional email helpers.
 *
 * In development (or when RESEND_API_KEY is absent) all outbound email is
 * logged to the console so you can iterate without real credentials.
 *
 * In production: swap the stub body of `sendEmail` for your provider of
 * choice.  The Resend example is included but commented out — just install
 * `resend` and uncomment.
 */

import { logger } from './logger';

// ---------------------------------------------------------------------------
// Core send primitive
// ---------------------------------------------------------------------------

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  if (process.env.NODE_ENV === 'development' || !process.env.RESEND_API_KEY) {
    logger.info('[Email - DEV] skipping send', {
      subject: opts.subject,
      to: opts.to,
    });
    return;
  }

  // -------------------------------------------------------------------------
  // Production: integrate with your email provider.
  //
  // Example with Resend (run `pnpm add resend` first):
  //
  //   import { Resend } from 'resend'
  //   const resend = new Resend(process.env.RESEND_API_KEY)
  //   const { error } = await resend.emails.send({
  //     from: 'ShipKit <noreply@yourdomain.com>',
  //     to: opts.to,
  //     subject: opts.subject,
  //     html: opts.html,
  //   })
  //   if (error) throw new Error(`Email send failed: ${error.message}`)
  // -------------------------------------------------------------------------

  logger.warn('No email provider configured — email not sent', {
    subject: opts.subject,
    to: opts.to,
  });
}

// ---------------------------------------------------------------------------
// Typed email templates
// ---------------------------------------------------------------------------

/** Sent when a team's subscription is successfully created or upgraded. */
export function subscriptionConfirmationEmail(
  plan: string,
  email: string,
): Promise<void> {
  return sendEmail({
    to: email,
    subject: `You're now on the ${plan} plan`,
    html: `
      <p>Hi there,</p>
      <p>Your subscription to the <strong>${plan}</strong> plan is confirmed. Thank you for your support!</p>
      <p>You can view your usage and manage your subscription in the <a href="${process.env.NEXTAUTH_URL ?? ''}/dashboard/billing">billing dashboard</a>.</p>
    `,
  });
}

/** Sent when Stripe fails to collect a recurring invoice payment. */
export function paymentFailedEmail(email: string): Promise<void> {
  return sendEmail({
    to: email,
    subject: 'Payment failed — action required',
    html: `
      <p>Hi there,</p>
      <p>We couldn't process your most recent payment. Please update your payment method to keep your subscription active and avoid service interruption.</p>
      <p><a href="${process.env.NEXTAUTH_URL ?? ''}/dashboard/billing">Update payment method</a></p>
    `,
  });
}

/** Sent when a team has consumed a significant portion of their monthly quota. */
export function usageLimitWarningEmail(
  email: string,
  percentUsed: number,
): Promise<void> {
  return sendEmail({
    to: email,
    subject: `You've used ${percentUsed}% of your token allowance`,
    html: `
      <p>Hi there,</p>
      <p>You've used <strong>${percentUsed}%</strong> of your monthly token allowance.</p>
      <p>Consider <a href="${process.env.NEXTAUTH_URL ?? ''}/dashboard/billing">upgrading your plan</a> to avoid hitting your limit.</p>
    `,
  });
}
