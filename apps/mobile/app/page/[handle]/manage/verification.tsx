import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { usePage } from '../../../../hooks/usePage';
import { hasPagePermission } from '@fashub/types';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/ErrorState';
import { PageVerifiedBadge } from '../../../../components/PageVerifiedBadge';

const TIER_LABEL: Record<string, string> = { standard: 'Standard', creator_pro: 'Creator Pro', business_pro: 'Business Pro' };

/**
 * Settings > Verification status (mobile). Read-only, same content as web's
 * app/page/[handle]/manage/verification/page.tsx — confirmed via a full-app
 * grep that no request-verification flow exists anywhere (personal or
 * Page); verification is platform-granted only, so there's no CTA here.
 * Gated on the broader canAccessSettingsTab (informational, not a
 * mutation), matching the hub's own row visibility.
 */
export default function VerificationStatusScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { colors, spacing, typeScale } = useTheme();
  const router = useRouter();
  const { page, viewer, loading, error, reload } = usePage(handle);

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

  if (!hasPagePermission(viewer.role, 'canAccessSettingsTab')) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message="You don't have permission to view this." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color="#fff" />
        </Pressable>
        <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: '#fff' }} numberOfLines={1}>Verification status</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 24, alignItems: 'center', gap: 8 }}>
          {page.verified ? (
            <>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center' }}>
                <PageVerifiedBadge size="md" />
              </View>
              <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Verified</Text>
            </>
          ) : (
            <>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.inkSoft }} />
              </View>
              <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.inkSoft }}>Not verified</Text>
            </>
          )}
          <Text style={{ fontSize: 12.5, color: colors.inkSoft, marginTop: 4 }}>
            Tier: <Text style={{ fontWeight: '700', color: colors.ink }}>{TIER_LABEL[page.tier] ?? page.tier}</Text>
          </Text>
        </View>

        <Text style={{ fontSize: 11.5, color: colors.inkSoft, lineHeight: 16 }}>
          Verification is granted by the FasHub team, not self-service — there's no request-verification flow in the
          app today. If you believe this Page should be verified, reach out to FasHub support outside the app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
