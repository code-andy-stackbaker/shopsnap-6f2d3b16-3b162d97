/** Domain-typed payment capability. Never a vendor's raw shape. */

export interface PaymentCharge {
  /** integer, minor units */
  amount: number;
  /** ISO 4217, lower-case (e.g. "usd") */
  currency: string;
  orderRef: string;
  customerEmail: string;
}

export interface PaymentResult {
  approved: boolean;
  declineReason?: string;
}

export interface Payments {
  charge(charge: PaymentCharge): Promise<PaymentResult>;
}
