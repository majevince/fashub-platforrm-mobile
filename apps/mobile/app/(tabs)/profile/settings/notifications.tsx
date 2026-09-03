import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../context/AuthContext';
import { getNotificationPreferences, updateNotificationPreferences, ApiError } from '@fashub/api-client';
import { NOTIFICATION_CATEGORIES, type NotificationChannel, type NotificationPreferences } from '@fashub/types';
import { SettingsScreenShell } from '../../../../components/settings/SettingsScreenShell';
import { ToggleRow } from '../../../../components/settings/ToggleRow';

const CHANNELS: { key: NotificationChannel; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'push', label: 'Push' },
  { key: 'inApp', label: 'In-App' },
];

const ITEM_LABELS: Record<string, string> = {
  orderUpdates: 'Order Updates', paymentConfirmations: 'Payment Confirmations', orderStatusChanges: 'Order Status Changes', deliveryUpdates: 'Delivery Updates',
  newMessages: 'New Messages', messageReplies: 'Message Replies', mentions: 'Mentions',
  newFollowers: 'New Followers', likes: 'Likes', comments: 'Comments', shares: 'Shares',
  quoteRequests: 'Quote Requests', appointmentReminders: 'Appointment Reminders', appointmentChanges: 'Appointment Changes', reviewsReceived: 'Reviews Received',
  favoriteUpdates: 'Favorite Updates', priceDrops: 'Price Drops', backInStock: 'Back In Stock',
  promotions: 'Promotions', newsletter: 'Newsletter', recommendations: 'Recommendations', weeklyDigest: 'Weekly Digest',
  securityAlerts: 'Security Alerts', loginAlerts: 'Login Alerts', accountChanges: 'Account Changes', privacyUpdates: 'Privacy Updates',
};

const GLOBAL_TOGGLES: { key: keyof NotificationPreferences; channel: NotificationChannel; label: string }[] = [
  { key: 'emailEnabled', channel: 'email', label: 'Email' },
  { key: 'smsEnabled', channel: 'sms', label: 'SMS' },
  { key: 'pushEnabled', channel: 'push', label: 'Push' },
  { key: 'inAppEnabled', channel: 'inApp', label: 'In-App' },
];

/**
 * Matches web's NotificationPreferencesManager exactly: 4 global master
 * toggles gate 4 channels × 7 categories (25 individual notification types,
 * same field names as the Prisma NotificationPreferences model). Not
 * role-filtered — web shows the "Professional (Designer/Tailor)" category
 * to every role, so this does too. Saved as a single whole-record PUT,
 * matching web's own save call exactly (not per-toggle auto-save, unlike
 * Privacy).
 */
export default function NotificationsSettingsScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    getNotificationPreferences(user.id)
      .then((res) => setPrefs(res.preferences))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load notification preferences."))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || !prefs) {
    return <SettingsScreenShell title="Notifications" loading={loading} error={error}><View /></SettingsScreenShell>;
  }

  const toggleGlobal = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));
  };

  const toggleItem = (itemKey: string, channel: NotificationChannel) => {
    setPrefs((prev) => {
      if (!prev) return prev;
      const current = (prev as Record<string, unknown>)[itemKey] as Record<NotificationChannel, boolean>;
      return { ...prev, [itemKey]: { ...current, [channel]: !current[channel] } } as NotificationPreferences;
    });
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    setError('');
    try {
      const res = await updateNotificationPreferences(user.id, prefs);
      setPrefs(res.preferences);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save notification preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsScreenShell title="Notifications" loading={loading} error={error} onSave={handleSave} saving={saving}>
      <View style={{ gap: 2 }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft, marginBottom: 6 }}>Master Controls</Text>
        {GLOBAL_TOGGLES.map((g) => (
          <ToggleRow key={g.key} label={g.label} value={!!prefs[g.key]} onValueChange={() => toggleGlobal(g.key)} />
        ))}
      </View>

      {NOTIFICATION_CATEGORIES.map((category) => (
        <View key={category.key} style={{ gap: spacing.sm }}>
          <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft }}>{category.label}</Text>
          {category.items.map((itemKey) => {
            const value = (prefs as Record<string, unknown>)[itemKey] as Record<NotificationChannel, boolean>;
            return (
              <View key={itemKey} style={{ backgroundColor: colors.ivoryDeep, borderRadius: radius.md, padding: spacing.sm + 2, gap: 8 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{ITEM_LABELS[itemKey] ?? itemKey}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CHANNELS.map((ch) => {
                    const enabled = value?.[ch.key];
                    const channelGloballyOn = prefs[GLOBAL_TOGGLES.find((g) => g.channel === ch.key)!.key];
                    return (
                      <Pressable
                        key={ch.key}
                        onPress={() => toggleItem(itemKey, ch.key)}
                        disabled={!channelGloballyOn}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 999,
                          alignItems: 'center',
                          backgroundColor: enabled && channelGloballyOn ? colors.gold : colors.ivory,
                          borderWidth: 1,
                          borderColor: enabled && channelGloballyOn ? colors.gold : colors.line,
                          opacity: channelGloballyOn ? 1 : 0.4,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: enabled && channelGloballyOn ? colors.ivory : colors.ink }}>{ch.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </SettingsScreenShell>
  );
}
