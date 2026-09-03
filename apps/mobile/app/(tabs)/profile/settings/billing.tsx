import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { CreditCard, Trash2, Star } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../context/AuthContext';
import {
  getUserProfile,
  createBillingSetupIntent,
  getPaymentMethods,
  removePaymentMethod,
  setDefaultPaymentMethod,
  getInvoices,
  upgradeSubscription,
  downgradeSubscription,
  ApiError,
} from '@fashub/api-client';
import { PLAN_CONFIG, type PaymentMethodSummary, type InvoiceSummary, type SubscriptionTier } from '@fashub/types';
import { SettingsScreenShell } from '../../../../components/settings/SettingsScreenShell';

/**
 * Matches web's components/settings/BillingTab.tsx feature set exactly, split
 * across its two genuinely different halves:
 *
 * 1. Payment methods + invoices are REAL Stripe (SetupIntent + PCI SAQ-A —
 *    card details never touch FasHub's server). Web uses Stripe Elements
 *    (a web-only SDK); mobile's equivalent is Stripe's separate React Native
 *    SDK's PaymentSheet, driven by the same /api/billing/setup-intent
 *    endpoint — same backend contract, different client-side confirmation
 *    UI, which is the correct/expected difference for a native port (there
 *    is no RN equivalent of embedding <CardElement> directly).
 *
 * 2. Subscription upgrade/downgrade is NOT real billing on web today — it's
 *    a DB column flip with no Stripe charge, marketed as "free during
 *    beta." Mobile matches that same (currently fake) behavior rather than
 *    building a real Stripe Subscriptions flow that doesn't exist to port.
 *    Web's "Manage Plan"/"Cancel Plan" buttons have no handlers at all
 *    (dead UI) — omitted here rather than built as a no-op to match.
 *
 * The "2FA Required" security notice on web is decorative marketing copy
 * with zero actual enforcement anywhere in the codebase (confirmed: no
 * re-auth/password-confirmation gate exists for any billing or privacy
 * mutation) — not replicated here since implying a safeguard that doesn't
 * exist would be actively misleading, not faithful parity.
 */
