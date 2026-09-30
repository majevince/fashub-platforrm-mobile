import React from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Users, ShieldOff, Rss, Inbox, Lock, Pencil, BadgeCheck, FileText, CalendarDays, CalendarClock } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { usePage } from '../../../hooks/usePage';
import { deactivatePage } from '@fashub/api-client';
import { hasPagePermission, type PagePermission } from '@fashub/types';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';

type Row = { key: string; path: string; Icon: typeof Users; title: string; description: string; permission: PagePermission | 'always' };

const ROWS: Row[] = [
  { key: 'admins', path: 'admins', Icon: Users, title: 'Manage admins', description: 'Choose who manages this page and their role', permission: 'canManageAdmins' },
  { key: 'restricted', path: 'restricted', Icon: ShieldOff, title: 'Restricted members', description: 'People blocked from following or engaging', permission: 'canManageRestrictions' },
  { key: 'following', path: 'following', Icon: Rss, title: 'Manage following', description: 'Pages this page follows', permission: 'canManageFollowing' },
  { key: 'inbox-settings', path: 'inbox-settings', Icon: Inbox, title: 'Page inbox settings', description: 'Notifications and access for messages', permission: 'canManageInboxSettings' },
  { key: 'bookings', path: 'bookings', Icon: CalendarClock, title: 'Manage booking calendar', description: 'Services, availability, and requests', permission: 'canManageBookings' },
  { key: 'roles', path: 'roles', Icon: Lock, title: 'Roles and permissions', description: 'What each role can do', permission: 'canViewRolesMatrix' },
  { key: 'edit', path: 'edit', Icon: Pencil, title: 'Edit page info', description: 'Name, cover, avatar, category, about', permission: 'canEditPageInfo' },
  { key: 'verification', path: 'verification', Icon: BadgeCheck, title: 'Verification status', description: '', permission: 'always' },
];

/**
 * Settings hub — Settings-tab ticket, full mobile parity. Same restructure
 * as web's app/page/[handle]/manage/page.tsx: this used to be the metric-
 * card + admins-list + settings-rows "Manage" screen; metrics moved to the
 * Stats tab (PageStatsTab), the admins list became its own Manage-admins
 * sub-page, and these rows are now real navigable screens gated by their
 * own PagePermission (not a blanket "any admin" check) — an Editor sees
 * only Edit page info here; a Moderator sees only Restricted members.
 * "Create as this Page" stays at the top, same as web, per the confirmed
 * scoping (same route, just above the row list now instead of below cards).
 */
export default function PageSettingsHubScreen() {
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
        <ErrorState message="You don't have permission to view this Page's Settings." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  const canPost = hasPagePermission(viewer.role, 'canPost');
  const rows = ROWS.filter((r) => r.permission === 'always' || hasPagePermission(viewer.role, r.permission));

  const handleDeactivate = () => {
    Alert.alert(
      `Deactivate ${page.name}?`,
      'This hides the Page from public view. You can reach support to reactivate it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () =>
            deactivatePage(page.handle)
              .then(() => router.replace('/'))
              .catch(() => Alert.alert('Something went wrong', 'Please try again.')),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color="#fff" />
        </Pressable>
        {/* Section-header role: matches Profile's h2 exactly (typeScale.h2,
            system font, not Fraunces). */}
        <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: '#fff' }} numberOfLines={1}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        {canPost ? (
          <View>
            <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginBottom: 10 }}>Create as this Page</Text>
            {/* Disabled, same as the old Manage screen's "posting-as" card —
                the actual bottom-sheet identity switcher (shared state with
                mobile's composers) is still deferred; this stays an honest
                "coming soon" rather than a button that calls nothing. */}
            <View style={{ flexDirection: 'row', gap: 10, opacity: 0.5 }}>
              <View style={{ flex: 1, backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, alignItems: 'center', gap: 6 }}>
                <FileText size={20} color={colors.inkSoft} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.inkSoft }}>Post</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, alignItems: 'center', gap: 6 }}>
                <CalendarDays size={20} color={colors.inkSoft} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.inkSoft }}>Event</Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 6 }}>Posting as a Page from mobile is coming soon — use the web app for now.</Text>
          </View>
        ) : null}

        <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line }}>
          {rows.map((row, i) => (
            <Pressable
              key={row.key}
              onPress={() => router.push(`/page/${page.handle}/manage/${row.path}`)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
                borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: colors.line,
              }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center' }}>
                <row.Icon size={16} color={colors.gold} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{row.title}</Text>
                {row.description ? (
                  <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 1 }} numberOfLines={1}>
                    {row.key === 'verification' ? (page.verified ? 'Verified' : 'Not verified') : row.description}
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={16} color={colors.inkSoft} />
            </Pressable>
          ))}
          {rows.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.inkSoft, textAlign: 'center', paddingVertical: 24 }}>Nothing to manage with your current role.</Text>
          ) : null}
        </View>

        {/* Not one of the 7 Settings rows from the ticket, but real, existing
            functionality from the old Manage screen — carried forward rather
            than silently dropped. */}
        {page.tier !== 'business_pro' ? (
          <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.goldSoft, padding: 16 }}>
            <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginBottom: 6 }}>Upgrade to Business</Text>
            <Text style={{ fontSize: 12.5, color: colors.inkSoft, lineHeight: 18, marginBottom: 12 }}>
              Unlock competitor benchmarking, extra admin seats, and inbox automation.
            </Text>
            <Pressable
              onPress={() => Alert.alert('Business plans', 'Page-tier billing is a planned follow-up — this is not wired to Stripe yet.')}
              style={{ alignSelf: 'flex-start', backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#fff' }}>See plans</Text>
            </Pressable>
          </View>
        ) : null}

        {viewer.role === 'super_admin' ? (
          <Pressable onPress={handleDeactivate} style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.oxblood }}>Deactivate this Page</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
