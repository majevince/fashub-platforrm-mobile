import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, MapPin, Star, Heart, MessageCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, getRatingStats, resolveMediaUrl, followUser, findOrCreateConversation, ApiError } from '@fashub/api-client';
import type { ProfileDetail } from '@fashub/types';
import { ROLE_COLORS, ROLE_COLOR_FALLBACK } from '@fashub/types';
import { useFollowingIds } from '../../hooks/useFollowingIds';
import { useLocalFavorites } from '../../hooks/useLocalFavorites';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { VerifiedBadge, isVerified } from '../../components/VerifiedBadge';
import { AboutTab } from '../../components/publicProfile/AboutTab';
import { PortfolioTab } from '../../components/publicProfile/PortfolioTab';
import { ProjectsTab } from '../../components/publicProfile/ProjectsTab';
import { ServicesTab } from '../../components/publicProfile/ServicesTab';
import { ReviewsTab } from '../../components/publicProfile/ReviewsTab';
import { StatsTab } from '../../components/publicProfile/StatsTab';
import { InventoryTab } from '../../components/publicProfile/InventoryTab';
import { PhotoLightbox } from '../../components/PhotoLightbox';

const AVAILABILITY_RIBBON: Record<string, { label: string; bg: string }> = {
  available: { label: 'Available for bookings', bg: '#15803D' },
  busy: { label: 'Currently busy', bg: '#B45309' },
  unavailable: { label: 'Not taking bookings', bg: '#DC2626' },
};

const AVAILABILITY_LABEL: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: '#22C55E' },
  busy: { label: 'Busy', color: '#F59E0B' },
  unavailable: { label: 'Unavailable', color: '#9CA3AF' },
};

type TabKey = 'about' | 'portfolio' | 'projects' | 'services' | 'reviews' | 'stats' | 'inventory';

/**
 * The public profile page referenced (but never built) three tickets ago
 * when avatar-tap navigation was flagged as blocked — this closes that
 * gap. Tab set/order/gating ported exactly as confirmed from
 * app/profile/[userId]/page.tsx: About → Portfolio → Projects → Reviews →
 * Stats → Inventory, with Projects/Reviews/Inventory restricted to
 * designer/tailor and Portfolio/Stats gated by the profile's own privacy
 * flags. Stats tab is a flagged simplification — see StatsTab.tsx.
 */
