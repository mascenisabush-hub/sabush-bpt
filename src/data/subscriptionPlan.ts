import type { PaymentMethod } from '../types';

// Module #19 V1 Manual Payment Bridge — single, controlled source for
// the plan price and payment destinations (per the Implementation
// Authorization's own §9: "Do not scatter these values throughout the
// UI/code"). Temporary bridge values — not read from any processor,
// since none is integrated yet.

export const SUBSCRIPTION_PLAN_PRICE_MZN = 699; // POL-19-011 — V1's single paid plan (price updated per POL-19-011 Commercial Policy Update, 750 -> 699 MZN/month)
export const SUBSCRIPTION_PLAN_CURRENCY = 'MZN' as const;

export interface PaymentMethodConfig {
  id: PaymentMethod;
  /** i18n key under `subscription.paymentMethods.<id>.label`. */
  labelKey: string;
  /** The destination number/account customers pay to. */
  destination: string;
}

// V1 payment destinations — provided directly by the Product Architect
// for this bridge. Update here only; never hardcode a destination
// value anywhere else in the app.
export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  { id: 'mpesa', labelKey: 'subscription.paymentMethods.mpesa.label', destination: '+258858624086' },
  { id: 'emola', labelKey: 'subscription.paymentMethods.emola.label', destination: '+258870242114' },
  { id: 'bim', labelKey: 'subscription.paymentMethods.bim.label', destination: '1176885675' },
];
