import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { resolveMediaUrl } from '@fashub/api-client';

export interface AvatarStackProfile {
  id: string;
  displayName: string;
  avatar?: string | null;
}

/**
 * Overlapping-face stack + "+N" overflow bubble — RN has no `-space-x-*`
 * utility, so overlap is done with explicit negative `marginLeft` on every
 * avatar after the first, descending `zIndex` so earlier faces sit on top,
 * and a white border as the separator — the same visual convention as
 * web's components/ui/AvatarStack.tsx. No initials-fallback avatar
 * component exists to reuse app-wide, so this falls back to the first
 * letter of the display name on a solid violet tile, matching the
 * initials-fallback pattern already used in PostCard/EventCard elsewhere.
 */
export function AvatarStack({
  profiles,
  totalCount,
  max = 3,
  size = 22,
}: {
  profiles: AvatarStackProfile[];
  /** Real total (e.g. attendeeCount) — may exceed profiles.length, which is only a preview sample. */
  totalCount?: number;
  max?: number;
  size?: number;
}) {
  const shown = profiles.slice(0, max);
  const overflow = Math.max((totalCount ?? profiles.length) - shown.length, 0);

  if (shown.length === 0) return null;

  const overlap = Math.round(size * 0.35);

  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((p, i) => {
        const avatarUri = resolveMediaUrl(p.avatar);
        return (
          <View
            key={p.id}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: '#6D28D9',
              borderWidth: 1.5,
              borderColor: '#fff',
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: shown.length - i,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text style={{ fontSize: size * 0.42, fontWeight: '700', color: '#fff' }}>
                {p.displayName.slice(0, 1).toUpperCase()}
              </Text>
            )}
          </View>
        );
      })}
      {overflow > 0 && (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#EDE4FB',
            borderWidth: 1.5,
            borderColor: '#fff',
            marginLeft: -overlap,
            zIndex: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: '#6D28D9' }}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}
