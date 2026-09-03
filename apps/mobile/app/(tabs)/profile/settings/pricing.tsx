import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../context/AuthContext';
import { getUserProfile, updateUserProfile, ApiError } from '@fashub/api-client';
import { TextField } from '../../../../components/TextField';
import { SettingsScreenShell } from '../../../../components/settings/SettingsScreenShell';

const PRICE_RANGES = [
  { key: 'budget', label: 'Budget', sub: '$-$$' },
  { key: 'moderate', label: 'Moderate', sub: '$$-$$$' },
  { key: 'premium', label: 'Premium', sub: '$$$-$$$$' },
  { key: 'luxury', label: 'Luxury', sub: '$$$$+' },
] as const;

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD'] as const;

/** Web-role-gated (designer/tailor only). Matches app/settings/{role}/page.tsx's
 * Pricing tab exactly: a single priceRange tier (not per-service), minimumOrder,
 * currency (only these 4 options exist on web), and a per-role fee field
 * (consultationFee for designer, fittingFee for tailor) plus rushOrderFee —
 * both of which web renders but never actually persists (reset to 0 on every
 * reload). Fixed at the source here: settings_parity_fields migration +
 * app/api/users/[userId]/route.ts now actually save these two fields. */
export default function PricingSettingsScreen() {
  const { colors, typeScale, spacing } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [priceRange, setPriceRange] = useState<string>('moderate');
  const [minimumOrder, setMinimumOrder] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [fee, setFee] = useState(''); // consultationFee (designer) / fittingFee (tailor)
  const [rushOrderFee, setRushOrderFee] = useState('');

  const isTailor = user?.role === 'tailor';
  const feeLabel = isTailor ? 'Fitting Fee' : 'Consultation Fee';
  const feeHint = isTailor ? 'Set to 0 for free fittings' : 'Set to 0 for free consultations';

  const load = () => {
    if (!user) return;
    getUserProfile(user.id, user.id).then((profile) => {
      const fields = profile.designerProfile ?? profile.tailorProfile;
      setPriceRange(fields?.priceRange ?? 'moderate');
      setMinimumOrder(fields?.minimumOrder != null ? String(fields.minimumOrder) : '');
      setCurrency(fields?.currency ?? 'USD');
      setFee(isTailor ? (fields?.fittingFee != null ? String(fields.fittingFee) : '') : (fields?.consultationFee != null ? String(fields.consultationFee) : ''));
      setRushOrderFee(fields?.rushOrderFee != null ? String(fields.rushOrderFee) : '');
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };

  useEffect(load, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateUserProfile(user.id, {
        role: user.role,
        profileData: {
          pricing: {
            priceRange,
            minimumOrder: minimumOrder ? parseFloat(minimumOrder) || 0 : 0,
            currency,
            rushOrderFee: rushOrderFee ? parseFloat(rushOrderFee) || 0 : 0,
            ...(isTailor ? { fittingFee: fee ? parseFloat(fee) || 0 : 0 } : { consultationFee: fee ? parseFloat(fee) || 0 : 0 }),
          },
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsScreenShell title="Pricing" loading={loading} error={error} onSave={handleSave} saving={saving}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>Price Range</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PRICE_RANGES.map((p) => {
            const selected = priceRange === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => setPriceRange(p.key)}
                style={{ flexGrow: 1, minWidth: '45%', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: selected ? colors.gold : colors.ivory, borderWidth: 1, borderColor: selected ? colors.gold : colors.line, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: selected ? colors.ivory : colors.ink }}>{p.label}</Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: selected ? colors.ivory : colors.inkSoft, marginTop: 2 }}>{p.sub}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextField
        label="Minimum Order Value"
        value={minimumOrder}
        onChangeText={(t) => setMinimumOrder(t.replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="0"
      />

      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>Currency</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {CURRENCIES.map((c) => {
            const selected = currency === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCurrency(c)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: selected ? colors.gold : colors.ivory, borderWidth: 1, borderColor: selected ? colors.gold : colors.line, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: selected ? colors.ivory : colors.ink }}>{c}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextField label={feeLabel} value={fee} onChangeText={(t) => setFee(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" hint={feeHint} />
      <TextField label="Rush Order Fee" value={rushOrderFee} onChangeText={(t) => setRushOrderFee(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
    </SettingsScreenShell>
  );
}
