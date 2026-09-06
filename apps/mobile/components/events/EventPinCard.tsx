import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bookmark, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { resolveMediaUrl, toggleSavedItem } from '@fashub/api-client';
import type { EventListItem } from '@fashub/types';
import { EVENT_CATEGORY_LABELS } from '@fashub/types';

/**
 * Mobile adaptation of web's Zillow-style anchored photo-card popup
 * (components/events/EventsMapView.tsx) — same content (cover image,
 * category badge, save icon, carousel dots, price/location/date, "View
 * event"), but rendered as a bottom overlay above the map rather than a
 * popup anchored to the pin's screen position, since there's no
 * screen-space to anchor a floating card to on a phone. Tap instead of
 * hover, per the ticket's own touch-interaction note — this app has no
 * hover state to mirror, so tap opens directly to the persistent
 * (pinned/selected) state web reserves for clicks. Uses the app's shared
 * theme tokens, not a separate literal palette.
 */
export function EventPinCard({ event, userId, onClose }: { event: EventListItem; userId?: string; onClose: () => void }) {
  const { colors, typeScale, radius } = useTheme();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const imageUri = resolveMediaUrl(event.image);
  const start = new Date(event.startDate);
  const priceLabel = event.isFree ? 'Free' : event.price != null ? `$${Math.round(event.price)}` : null;
  const photoCount = Math.max(1, (event.images ?? []).length || (event.image ? 1 : 0));

  const handleSave = async () => {
    if (!userId) return;
    const next = !saved;
    setSaved(next);
    try {
      await toggleSavedItem(userId, event.id, 'EVENT');
    } catch {
      setSaved(!next);
    }
  };

  return (
    <View
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
        backgroundColor: colors.paper,
        borderRadius: radius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <View style={{ height: 120, backgroundColor: colors.ivoryDeep }}>
        {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}

        <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 9.5, fontWeight: '600', color: colors.ink }}>{EVENT_CATEGORY_LABELS[event.category]}</Text>
        </View>

        <Pressable onPress={onClose} hitSlop={8} style={{ position: 'absolute', top: 8, right: 40, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          <X size={13} color={colors.ink} />
        </Pressable>
        {userId ? (
          <Pressable onPress={handleSave} hitSlop={8} style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
            <Bookmark size={13} color={saved ? colors.gold : colors.ink} fill={saved ? colors.gold : 'transparent'} />
          </Pressable>
        ) : null}

        {photoCount > 1 ? (
          <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            {Array.from({ length: photoCount }).map((_, i) => (
              <View key={i} style={{ width: i === 0 ? 12 : 5, height: 5, borderRadius: 3, backgroundColor: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)' }} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ padding: 12, gap: 6 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{event.title}</Text>
        <Text style={{ ...typeScale.label, fontWeight: '600', color: colors.inkSoft, letterSpacing: 0 }}>
          {[event.city, event.state].filter(Boolean).join(', ')} · {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {priceLabel ?? EVENT_CATEGORY_LABELS[event.category]}
        </Text>
        <Pressable onPress={() => router.push(`/event/${event.id}`)} style={{ backgroundColor: colors.gold, borderRadius: 10, paddingVertical: 9, alignItems: 'center', marginTop: 4 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ivory }}>View event</Text>
        </Pressable>
      </View>
    </View>
  );
}