export default function BillingSettingsScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [methods, setMethods] = useState<PaymentMethodSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingCard, setAddingCard] = useState(false);
  const [changingTier, setChangingTier] = useState(false);
  const [busyPmId, setBusyPmId] = useState<string | null>(null);

  const canSubscribe = user?.role === 'designer' || user?.role === 'tailor';

  const load = useCallback(() => {
    if (!user) return;
    setError('');
    Promise.all([getUserProfile(user.id, user.id), getPaymentMethods(user.id), getInvoices(user.id)])
      .then(([profile, pm, inv]) => {
        setTier((profile.subscriptionTier as SubscriptionTier) ?? 'free');
        setMethods(pm.paymentMethods);
        setInvoices(inv.invoices);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load billing info."))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(load, [load]);

  if (!user) return null;

  const handleAddCard = async () => {
    setAddingCard(true);
    setError('');
    try {
      const { clientSecret } = await createBillingSetupIntent(user.id);
      const { error: initError } = await initPaymentSheet({ setupIntentClientSecret: clientSecret, merchantDisplayName: 'FaSHub' });
      if (initError) throw new Error(initError.message);
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') setError(presentError.message);
        return;
      }
      load();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Couldn't add payment method.");
    } finally {
      setAddingCard(false);
    }
  };

  const handleRemove = (pmId: string) => {
    Alert.alert('Remove card?', 'This payment method will be removed from your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusyPmId(pmId);
          try {
            await removePaymentMethod(user.id, pmId);
            load();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Couldn't remove card.");
          } finally {
            setBusyPmId(null);
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (pmId: string) => {
    setBusyPmId(pmId);
    try {
      await setDefaultPaymentMethod(user.id, pmId);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update default card.");
    } finally {
      setBusyPmId(null);
    }
  };

  const handleChangeTier = async (next: SubscriptionTier) => {
    setChangingTier(true);
    setError('');
    try {
      if (next === 'free') await downgradeSubscription(user.id);
      else await upgradeSubscription(user.id, next);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update your plan.");
    } finally {
      setChangingTier(false);
    }
  };

  return (
    <SettingsScreenShell title="Billing" loading={loading} error={error}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft }}>Plan</Text>
        {(Object.keys(PLAN_CONFIG) as SubscriptionTier[]).map((t) => {
          const plan = PLAN_CONFIG[t];
          const active = tier === t;
          const disabled = t !== 'free' && !canSubscribe;
          return (
            <View
              key={t}
              style={{ borderRadius: radius.lg, borderWidth: 1.5, borderColor: active ? colors.gold : colors.line, backgroundColor: active ? colors.ivoryDeep : colors.ivory, padding: spacing.md, gap: 8, opacity: disabled ? 0.5 : 1 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{plan.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{plan.price === 0 ? 'Free' : `$${plan.price.toFixed(2)}/mo`}</Text>
              </View>
              {plan.features.map((f) => (
                <Text key={f} style={{ fontSize: 11.5, fontWeight: '400', color: colors.inkSoft }}>· {f}</Text>
              ))}
              {!active && !disabled ? (
                <Pressable
                  onPress={() => handleChangeTier(t)}
                  disabled={changingTier}
                  style={{ marginTop: 4, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.gold, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ivory }}>{changingTier ? 'Updating…' : t === 'free' ? 'Downgrade to Free' : `Switch to ${plan.label}`}</Text>
                </Pressable>
              ) : active ? (
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.gold }}>Current plan</Text>
              ) : null}
            </View>
          );
        })}
        {!canSubscribe ? (
          <Text style={{ fontSize: 11, fontWeight: '400', color: colors.inkSoft }}>Paid plans are available for designer and tailor accounts.</Text>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft }}>Payment Methods</Text>
          <Pressable onPress={handleAddCard} disabled={addingCard}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.oxblood }}>{addingCard ? 'Opening…' : '+ Add Card'}</Text>
          </Pressable>
        </View>
        {methods.length === 0 ? (
          <Text style={{ fontSize: 12, fontWeight: '400', color: colors.inkSoft }}>No payment methods saved.</Text>
        ) : (
          methods.map((pm) => (
            <View key={pm.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: spacing.sm + 2 }}>
              <CreditCard size={18} color={colors.inkSoft} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, textTransform: 'capitalize' }}>
                  {pm.brand} •••• {pm.last4}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '400', color: colors.inkSoft }}>
                  Expires {String(pm.expMonth).padStart(2, '0')}/{pm.expYear}
                </Text>
              </View>
              {busyPmId === pm.id ? (
                <ActivityIndicator size="small" color={colors.oxblood} />
              ) : (
                <>
                  {pm.isDefault ? (
                    <View style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.gold, textTransform: 'uppercase' }}>Default</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => handleSetDefault(pm.id)} hitSlop={8}>
                      <Star size={16} color={colors.inkSoft} />
                    </Pressable>
                  )}
                  <Pressable onPress={() => handleRemove(pm.id)} hitSlop={8}>
                    <Trash2 size={16} color={colors.oxblood} />
                  </Pressable>
                </>
              )}
            </View>
          ))
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft }}>Invoice History</Text>
        {invoices.length === 0 ? (
          <Text style={{ fontSize: 12, fontWeight: '400', color: colors.inkSoft }}>No invoices yet.</Text>
        ) : (
          invoices.map((inv) => (
            <View key={inv.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: spacing.sm + 2 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{inv.description}</Text>
                <Text style={{ fontSize: 11, fontWeight: '400', color: colors.inkSoft }}>{new Date(inv.date).toLocaleDateString()} · {inv.invoiceNo}</Text>
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>${inv.amount.toFixed(2)}</Text>
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: inv.status === 'paid' ? '#E9F7EE' : inv.status === 'pending' ? colors.ivoryDeep : '#FDECEC',
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 9.5, fontWeight: '700', textTransform: 'uppercase', color: inv.status === 'paid' ? '#15803D' : inv.status === 'pending' ? colors.gold : colors.oxblood }}>
                  {inv.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </SettingsScreenShell>
  );
}
