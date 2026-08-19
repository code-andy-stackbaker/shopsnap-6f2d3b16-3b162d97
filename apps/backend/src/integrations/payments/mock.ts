import type { PaymentCharge, PaymentResult, Payments } from './port';

/**
 * Deterministic, network-free default provider.
 * Declines when the total ends in .13, or when PAYMENT_MOCK_OUTCOME=decline.
 */
export class MockPayments implements Payments {
  async charge(charge: PaymentCharge): Promise<PaymentResult> {
    const forced = (process.env.PAYMENT_MOCK_OUTCOME ?? '').toLowerCase();
    if (forced === 'decline') {
      return { approved: false, declineReason: 'Card declined by issuer (mock forced decline).' };
    }
    if (charge.amount % 100 === 13) {
      return { approved: false, declineReason: 'Card declined by issuer. No charge was made.' };
    }
    return { approved: true };
  }
}
