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

export const PLAN_CONFIG: Record<SubscriptionTier, { label: string; price: number; features: string[] }> = {
  free: { label: 'Free', price: 0, features: ['Basic profile', 'Up to 5 active projects', 'Standard support'] },
  pro: { label: 'Creator Pro', price: 9.99, features: ['Unlimited projects', 'Search boost', 'Pro badge', 'Priority support'] },
  business: { label: 'Business', price: 29.99, features: ['Everything in Pro', 'Business profile tools', 'Team features', 'Dedicated support'] },
};
