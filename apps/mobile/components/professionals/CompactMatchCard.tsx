import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Star } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { resolveMediaUrl } from '@fashub/api-client';
import type { MatchedProfessional } from '@fashub/types';
import { MatchRing } from './MatchRing';
import { MatchBadge } from './MatchBadge';
import { VerifiedBadge, isVerified } from '../VerifiedBadge';
import { formatPrice } from '../../lib/matchFormat';
import { visibleBadges } from '../../lib/matchFormat';

type Props = {
  pro: MatchedProfessional;
  onPress: () => void;
  onViewProfile: () => void;
};

/**
 * Condensed grid-card variant for the two-column ranked-results grid —
 * avatar, name, role badge, match ring, one status badge, rating, price,
 * and a single primary action, per the ticket's explicit compact-card field
 * list. Full detail (description, stat row, full "why this match", all
 * tags, both actions) lives one tap away in the full detail screen.
 */
export function CompactMatchCard({ pro, onPress, onViewProfile }: Props) {
  const avatarUri = resolveMediaUrl(pro.avatar);
  // 'verified' shown as the name-adjacent checkmark instead, matching the
  // rest of the app — excluded from the single compact status-badge slot
  // so it isn't shown twice and doesn't crowd out other real badges.
  const [topBadge] = visibleBadges(pro.badges.filter((b) => b !== 'verified'), 1);

  return (
    <Pressable onPress={onPress} style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: V.line, backgroundColor: V.surface, padding: 12, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ width: 44, height: 44, borderRadius: 13, overflow: 'hidden', backgroundColor: V.primary, alignItems: 'center', justifyContent: 'center' }}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{pro.name.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        <MatchRing score={pro.matchScore} size={32} />
      </View>

      <View style={{ gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: V.ink, flexShrink: 1 }} numberOfLines={1}>{pro.name}</Text>
          {isVerified({ subscriptionTier: pro.subscriptionTier, verified: pro.verified }) ? <VerifiedBadge size="sm" /> : null}
        </View>
        <View style={{ backgroundColor: V.primarySoft, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1.5, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: V.primaryDeep, textTransform: 'capitalize' }}>{pro.type}</Text>
        </View>
      </View>

      {topBadge ? <MatchBadge badge={topBadge} compact /> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Star size={11} color={V.amber} fill={V.amber} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: V.ink }}>{pro.rating.toFixed(1)}</Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '700', color: V.ink }} numberOfLines={1}>{formatPrice(pro)}</Text>
      </View>

      <Pressable onPress={onViewProfile} style={{ backgroundColor: V.primarySoft, borderRadius: 999, paddingVertical: 8, alignItems: 'center' }}>
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: V.primaryDeep }}>View Profile</Text>
      </Pressable>
    </Pressable>
  );
}
