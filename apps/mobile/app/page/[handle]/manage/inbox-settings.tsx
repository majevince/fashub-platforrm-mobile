import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { usePage } from '../../../../hooks/usePage';
import { getPageInboxSettings, updatePageInboxSettings, ApiError } from '@fashub/api-client';
import { hasPagePermission } from '@fashub/types';
import type { PageInboxSettings } from '@fashub/types';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/ErrorState';

type Key = keyof PageInboxSettings;

const ROWS: { key: Key; title: string; description: string }[] = [
  {
    key: 'notifyAllAdmins',
    title: 'Notify all admins of new messages',
    description: 'When on, every admin who can manage the Inbox gets notified of a new conversation. When off, only whoever it’s assigned to is notified.',
  },
  {
    key: 'requireAssignment',
    title: 'Require conversation assignment before reply',
    description: 'When on, a conversation must be assigned to an admin before anyone can reply to it.',
  },
];

/**
 * Settings > Page inbox settings (mobile). Same two immediate-save toggles
 * as web's app/page/[handle]/manage/inbox-settings/page.tsx, backed by the
 * same GET/PATCH /api/pages/[handle]/inbox-settings endpoint (its own
 * route, deliberately not folded into updatePage() — see
 * packages/api-client/src/pages.ts's comment on getPageInboxSettings).
 * These are additive preferences on top of the Inbox's own hard
 * canManageInbox role gate, not a way to grant Inbox access from here.
 */
export default function PageInboxSettingsScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { colors, spacing, typeScale } = useTheme();
  const router = useRouter();
  const { page, viewer, loading, error, reload } = usePage(handle);

  const [settings, setSettings] = useState<PageInboxSettings | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savingKey, setSavingKey] = useState<Key | null>(null);

  const allowed = hasPagePermission(viewer?.role, 'canManageInboxSettings');

  useEffect(() => {
    if (!handle || !allowed) return;
    getPageInboxSettings(handle)
      .then(setSettings)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load inbox settings'));
  }, [handle, allowed]);

  if (loading && !page) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <LoadingState label="Loading…" />
      </SafeAreaView>
    );
  }

  if (error || !page || !viewer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message={error ?? 'Page not found'} onRetry={reload} />
      </SafeAreaView>
    );
  }

  if (!allowed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message="You don't have permission to view this." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  const toggle = async (key: Key) => {
    if (!settings || !handle || savingKey) return;
    const previous = settings;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaveError('');
    setSavingKey(key);
    try {
      const updated = await updatePageInboxSettings(handle, { [key]: next[key] });
      setSettings(updated);
    } catch (err) {
      setSettings(previous);
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save setting');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color="#fff" />
        </Pressable>
        <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: '#fff' }} numberOfLines={1}>Page inbox settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 }}>
          These control notifications and reply behavior for admins who already have Inbox access. They don&apos;t
          grant Inbox access to a role — that&apos;s set in Manage admins.
        </Text>

        {loadError ? (
          <Text style={{ fontSize: 13, color: colors.oxblood }}>{loadError}</Text>
        ) : !settings ? (
          <LoadingState label="Loading…" />
        ) : (
          <>
            {saveError ? <Text style={{ fontSize: 12.5, color: colors.oxblood }}>{saveError}</Text> : null}
            <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line }}>
              {ROWS.map((row, i) => (
                <View
                  key={row.key}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
                    borderBottomWidth: i === ROWS.length - 1 ? 0 : 1, borderBottomColor: colors.line,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{row.title}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 2, lineHeight: 16 }}>{row.description}</Text>
                  </View>
                  <Switch
                    value={settings[row.key]}
                    onValueChange={() => toggle(row.key)}
                    disabled={savingKey === row.key}
                    trackColor={{ false: colors.line, true: colors.gold }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
