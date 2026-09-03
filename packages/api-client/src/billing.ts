import { apiGet, apiPost, apiPatch, apiDelete } from './http';
import type { PaymentMethodSummary, InvoiceSummary, SubscriptionTier } from '@fashub/types';

/** Matches POST /api/billing/setup-intent exactly — returns a Stripe SetupIntent client secret
 * for the RN SDK's PaymentSheet to confirm directly against Stripe (card details never touch
 * FasHub's server). */
export function createBillingSetupIntent(userId: string): Promise<{ clientSecret: string }> {
  return apiPost('/api/billing/setup-intent', { userId, paymentMethodTypes: ['card'] });
}

/** Matches GET /api/billing/payment-methods?userId= exactly. */
export function getPaymentMethods(userId: string): Promise<{ paymentMethods: PaymentMethodSummary[]; defaultPaymentMethodId: string | null }> {
  return apiGet(`/api/billing/payment-methods?userId=${userId}`);
}

/** Matches PATCH /api/billing/payment-methods?userId=&pmId= exactly — only the cardholder name is editable. */
export function updatePaymentMethodName(userId: string, pmId: string, name: string): Promise<{ id: string; name: string }> {
  return apiPatch(`/api/billing/payment-methods?userId=${userId}&pmId=${pmId}`, { name });
}

/** Matches DELETE /api/billing/payment-methods?userId=&pmId= exactly. */
export function removePaymentMethod(userId: string, pmId: string): Promise<{ ok: boolean }> {
  return apiDelete(`/api/billing/payment-methods?userId=${userId}&pmId=${pmId}`);
}

/** Matches POST /api/billing/payment-methods/default exactly. */
export function setDefaultPaymentMethod(userId: string, pmId: string): Promise<{ ok: boolean }> {
  return apiPost('/api/billing/payment-methods/default', { userId, pmId });
}

/** Matches GET /api/billing/invoices?userId= exactly — pulled live from Stripe, not cached. */
export function getInvoices(userId: string): Promise<{ invoices: InvoiceSummary[] }> {
  return apiGet(`/api/billing/invoices?userId=${userId}`);
}

/** Matches POST /api/subscription/upgrade exactly. NOTE: on web this does not create a real
 * Stripe charge/subscription today — it just flips User.subscriptionTier (marketed as "free
 * during beta"). Mobile intentionally matches that same real (if unfinished) behavior rather
 * than building a Stripe Subscriptions flow the web app doesn't have yet. */
export function upgradeSubscription(userId: string, tier: Exclude<SubscriptionTier, 'free'>): Promise<{ subscriptionTier: SubscriptionTier }> {
  return apiPost('/api/subscription/upgrade', { userId, tier });
}

/** Matches DELETE /api/subscription/upgrade?userId= exactly — downgrades to free. */
export function downgradeSubscription(userId: string): Promise<{ subscriptionTier: SubscriptionTier }> {
  return apiDelete(`/api/subscription/upgrade?userId=${userId}`);
}
