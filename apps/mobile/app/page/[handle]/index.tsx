import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronLeft, MapPin, MessageCircle, MoreHorizontal, Sparkle, Scissors, CalendarDays, Plus, BarChart3, Settings as SettingsIcon, Star } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useAuth } from '../../../context/AuthContext';
import { resolveMediaUrl, getPageRatingStats, getPageReviews } from '@fashub/api-client';
import { hasPagePermission } from '@fashub/types';
import type { Review } from '@fashub/types';
import { usePage } from '../../../hooks/usePage';
import { usePageFollow } from '../../../hooks/usePageFollow';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { isVerified } from '../../../components/VerifiedBadge';
import { PageVerifiedBadge } from '../../../components/PageVerifiedBadge';
import PageStatsTab from '../../../components/pages/PageStatsTab';
import { PageReviewsTab } from '../../../components/pages/PageReviewsTab';
import { ReviewsList } from '../../../components/ReviewsList';
import { ServicesBookingCard } from '../../../components/pages/ServicesBookingCard';
import { PageServicesTab } from '../../../components/pages/PageServicesTab';
import { UpcomingBookingsWidget } from '../../../components/pages/UpcomingBookingsWidget';
import { BookingModal } from '../../../components/pages/BookingModal';
import { AvailabilityStatusIndicator } from '../../../components/pages/AvailabilityStatusIndicator';
import { WaitlistModal } from '../../../components/pages/WaitlistModal';
import { getPageAvailabilityStatus, startPageConversation, type AvailabilityStatusData } from '@fashub/api-client';

type TabKey = 'home' | 'about' | 'posts' | 'services' | 'reviews' | 'stats' | 'settings';

// Phase 1 scope, per the confirmed decision — the mock shows 8 tabs
// (Home/About/Posts/Collections/Shop/Services/+2), but the backend only
// supports these three so far. Not a mobile-only cut: this is the same
// reduced scope the backend itself ships. Reviews is real (Page reviews
// ticket — reuses the existing review system). Stats/Settings are added
// below, conditionally, per-viewer (Settings-tab ticket — full mobile parity).
const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'about', label: 'About' },
  { key: 'posts', label: 'Posts' },
  { key: 'services', label: 'Services' },
  { key: 'reviews', label: 'Reviews' },
];

// Purely illustrative placeholders matching the mock's own example content
// ("SS26 Drop", "The Cutting Room", "Fittings") — there's no highlights
// model yet, so these aren't wired to real, editable data. Flagged as a
// follow-up, not silently hidden.
const HIGHLIGHTS = [
  { key: 'drop', label: 'SS26 Drop', Icon: Sparkle },
  { key: 'cutting-room', label: 'The Cutting Room', Icon: Scissors },
  { key: 'fittings', label: 'Fittings', Icon: CalendarDays },
];

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

/**
 * Page — Public View, mirroring the locked mock 1:1 on layout (cover,
 * avatar, identity block, tab row, highlights rail, pinned post, recent
 * activity, admin-only "Manage this page" entry) with two deliberate
 * adaptations from the mock rather than the app's own conventions:
 *  - No duplicate hamburger/FaSHub/bell/avatar header bar — this is a
 *    pushed detail screen like app/profile/[userId].tsx, which uses a
 *    simple back-chevron overlay, not a second copy of the global app
 *    chrome. Reusing that exact pattern per "reuse, don't rebuild".
 *  - The cover's diagonal red pinstripe pattern isn't reproduced (no ad
 *    hoc SVGs, per this ticket's own Step 0 instruction) — falls back to
 *    a solid ink cover when no real coverImage is set, same fallback
 *    shape the existing profile screen uses for its own gradient fallback.
 */
