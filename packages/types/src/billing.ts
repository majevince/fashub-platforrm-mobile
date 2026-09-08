/**
 * Matches web's Stripe-backed billing endpoints exactly (components/settings/BillingTab.tsx,
 * app/api/billing/*, app/api/subscription/upgrade). Payment methods and invoices are real
 * Stripe data (PCI SAQ-A pattern — card details never touch FasHub's server); subscription
 * tier changes are NOT real billing on web today — POST/DELETE just flip a DB column with
 * no charge, marketed as "free during beta." Mobile matches that same (currently fake)
 * upgrade behavior, not a real Stripe Subscriptions integration that doesn't exist yet.
 */
export type SubscriptionTier = 'free' | 'pro' | 'business';

export interface PaymentMethodSummary {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  name?: string | null;
  isDefault: boolean;
}

export interface InvoiceSummary {
  id: string;
  date: string;
  invoiceNo: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl: string | null;
}

/**
 * Prices are 0 for every tier — confirmed directly against web's real,
 * current /pro/upgrade page copy: "During the beta period, both Creator
 * Pro and Fashion Studio Pro are completely free with instant activation.
 * No credit card, no trial period." An earlier pass here priced Pro/
 * Business at $9.99/$29.99 despite this same comment already noting the
 * beta-is-free behavior — a stale/contradicted value, not a real price,
 * fixed rather than carried forward into new UI that reads this config.
 */
export const PLAN_CONFIG: Record<SubscriptionTier, { label: string; price: number; features: string[] }> = {
  free: { label: 'Free', price: 0, features: ['Basic profile', 'Up to 5 active projects', 'Standard support'] },
  pro: { label: 'Creator Pro', price: 0, features: ['Unlimited projects', 'Search boost', 'Pro badge', 'Priority support'] },
  business: { label: 'Business', price: 0, features: ['Everything in Pro', 'Business profile tools', 'Team features', 'Dedicated support'] },
};
