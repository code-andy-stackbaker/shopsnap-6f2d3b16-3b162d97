import type { PaymentCharge, PaymentResult, Payments } from './port';

/**
 * The ONLY file that talks to Stripe. Reads its key from the environment and
 * maps Stripe's shape onto the domain PaymentResult. Selected by the factory
 * in ./index.ts when STRIPE_SECRET_KEY is set — no caller changes.
 */
export class StripePayments implements Payments {
  private readonly apiBase = 'https://api.stripe.com/v1';

  async charge(charge: PaymentCharge): Promise<PaymentResult> {
    const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
    const body = new URLSearchParams({
      amount: String(charge.amount),
      currency: charge.currency,
      confirm: 'true',
      'automatic_payment_methods[enabled]': 'true',
      'automatic_payment_methods[allow_redirects]': 'never',
      receipt_email: charge.customerEmail,
      'metadata[order_ref]': charge.orderRef,
    });

    const response = await fetch(`${this.apiBase}/payment_intents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': charge.orderRef,
      },
      body,
    });

    const payload = (await response.json()) as {
      status?: string;
      error?: { message?: string };
    };

    if (!response.ok) {
      return { approved: false, declineReason: payload.error?.message ?? 'Payment failed.' };
    }
    if (payload.status === 'succeeded' || payload.status === 'requires_capture') {
      return { approved: true };
    }
    return { approved: false, declineReason: `Payment not completed (status: ${payload.status ?? 'unknown'}).` };
  }
}