export default function PageProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { colors, typeScale, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = React.useState<TabKey>('home');

  const { page, viewer, loading, error, reload } = usePage(handle);
  const follow = usePageFollow(handle ?? '', viewer?.isFollowing ?? false, page?.followerCount ?? 0);
  const [rating, setRating] = React.useState<{ averageRating: number; totalReviews: number } | null>(null);
  const [reviewsRefreshKey, setReviewsRefreshKey] = React.useState(0);
  const [homeReviewsPreview, setHomeReviewsPreview] = React.useState<Review[]>([]);
  const [bookingModalOpen, setBookingModalOpen] = React.useState(false);
  const [waitlistModalOpen, setWaitlistModalOpen] = React.useState(false);
  const [messaging, setMessaging] = React.useState(false);
  const [availability, setAvailability] = React.useState<AvailabilityStatusData | null>(null);

  React.useEffect(() => {
    if (!page?.id) return;
    getPageRatingStats(page.id)
      .then((r) => setRating({ averageRating: r.averageRating, totalReviews: r.totalReviews }))
      .catch(() => {});
    // Small Home-tab preview, independent of the Reviews tab's own full
    // fetch — Page reviews ticket asked for a reviews section on Home too.
    getPageReviews(page.id, { limit: 2 })
      .then((res) => setHomeReviewsPreview(res.reviews))
      .catch(() => {});
  }, [page?.id, reviewsRefreshKey]);

  // Live Availability Status — the header CTA's fully-booked swap needs
  // the same value the status line itself renders, so it's fetched once
  // here (not duplicated inside the indicator component).
  React.useEffect(() => {
    if (!page?.handle) return;
    getPageAvailabilityStatus(page.handle).then(setAvailability).catch(() => {});
  }, [page?.handle]);

  if (loading && !page) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <LoadingState label="Loading Page…" />
      </SafeAreaView>
    );
  }

  if (error || !page) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
        </View>
        <ErrorState message={error ?? 'Page not found'} onRetry={reload} />
      </SafeAreaView>
    );
  }

  const coverUri = resolveMediaUrl(page.coverImage ?? undefined);
  const avatarUri = resolveMediaUrl(page.avatar ?? undefined);
  const locationLine = [page.city, page.state].filter(Boolean).join(', ');

  // Message icon investigation/fix: this used to have no onPress at all —
  // POST /api/conversations/page/[pageId] also used to reject any caller
  // who wasn't already a Page admin, so even wiring this up wouldn't have
  // worked until that route's authorization was fixed too. Finds/creates
  // the visitor's conversation with this Page and opens the real chat
  // thread — same conversation system the Page's own inbox already uses.
  const startConversation = async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    setMessaging(true);
    try {
      const { conversation } = await startPageConversation(page.id);
      router.push(`/messages/${conversation.id}`);
    } catch {
      // Silent — the button just stops spinning; nothing to recover into.
    } finally {
      setMessaging(false);
    }
  };

  const canViewStats = hasPagePermission(viewer?.role, 'canViewStats');
  const canAccessSettings = hasPagePermission(viewer?.role, 'canAccessSettingsTab');
  const visibleTabs = [
    ...TABS,
    ...(canViewStats ? [{ key: 'stats' as const, label: 'Stats' }] : []),
    ...(canAccessSettings ? [{ key: 'settings' as const, label: 'Settings' }] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ height: 150, backgroundColor: colors.ink }}>
          {coverUri ? <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{ position: 'absolute', top: 10, left: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(20,18,16,0.5)', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} color="#fff" />
          </Pressable>
          <View
            style={{
              position: 'absolute', left: 16, bottom: -36, width: 76, height: 76, borderRadius: 38,
              backgroundColor: colors.ink, borderWidth: 3, borderColor: colors.ivory, overflow: 'hidden',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text style={{ fontSize: 22, fontWeight: '600', color: colors.gold }}>
                {page.name.slice(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
        </View>

        <View style={{ paddingTop: 44, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Typographic parity ticket: matches Profile's h1 exactly
                (typeScale.h1 — 19px/24 line-height, system font, not
                Fraunces — see apps/mobile/app/profile/[userId].tsx). */}
            <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>{page.name}</Text>
            {isVerified({ verified: page.verified }) ? <PageVerifiedBadge size="md" /> : null}
          </View>
          <Text style={{ fontSize: 12.5, color: colors.oxblood, marginTop: 3 }}>
            {['@' + page.handle, page.category, page.kind].filter(Boolean).join(' · ')}
          </Text>
          {page.bio ? (
            <Text style={{ ...typeScale.body, fontFamily: undefined, color: colors.ink, marginTop: 10, lineHeight: 19 }}>{page.bio}</Text>
          ) : null}
          {locationLine ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
              <MapPin size={12} color={colors.inkSoft} />
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>
                {locationLine}
                {page.additionalLocationsCount > 0 ? ` · +${page.additionalLocationsCount} more location${page.additionalLocationsCount > 1 ? 's' : ''}` : ''}
              </Text>
            </View>
          ) : null}

          <AvailabilityStatusIndicator pageHandle={page.handle} data={availability} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{formatCount(follow.followerCount)}</Text>
            <Text style={{ fontSize: 12.5, color: colors.inkSoft }}>Followers</Text>
            {rating && rating.totalReviews > 0 ? (
              <>
                <Text style={{ color: colors.inkSoft }}>·</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Star size={12} color={colors.gold} fill={colors.gold} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{rating.averageRating.toFixed(1)}</Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkSoft }}>({rating.totalReviews})</Text>
                </View>
              </>
            ) : null}
            <Text style={{ color: colors.inkSoft }}>·</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{page.postCount}</Text>
            <Text style={{ fontSize: 12.5, color: colors.inkSoft }}>Posts</Text>
            <Text style={{ color: colors.inkSoft }}>·</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{page.adminCount}</Text>
            <Text style={{ fontSize: 12.5, color: colors.inkSoft }}>People</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
            {availability?.status === 'fully_booked' ? (
              <Pressable onPress={() => setWaitlistModalOpen(true)} style={{ flex: 1, borderWidth: 1, borderColor: colors.gold, borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gold }}>Join Waitlist</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setBookingModalOpen(true)} style={{ flex: 1, backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Book a Fitting</Text>
              </Pressable>
            )}
            <Pressable
              onPress={follow.toggle}
              style={{
                paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999,
                borderWidth: 1, borderColor: follow.isFollowing ? colors.line : colors.ink,
                backgroundColor: follow.isFollowing ? colors.ivoryDeep : 'transparent',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{follow.isFollowing ? 'Following' : 'Follow'}</Text>
            </Pressable>
            <Pressable
              onPress={startConversation}
              disabled={messaging}
              style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', opacity: messaging ? 0.5 : 1 }}
            >
              <MessageCircle size={17} color={colors.ink} />
            </Pressable>
            <Pressable style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
              <MoreHorizontal size={17} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.line }} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
          {visibleTabs.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 12, marginRight: 22, borderBottomWidth: 2, borderBottomColor: active ? colors.gold : 'transparent' }}>
                {t.key === 'stats' ? <BarChart3 size={13} color={active ? colors.gold : colors.inkSoft} /> : null}
                {t.key === 'settings' ? <SettingsIcon size={13} color={active ? colors.gold : colors.inkSoft} /> : null}
                {t.key === 'reviews' ? <Star size={13} color={active ? colors.gold : colors.inkSoft} /> : null}
                <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? colors.gold : colors.inkSoft }}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {tab === 'home' ? (
          <View style={{ padding: spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: 22, marginBottom: spacing.lg }}>
              {HIGHLIGHTS.map(({ key, label, Icon }) => (
                <View key={key} style={{ alignItems: 'center', width: 64 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <Icon size={22} color={colors.gold} />
                  </View>
                  <Text style={{ fontSize: 10.5, color: colors.inkSoft, textAlign: 'center' }} numberOfLines={2}>{label}</Text>
                </View>
              ))}
            </View>

            <ServicesBookingCard pageId={page.id} pageHandle={page.handle} pageName={page.name} onSeeAll={() => setTab('services')} />

            {hasPagePermission(viewer?.role, 'canManageBookings') ? (
              <UpcomingBookingsWidget pageHandle={page.handle} />
            ) : null}

            {/* No pinned-post concept exists yet (depends on the deferred
                composer/actor-picker work) — this is an honest empty state,
                matching the mock's own "+ PINNED" placeholder, not a stand-in
                for real content. */}
            <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16, marginBottom: spacing.lg }}>
              <Plus size={14} color={colors.inkSoft} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkSoft, letterSpacing: 0.4 }}>PINNED</Text>
            </Pressable>

            {/* Section-header role: matches Profile's h2 exactly
                (typeScale.h2, system font). */}
            <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginBottom: 10 }}>Recent activity</Text>
            <View style={{ height: 14, borderRadius: 7, backgroundColor: colors.ivoryDeep, marginBottom: 8 }} />
            <View style={{ height: 14, borderRadius: 7, backgroundColor: colors.ivoryDeep, width: '70%' }} />

            {homeReviewsPreview.length > 0 ? (
              <View style={{ marginTop: spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Reviews</Text>
                  <Pressable onPress={() => setTab('reviews')}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gold }}>Show all</Text>
                  </Pressable>
                </View>
                <ReviewsList reviews={homeReviewsPreview} />
              </View>
            ) : null}
          </View>
        ) : tab === 'about' ? (
          <View style={{ padding: spacing.lg }}>
            <Text style={{ ...typeScale.body, fontFamily: undefined, color: colors.ink, lineHeight: 20 }}>
              {page.bio || 'This Page hasn’t added an About section yet.'}
            </Text>
          </View>
        ) : tab === 'services' ? (
          <View style={{ padding: spacing.lg }}>
            <PageServicesTab pageId={page.id} pageHandle={page.handle} pageName={page.name} />
          </View>
        ) : tab === 'reviews' ? (
          <View style={{ padding: spacing.lg }}>
            <PageReviewsTab
              pageId={page.id}
              pageName={page.name}
              rating={rating}
              currentUser={user ? { id: user.id, displayName: user.displayName, avatar: user.avatar ?? null, role: user.role } : null}
              canReview={!!user && !viewer?.isAdmin}
              refreshKey={reviewsRefreshKey}
              onSubmitted={() => setReviewsRefreshKey((k) => k + 1)}
            />
          </View>
        ) : tab === 'stats' && canViewStats ? (
          <View style={{ padding: spacing.lg }}>
            <PageStatsTab handle={page.handle} pageTier={page.tier} postCount={page.postCount} />
          </View>
        ) : tab === 'settings' && canAccessSettings ? (
          <View style={{ padding: spacing.lg, alignItems: 'center', gap: 10 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center' }}>
              <SettingsIcon size={20} color={colors.gold} />
            </View>
            <Text style={{ fontSize: 13, color: colors.inkSoft, textAlign: 'center', maxWidth: 260 }}>
              Manage admins, roles, restricted members, and more from the Settings hub.
            </Text>
            <Pressable
              onPress={() => router.push(`/page/${page.handle}/manage`)}
              style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 11, marginTop: 4 }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#fff' }}>Open Settings</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ padding: spacing.lg, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.inkSoft, textAlign: 'center' }}>
              No posts yet — posting as this Page isn't available yet.
            </Text>
          </View>
        )}
      </ScrollView>

      <BookingModal
        visible={bookingModalOpen}
        pageHandle={page.handle}
        pageName={page.name}
        onClose={() => setBookingModalOpen(false)}
      />
      <WaitlistModal
        visible={waitlistModalOpen}
        pageHandle={page.handle}
        pageName={page.name}
        onClose={() => setWaitlistModalOpen(false)}
      />
    </SafeAreaView>
  );
}
