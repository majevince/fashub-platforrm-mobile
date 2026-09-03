import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Banner } from '../Banner';
import { LoadingState } from '../LoadingState';

type Props = {
  title: string;
  loading?: boolean;
  error?: string;
  /** Header-right action — usually "Save"/"Saving…". Omit for auto-saving sections (e.g. Privacy). */
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
  children: React.ReactNode;
};

/**
 * Shared header + scroll body + loading/error/save-button chrome for every
 * Settings sub-screen — matches web's per-role settings pages' consistent
 * shell (back nav, section title, single primary save action) without
 * repeating the boilerplate across all ten sections.
 */
export function SettingsScreenShell({ title, loading, error, onSave, saving, saveLabel, children }: Props) {
  const { colors, typeScale, spacing } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
          <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>{title}</Text>
        </View>
        {onSave ? (
          <Pressable onPress={onSave} disabled={saving} hitSlop={8}>
            <Text style={{ fontWeight: '600', fontSize: 13, color: saving ? colors.inkSoft : colors.oxblood }}>
              {saving ? 'Saving…' : (saveLabel ?? 'Save')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 }} keyboardShouldPersistTaps="handled">
          {error ? <Banner tone="error">{error}</Banner> : null}
          {children}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