export default function PublicProfileScreen() {
  const { userId, tab: initialTab } = useLocalSearchParams<{ userId: string; tab?: string }>();
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [rating, setRating] = useState<{ averageRating: number; totalReviews: number } | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>((initialTab as TabKey) || 'about');
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);
  const [coverViewerOpen, setCoverViewerOpen] = useState(false);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);

  const { followingIds, setFollowing } = useFollowingIds(user?.id);
  const { likedIds, toggleLike } = useLocalFavorites(user?.id);

  const load = () => {
    if (!userId || !user) return;
    setError('');
    Promise.all([getUserProfile(userId, user.id), getRatingStats(userId).catch(() => null)])
      .then(([p, r]) => {
        setProfile(p);
        if (r) setRating(r);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load this profile."));
  };

  useEffect(load, [userId, user]);

  if (!user || !userId) return null;

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
        </View>
        <ErrorState message={error} onRetry={load} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  const isOwner = profile.id === user.id;
  const professionalDetail = profile.role === 'designer' ? profile.designerProfile : profile.role === 'tailor' ? profile.tailorProfile : null;
  const isProfessional = profile.role === 'designer' || profile.role === 'tailor';
  const privacy = profile.privacySettings;
  const roleColor = ROLE_COLORS[profile.role] ?? ROLE_COLOR_FALLBACK;
  const isFollowing = followingIds.has(profile.id);
  const isLiked = likedIds.has(profile.id);
  const availability = professionalDetail?.availabilityStatus ? AVAILABILITY_LABEL[professionalDetail.availabilityStatus] : null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'about', label: 'About' },
    ...(privacy?.showPortfolio !== false || isOwner ? [{ key: 'portfolio' as const, label: 'Portfolio' }] : []),
    ...(isProfessional && (privacy?.showProjects !== false || isOwner) ? [{ key: 'projects' as const, label: 'Projects' }] : []),
    // Web's designer/tailor pages disagree on where this tab sits relative
    // to Projects (after, for designer; before, for tailor) — one consistent
    // order is used here rather than forking the tab bar per role.
    ...(isProfessional ? [{ key: 'services' as const, label: 'Services' }] : []),
    ...(isProfessional && (privacy?.allowReviews !== false || isOwner) ? [{ key: 'reviews' as const, label: 'Reviews' }] : []),
    ...(privacy?.showStats !== false || isOwner ? [{ key: 'stats' as const, label: 'Stats' }] : []),
    ...(isProfessional ? [{ key: 'inventory' as const, label: 'Inventory' }] : []),
  ];

  const handleToggleFollow = async () => {
    const was = isFollowing;
    setFollowing(profile.id, !was);
    try {
      await followUser(profile.id, user.id);
      load();
    } catch {
      setFollowing(profile.id, was);
    }
  };

  const handleMessage = async () => {
    try {
      const { conversation } = await findOrCreateConversation(user.id, profile.id);
      router.push(`/messages/${conversation.id}`);
    } catch {
      Alert.alert("Couldn't open conversation", 'Please try again.');
    }
  };

  const coverUri = resolveMediaUrl(profile.coverPhoto);
  const avatarUri = resolveMediaUrl(profile.avatar);
  const coverPosition = profile.coverPhotoPosition;
  const ribbon = professionalDetail?.availabilityStatus ? AVAILABILITY_RIBBON[professionalDetail.availabilityStatus] : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ height: 130 }}>
          <Pressable onPress={() => coverUri && setCoverViewerOpen(true)} disabled={!coverUri} style={{ width: '100%', height: '100%' }}>
            {coverUri ? (
              <Image
                source={{ uri: coverUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                contentPosition={coverPosition ? { top: `${coverPosition.y}%`, left: `${coverPosition.x}%` } : undefined}
              />
            ) : (
              <LinearGradient colors={['#7C3AED', '#a855f7', '#e0459b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} style={{ width: '100%', height: '100%' }} />
            )}
          </Pressable>
          {ribbon ? (
            <View style={{ position: 'absolute', top: 10, right: 12, backgroundColor: ribbon.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#fff' }}>{ribbon.label}</Text>
            </View>
          ) : null}
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: 'absolute', top: 10, left: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(20,18,16,0.5)', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => avatarUri && setAvatarViewerOpen(true)}
            disabled={!avatarUri}
            style={{ position: 'absolute', left: 16, bottom: -32, width: 72, height: 72, borderRadius: 18, backgroundColor: colors.oxblood, borderWidth: 3, borderColor: colors.ivory, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>{profile.displayName.slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
            {availability ? (
              <View pointerEvents="none" style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: availability.color, borderWidth: 2, borderColor: colors.ivory }} />
            ) : null}
          </Pressable>
        </View>

        <View style={{ paddingTop: 40, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>{profile.displayName}</Text>
            {isVerified({ subscriptionTier: profile.subscriptionTier, verified: profile.isVerified }) ? <VerifiedBadge size="md" /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: roleColor.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: roleColor.text, textTransform: 'capitalize' }}>{profile.role}</Text>
            </View>
            {availability ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: availability.color }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkSoft }}>{availability.label}</Text>
              </View>
            ) : null}
            {rating && rating.totalReviews > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Star size={12} color={colors.gold} fill={colors.gold} />
                <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.ink }}>{rating.averageRating.toFixed(1)}</Text>
                <Text style={{ fontSize: 10.5, fontWeight: '400', color: colors.inkSoft }}>({rating.totalReviews})</Text>
              </View>
            ) : null}
            {professionalDetail && 'yearsOfExperience' in professionalDetail && professionalDetail.yearsOfExperience ? (
              <View style={{ backgroundColor: '#F3EDFB', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6D28D9' }}>{professionalDetail.yearsOfExperience} yrs experience</Text>
              </View>
            ) : null}
          </View>
          {professionalDetail?.city || professionalDetail?.country ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <MapPin size={12} color={colors.inkSoft} />
              <Text style={{ fontSize: 12, fontWeight: '400', color: colors.inkSoft }}>{[professionalDetail?.city, professionalDetail?.country].filter(Boolean).join(', ')}</Text>
            </View>
          ) : null}

          {!isOwner ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Pressable onPress={handleToggleFollow} style={{ flex: 1, backgroundColor: isFollowing ? colors.ivoryDeep : colors.gold, borderRadius: 999, paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: isFollowing ? colors.ink : '#fff' }}>{isFollowing ? 'Following' : '+ Follow'}</Text>
              </Pressable>
              <Pressable onPress={handleMessage} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={18} color={colors.gold} />
              </Pressable>
              <Pressable onPress={() => toggleLike(profile.id)} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={18} color={isLiked ? colors.oxblood : colors.inkSoft} fill={isLiked ? colors.oxblood : 'transparent'} />
              </Pressable>
            </View>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.line }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 18 }}>
          {tabs.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: tab === t.key ? colors.gold : 'transparent' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: tab === t.key ? colors.ink : colors.inkSoft }}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ padding: spacing.lg }}>
          {tab === 'about' ? <AboutTab profile={profile} professionalDetail={professionalDetail} isOwner={isOwner} /> : null}
          {tab === 'portfolio' ? <PortfolioTab professionalDetail={professionalDetail} showPortfolio={privacy?.showPortfolio !== false || isOwner} /> : null}
          {tab === 'projects' ? <ProjectsTab userId={profile.id} role={profile.role as 'designer' | 'tailor'} showProjects={privacy?.showProjects !== false || isOwner} /> : null}
          {tab === 'services' ? <ServicesTab professionalDetail={professionalDetail} /> : null}
          {tab === 'reviews' ? (
            <ReviewsTab
              profile={profile}
              rating={rating}
              currentUser={user}
              isOwner={isOwner}
              allowReviews={privacy?.allowReviews !== false}
              refreshKey={reviewsRefreshKey}
              onSubmitted={() => {
                setReviewsRefreshKey((k) => k + 1);
                load();
              }}
            />
          ) : null}
          {tab === 'stats' ? (
            <StatsTab
              profile={profile}
              professionalDetail={professionalDetail}
              rating={rating}
              showStats={privacy?.showStats !== false || isOwner}
              isOwner={isOwner}
              isPro={profile.subscriptionTier === 'pro' || profile.subscriptionTier === 'business'}
            />
          ) : null}
          {tab === 'inventory' ? <InventoryTab userId={profile.id} /> : null}
        </View>
      </ScrollView>

      {coverUri ? (
        <PhotoLightbox visible={coverViewerOpen} uri={coverUri} title={profile.displayName} onClose={() => setCoverViewerOpen(false)} />
      ) : null}
      {avatarUri ? (
        <PhotoLightbox visible={avatarViewerOpen} uri={avatarUri} title={profile.displayName} subtitle={profile.role} onClose={() => setAvatarViewerOpen(false)} />
      ) : null}
    </SafeAreaView>
  );
}
