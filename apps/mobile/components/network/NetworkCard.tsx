import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, MessageCircle, Star } from 'lucide-react-native';
import { resolveMediaUrl } from '@fashub/api-client';
import { ROLE_COLORS, ROLE_COLOR_FALLBACK, type NetworkProfile } from '@fashub/types';
import { VerifiedBadge, isVerified } from '../VerifiedBadge';

const AVAILABILITY_DOT: Record<string, string> = {
  available: '#22C55E',
  busy: '#F59E0B',
  unavailable: '#9CA3AF',
};

/**
 * Compact two-up grid card — 1:1 port of the approved mockup's "two-up"
 * variant (fashub_network_card_v5_avatar_on_cover.html), not the larger
 * single-card variant also in that file. Per the mockup's own two-up
 * layout, the favorite/heart action and the review-count-in-parens are
 * dropped from THIS compact card (mockup only shows them on the larger
 * single card) — both remain reachable on the Public Profile page.
 */
export function NetworkCard({
  profile,
  distanceKm,
  isFollowing,
  onToggleFollow,
  onMessage,
  onPress,
}: {
  profile: NetworkProfile;
  distanceKm: number | null;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onMessage: () => void;
  onPress: () => void;
}) {
  const roleColor = ROLE_COLORS[profile.role] ?? ROLE_COLOR_FALLBACK;
  const avatarUri = resolveMediaUrl(profile.avatar);
  const tags = profile.specialties.length > 0 ? profile.specialties : profile.stylePreferences;
  const dotColor = AVAILABILITY_DOT[profile.availabilityStatus] ?? AVAILABILITY_DOT.available;

  return (
    <Pressable onPress={onPress} style={{ flex: 1, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#ece6db', borderRadius: 14, overflow: 'hidden' }}>
      <View style={{ height: 44 }}>
        <LinearGradient colors={['#7C3AED', '#a855f7', '#e0459b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} style={{ width: '100%', height: '100%' }} />
        {distanceKm != null ? (
          <View style={{ position: 'absolute', top: 5, left: 6, backgroundColor: '#141210', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ fontSize: 8, fontWeight: '600', color: '#fff' }}>{distanceKm < 1 ? '<1 km' : `${Math.round(distanceKm)} km`}</Text>
          </View>
        ) : null}
        <View style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 3.5, backgroundColor: dotColor, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)' }} />
        <View style={{ position: 'absolute', left: 9, bottom: -18, width: 42, height: 42, borderRadius: 11, backgroundColor: '#8B5CF6', borderWidth: 2.5, borderColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowColor: '#141210', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 4, zIndex: 2 }}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{profile.displayName.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
      </View>

      <View style={{ paddingTop: 24, paddingHorizontal: 9, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ fontWeight: '700', fontSize: 12, color: '#141210', lineHeight: 15, flexShrink: 1 }} numberOfLines={1}>
            {profile.displayName}
          </Text>
          {isVerified({ subscriptionTier: profile.subscriptionTier, verified: profile.isVerified }) ? <VerifiedBadge size="sm" /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <View style={{ backgroundColor: roleColor.bg, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Text style={{ fontSize: 8, fontWeight: '600', color: roleColor.text, textTransform: 'capitalize' }}>{profile.role}</Text>
          </View>
          {profile.rating > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Star size={8} color="#C6A15B" fill="#C6A15B" />
              <Text style={{ fontSize: 9, fontWeight: '600', color: '#141210' }}>{profile.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        {profile.bio ? (
          <Text style={{ fontSize: 9, fontWeight: '400', lineHeight: 12.5, color: 'rgba(20,18,16,0.55)', marginTop: 5, height: 25 }} numberOfLines={2}>
            {profile.bio}
          </Text>
        ) : null}
        {tags.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
            <View style={{ backgroundColor: '#F3EDFB', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 8, fontWeight: '500', color: '#6D28D9' }} numberOfLines={1}>
                {tags[0]}
              </Text>
            </View>
            {tags.length > 1 ? (
              <View style={{ backgroundColor: '#EFE9DE', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 8, fontWeight: '400', color: '#6B6459' }}>{`+${tags.length - 1}`}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <MapPin size={9} color="#A78BFA" />
          <Text style={{ fontSize: 8, fontWeight: '400', color: 'rgba(20,18,16,0.5)' }} numberOfLines={1}>
            {[profile.city, profile.yearsOfExperience ? `${profile.yearsOfExperience}y` : null].filter(Boolean).join(' · ') || 'Location unknown'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
          <Pressable onPress={onToggleFollow} style={{ flex: 1, backgroundColor: isFollowing ? '#EFE9DE' : '#6D28D9', borderRadius: 15, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 9.5, fontWeight: '600', color: isFollowing ? '#6B6459' : '#fff' }}>{isFollowing ? 'Following' : '+ Follow'}</Text>
          </Pressable>
          <Pressable onPress={onMessage} style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#F3EDFB', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={12} color="#6D28D9" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
