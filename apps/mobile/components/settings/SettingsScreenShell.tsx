import React, { useEffect, useRef, useState } from 'react';
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
 *
 * Root cause fixed here (confirmed against web's actual settings pages,
 * not assumed): every screen using this shell correctly called the right
 * endpoint and persisted correctly, but after a successful save the button
 * just reverted from "Saving…" straight back to "Save" with zero
 * confirmation — no success state at all. Web shows a green "Settings
 * saved successfully!" banner for ~3s after every button-triggered save
 * (app/settings/{individual,designer,tailor}/page.tsx). A save that
 * completes with no acknowledgment reads as "did that do anything?" —
 * which is exactly the "lagging/broken" symptom reported, even though the
 * underlying request always worked. Also fixed: the Save label was
 * colored `colors.oxblood`, this app's red/destructive-action color, on a
 * primary confirming action — swapped to `colors.gold`, the app's
 * established active/primary accent.
 */
export function SettingsScreenShell({ title, loading, error, onSave, saving, saveLabel, children }: Props) {
  const { colors, typeScale, spacing } = useTheme();
  const router = useRouter();
  const [justSaved, setJustSaved] = useState(false);
  const wasSaving = useRef(false);

  useEffect(() => {
    const previouslySaving = wasSaving.current;
    wasSaving.current = !!saving;
    if (previouslySaving && !saving && !error) {
      setJustSaved(true);
      const timer = setTimeout(() => setJustSaved(false), 3000);
      return () => clearTimeout(timer);
    }
    if (error) setJustSaved(false);
  }, [saving, error]);

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
            <Text style={{ fontWeight: '600', fontSize: 13, color: saving ? colors.inkSoft : colors.gold }}>
              {saving ? 'Saving…' : (saveLabel ?? 'Save')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 }} keyboardShouldPersistTaps="handled">
          {justSaved ? <Banner tone="success">Settings saved successfully!</Banner> : null}
          {error ? <Banner tone="error">{error}</Banner> : null}
          {children}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
