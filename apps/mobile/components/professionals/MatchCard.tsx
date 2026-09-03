import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Star, Clock, Briefcase, Zap, Check, Globe2 } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { resolveMediaUrl } from '@fashub/api-client';
import type { MatchedProfessional } from '@fashub/types';
import { MatchRing } from './MatchRing';
import { MatchBadge } from './MatchBadge';
import { VerifiedBadge, isVerified } from '../VerifiedBadge';
import { formatPrice, formatLocation, visibleBadges, visibleTags } from '../../lib/matchFormat';

type Props = {
  pro: MatchedProfessional;
  rank?: number;
  spotlight?: boolean;
  onViewProfile: () => void;
  onMessage: () => void;
};

/**
 * Full match card — used both for the "Top Pick for You" hero (spotlight=true,
 * rank=1) above the grid, and as the full detail screen's content (tapping a
 * compact grid card). Same component, matching web's own reuse: web renders
 * the identical MatchResultCard for both contexts, just placed differently.
 * Reproduces every field from web's card (see Step 0 report) — nothing
 * trimmed here; only CompactMatchCard.tsx trims fields.
 */
export function MatchCard({ pro, rank, spotlight, onViewProfile, onMessage }: Props) {
  const avatarUri = resolveMediaUrl(pro.avatar);
  // 'verified' is now shown as the name-adjacent checkmark (matching the
  // rest of the app's convention, per this pass's decision) rather than a
  // truncatable text pill here — excluded so it isn't shown twice.
  const badges = visibleBadges(pro.badges.filter((b) => b !== 'verified'), 4);
  const { shown: tags, overflow } = visibleTags(pro.specialties, 5);
  const deliveryLabel = pro.deliveryMode && pro.deliveryMode.length > 0 ? pro.deliveryMode.join(' / ') : null;

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: spotlight ? V.primary : V.line,
        backgroundColor: V.surface,
        overflow: 'hidden',
        shadowColor: spotlight ? V.primary : '#2B1B22',
        shadowOpacity: spotlight ? 0.14 : 0.05,
        shadowRadius: spotlight ? 20 : 14,
        shadowOffset: { width: 0, height: spotlight ? 8 : 6 },
        elevation: spotlight ? 3 : 1,
      }}
    >
      {/* Top accent bar — spotlight only, violet (standardized from web's violet→pink gradient per this pass's decision) */}
      {spotlight ? <View style={{ height: 4, backgroundColor: V.primary }} /> : null}

      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ position: 'relative' }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, overflow: 'hidden', backgroundColor: V.primary, alignItems: 'center', justifyContent: 'center' }}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{pro.name.slice(0, 2).toUpperCase()}</Text>
              )}
            </View>
            {rank ? (
              <View style={{ position: 'absolute', top: -6, left: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: V.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: V.surface }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#fff' }}>{rank}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: V.ink, flexShrink: 1 }} numberOfLines={1}>{pro.name}</Text>
              {isVerified({ subscriptionTier: pro.subscriptionTier, verified: pro.verified }) ? <VerifiedBadge size="sm" /> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: V.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: V.primaryDeep, textTransform: 'capitalize' }}>{pro.type}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <MapPin size={11} color={V.inkFaint} />
                <Text style={{ fontSize: 11, fontWeight: '500', color: V.inkFaint }} numberOfLines={1}>
                  {formatLocation(pro)}
                  {pro.distance != null ? ` · ${pro.distance.toFixed(1)} km` : ''}
                </Text>
              </View>
            </View>
          </View>

          <MatchRing score={pro.matchScore} />
        </View>

        {badges.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {badges.map((b) => <MatchBadge key={b} badge={b} />)}
          </View>
        ) : null}

        {pro.bio ? (
          <Text style={{ fontSize: 13, lineHeight: 19, color: V.inkSoft }}>{pro.bio}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: V.line }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Clock size={13} color={V.inkFaint} />
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: V.ink }}>{pro.yearsExperience ?? 0} yrs</Text>
          </View>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Briefcase size={13} color={V.inkFaint} />
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: V.ink }}>{(pro.completedJobs ?? 0).toLocaleString()} jobs</Text>
          </View>
          {pro.responseTime ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Zap size={13} color={V.inkFaint} />
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: V.ink }} numberOfLines={1}>{pro.responseTime}</Text>
            </View>
          ) : null}
        </View>

        {pro.matchReasons.length > 0 ? (
          <View style={{ backgroundColor: V.primarySoft, borderRadius: 14, padding: 12, gap: 6 }}>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: V.primaryDeep, textTransform: 'uppercase', letterSpacing: 0.6 }}>Why this match</Text>
            {pro.matchReasons.map((reason, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                <Check size={13} color={V.primaryDeep} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontSize: 12.5, color: V.ink }}>{reason}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((tag) => (
              <View key={tag} style={{ backgroundColor: V.canvas, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '500', color: V.inkSoft }}>{tag}</Text>
              </View>
            ))}
            {overflow > 0 ? (
              <View style={{ backgroundColor: V.canvas, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '500', color: V.inkSoft }}>+{overflow}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {(pro.languages?.length || deliveryLabel) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Globe2 size={12} color={V.inkFaint} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: V.inkFaint }} numberOfLines={1}>
              {[pro.languages?.join(', '), deliveryLabel].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Star size={13} color={V.amber} fill={V.amber} />
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: V.ink }}>{pro.rating.toFixed(1)}</Text>
            <Text style={{ fontSize: 11.5, fontWeight: '400', color: V.inkFaint }}>({pro.reviewCount})</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: V.ink }}>{formatPrice(pro)}</Text>
        </View>
        {pro.estimatedTimeline ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -6 }}>
            <Clock size={11} color={V.inkFaint} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: V.inkFaint }}>{pro.estimatedTimeline}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Pressable onPress={onViewProfile} style={{ flex: 1, backgroundColor: V.primary, borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#fff' }}>View Profile</Text>
          </Pressable>
          <Pressable onPress={onMessage} style={{ flex: 1, borderWidth: 1.5, borderColor: V.primary, borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: V.primary }}>Message</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
