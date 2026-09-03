import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { resolveMediaUrl } from '@fashub/api-client';

type Size = 'sm' | 'md' | 'lg';
const DIM: Record<Size, number> = { sm: 32, md: 42, lg: 56 };
const BADGE: Record<Size, number> = { sm: 13, md: 16, lg: 18 };

function isProTier(tier?: string | null): boolean {
  return tier === 'pro' || tier === 'business';
}

/**
 * 1:1 port of web's VerifiedAvatarBadge.tsx: bottom-right overlay is EITHER
 * a violet Creator-Pro checkmark badge (if isPro) OR an online/offline dot
 * (green-500/gray-300) — never both. Pass `onlineStatus={null}` to omit the
 * dot entirely (matches web's optional prop).
 */
export function AvatarPresence({
  uri,
  name,
  size = 'md',
  subscriptionTier,
  onlineStatus,
}: {
  uri?: string | null;
  name: string;
  size?: Size;
  subscriptionTier?: string | null;
  onlineStatus?: 'online' | 'offline' | null;
}) {
  const dim = DIM[size];
  const resolved = resolveMediaUrl(uri);
  const isPro = isProTier(subscriptionTier);
  const badgeDim = BADGE[size];

  return (
    <View style={{ width: dim, height: dim }}>
      <View style={{ width: dim, height: dim, borderRadius: dim / 2, backgroundColor: V.primary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {resolved ? (
          <Image source={{ uri: resolved }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <Text style={{ fontWeight: '700', fontSize: dim * 0.36, color: '#fff' }}>{name.slice(0, 2).toUpperCase()}</Text>
        )}
      </View>
      {isPro ? (
        <View
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: badgeDim,
            height: badgeDim,
            borderRadius: badgeDim / 2,
            backgroundColor: V.primary,
            borderWidth: 2,
            borderColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={badgeDim * 0.6} color="#fff" strokeWidth={3} />
        </View>
      ) : onlineStatus ? (
        <View
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: badgeDim - 3,
            height: badgeDim - 3,
            borderRadius: (badgeDim - 3) / 2,
            backgroundColor: onlineStatus === 'online' ? '#22C55E' : '#D1D5DB',
            borderWidth: 2,
            borderColor: '#fff',
          }}
        />
      ) : null}
    </View>
  );
}
