import type { Payments } from './port';
import { MockPayments } from './mock';
import { StripePayments } from './stripe';

export type { Payments, PaymentCharge, PaymentResult } from './port';

/** Set ALL of these to switch from the mock to the real provider — config only. */
export const REQUIRED_ENV = ['STRIPE_SECRET_KEY'] as const;

/** The only place the mock/real choice is made. */
export function getPayments(): Payments {
  const configured = REQUIRED_ENV.every((key) => !!process.env[key]);
  return configured ? new StripePayments() : new MockPayments();
}
