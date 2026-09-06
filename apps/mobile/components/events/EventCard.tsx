import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Clock, MapPin, Users, Bookmark, Check, Plus } from 'lucide-react-native';
import { violetColors as VF } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { resolveMediaUrl, toggleSavedItem, attendEvent, unattendEvent } from '@fashub/api-client';
import type { EventListItem } from '@fashub/types';
import { EVENT_CATEGORY_LABELS } from '@fashub/types';
import { VerifiedBadge, isVerified } from '../VerifiedBadge';

function formatEventDate(startDate: string, endDate?: string | null) {
  const start = new Date(startDate);
  const now = new Date();
  const end = endDate ? new Date(endDate) : null;
  const isPast = (end ?? start).getTime() < now.getTime();
  const isOngoing = !isPast && start.getTime() <= now.getTime();
  const daysUntil = Math.ceil((start.getTime() - now.getTime()) / 86_400_000);
  let relative: string | null = null;
  if (isPast) relative = null;
  else if (isOngoing) relative = 'Now';
  else if (daysUntil === 0) relative = 'Today';
  else if (daysUntil === 1) relative = 'Tomorrow';
  else if (daysUntil <= 7) relative = `In ${daysUntil} days`;
  return { start, isPast, isOngoing, relative };
}

function formatPrice(isFree: boolean, price?: number | null, currency: string = 'USD') {
  if (isFree) return 'FREE';
  if (price == null) return null;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

/**
 * Full-width single-column card (not a forced grid, per this ticket's own
 * mobile-layout instruction) — same field set as web's EventCard.tsx,
 * reused unmodified in the main list, category-grouped sections, and the
 * Recommended rail. Category labels come from EVENT_CATEGORY_LABELS
 * (hand-written, not title-cased from the enum — confirmed against web).
 * Uses the app's shared theme tokens (useTheme()) — not a separate literal
 * palette — so this matches every other screen's violet/ink/ivory system.
 */
export function EventCard({
  event,
  userId,
  initialSaved = false,
  matchScore,
  onAttend,
}: {
  event: EventListItem;
  userId?: string;
  initialSaved?: boolean;
  matchScore?: number | null;
  onAttend?: (eventId: string, attending: boolean) => void;
}) {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [attending, setAttending] = useState(!!event.isAttending);
  const imageUri = resolveMediaUrl(event.image);
  const { start, isPast, isOngoing, relative } = formatEventDate(event.startDate, event.endDate);
  const priceLabel = formatPrice(event.isFree, event.price, event.currency);
  const almostFull = event.capacity != null && event.attendeeCount >= event.capacity * 0.9;

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

  const handleAttend = async () => {
    if (!userId) return;
    const next = !attending;
    setAttending(next);
    try {
      if (next) await attendEvent(event.id, userId);
      else await unattendEvent(event.id, userId);
      onAttend?.(event.id, next);
    } catch {
      setAttending(!next);
    }
  };

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
      style={{ backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.line, overflow: 'hidden' }}
    >
      <View style={{ width: '100%', aspectRatio: 1.6, backgroundColor: colors.ivoryDeep }}>
        {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}

        {isPast ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(27,21,35,0.55)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.5 }}>PAST EVENT</Text>
          </View>
        ) : isOngoing ? (
          <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: colors.oxblood, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#fff' }}>● Happening Now</Text>
          </View>
        ) : null}

        <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Text style={{ fontSize: 9.5, fontWeight: '600', color: colors.ink }}>{EVENT_CATEGORY_LABELS[event.category]}</Text>
        </View>

        {!isPast && !isOngoing && priceLabel ? (
          <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: event.isFree ? '#059669' : 'rgba(27,21,35,0.75)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#fff' }}>{priceLabel}</Text>
          </View>
        ) : null}

        <View style={{ position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ backgroundColor: colors.ink, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' }}>
            <Text style={{ fontSize: 8.5, fontWeight: '700', color: colors.goldSoft, textTransform: 'uppercase' }}>{start.toLocaleDateString('en-US', { month: 'short' })}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{start.getDate()}</Text>
          </View>
          {relative ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 9, fontWeight: '600', color: colors.ink }}>{relative}</Text>
            </View>
          ) : null}
        </View>

        {matchScore != null ? (
          <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{Math.round(matchScore)}% MATCH</Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }} numberOfLines={2}>{event.title}</Text>
        {event.shortDescription || event.description ? (
          <Text style={{ fontSize: 12.5, fontWeight: '400', color: colors.inkSoft, lineHeight: 17 }} numberOfLines={2}>
            {event.shortDescription || event.description}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Clock size={13} color={VF.inkFaint} />
          <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.inkSoft }}>
            {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            {event.venueName ? ` · ${event.venueName}` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MapPin size={13} color={VF.inkFaint} />
          <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.inkSoft }} numberOfLines={1}>
            {[event.city, event.state, event.country].filter(Boolean).join(', ')}
            {event.distance != null ? ` · ${Math.round(event.distance)} km` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Users size={13} color={almostFull ? colors.oxblood : VF.inkFaint} />
          <Text style={{ fontSize: 11.5, fontWeight: '500', color: almostFull ? colors.oxblood : colors.inkSoft }}>
            {event.attendeeCount}{event.capacity ? `/${event.capacity}` : ''} attending{almostFull ? ' · Almost full' : ''}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line, marginTop: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.gold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              {event.organizer?.avatar ? (
                <Image source={{ uri: resolveMediaUrl(event.organizer.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{(event.organizer?.displayName ?? event.organizerName ?? '?').slice(0, 1).toUpperCase()}</Text>
              )}
            </View>
            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.inkSoft, flexShrink: 1 }} numberOfLines={1}>
              {event.organizer?.displayName ?? event.organizerName ?? 'FaSHub'}
            </Text>
            {event.organizer && isVerified({ subscriptionTier: event.organizer.subscriptionTier }) ? <VerifiedBadge size="sm" /> : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {userId ? (
              <Pressable onPress={handleSave} hitSlop={6}>
                <Bookmark size={17} color={saved ? colors.gold : VF.inkFaint} fill={saved ? colors.gold : 'transparent'} />
              </Pressable>
            ) : null}
            {isPast ? (
              <View style={{ backgroundColor: '#E5E5E5', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#888' }}>Ended</Text>
              </View>
            ) : userId ? (
              <Pressable
                onPress={handleAttend}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: attending ? '#059669' : colors.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}
              >
                {attending ? <Check size={12} color="#fff" /> : <Plus size={12} color="#fff" />}
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#fff' }}>{attending ? 'Attending' : 'Attend'}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push(`/event/${event.id}`)} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.line }}>
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.ink }}>View</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
