import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { CalendarDays, ChevronDown, MapPin, Ticket, Banknote, Users, ArrowRight } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { getEvent, resolveMediaUrl } from '@fashub/api-client';
import type { EventDetail } from '@fashub/types';
import type { EventPostMeta } from '../../lib/eventPost';

const fmt = (n: number) => n.toLocaleString('en-US');

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

function formatPrice(price?: string | null, currency?: string | null): string {
  if (!price) return '';
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(num);
  } catch {
    return `${currency || 'USD'} ${num.toFixed(2)}`;
  }
}

function countryName(code?: string | null): string {
  if (!code) return '';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

type Props = {
  event: EventPostMeta;
  /** Post author — the organizer until the live event loads. */
  organizerName: string;
  organizerAvatar?: string | null;
  viewerId?: string;
  /** Starts expanded (post detail screen) instead of collapsed (feed). */
  defaultExpanded?: boolean;
};

/**
 * The event details block for an event-announcement post — the mobile
 * counterpart to web's EventDetailsCard. Badge strip (violet category, grey
 * status, green admission), organizer row, date/time, attendance with a
 * progress bar, and an inline "View event details" link to the full event
 * screen (app/event/[id].tsx). Collapsed = badges + date/time; expanded adds
 * organizer, attendance and the link. Values come from the post's snapshot,
 * refreshed from the live event (without counting a view) when it loads.
 */
export function EventPostCard({ event, organizerName, organizerAvatar, viewerId, defaultExpanded = false }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [live, setLive] = useState<EventDetail | null>(null);

  useEffect(() => {
    if (!event.eventId) return;
    let cancelled = false;
    getEvent(event.eventId, viewerId, { countView: false })
      .then((e) => { if (!cancelled) setLive(e); })
      .catch(() => {}); // snapshot stays on screen
    return () => { cancelled = true; };
  }, [event.eventId, viewerId]);

  const start = live?.startDate ?? event.startDateTime ?? null;
  const end = live?.endDate ?? null;
  const isPast = start ? new Date(end ?? start).getTime() < Date.now() : false;

  const count = live?.attendeeCount ?? event.attendeeCount ?? 0;
  const capRaw = live?.capacity ?? event.capacity;
  const cap = capRaw ? parseInt(String(capRaw), 10) : null;
  const fill = cap && cap > 0 ? Math.min(count / cap, 1) : null;

  const dateLabel = start
    ? new Date(start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : event.date ?? null;
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const timeLabel = start ? (end ? `${timeOf(start)} – ${timeOf(end)}` : timeOf(start)) : event.time ?? null;

  const orgName = live?.organizer?.displayName ?? live?.organizerName ?? organizerName;
  const orgAvatar = live?.organizer?.avatar ?? organizerAvatar ?? null;

  const place = event.location && event.location !== 'Virtual Event'
    ? (() => {
        if (!event.countryCode) return event.location;
        const parts = event.location.split(', ');
        const rest = parts.length > 1 ? parts.slice(0, -1) : parts;
        return [...rest, countryName(event.countryCode)].join(', ');
      })()
    : event.isVirtual ? 'Virtual event' : '';
  const location = [event.venueName, place].filter(Boolean).join(' · ');

  const isFree = event.price === 'Free admission';
  const admission = event.price ? (isFree ? 'Free admission' : formatPrice(event.price, event.currency)) : null;

  const badge = (bg: string, fg: string) => ({
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5,
    backgroundColor: bg, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6,
  });
  const badgeText = (fg: string) => ({ fontSize: 12, fontWeight: '600' as const, color: fg });

  return (
    <View style={{ backgroundColor: V.surface, borderRadius: 16, borderWidth: 1, borderColor: V.line, overflow: 'hidden' }}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? 'Hide event details' : 'Show event details'}
        style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingVertical: 10 }}
      >
        <View style={badge(V.primarySoft, V.primaryDeep)}>
          <CalendarDays size={13} color={V.primaryDeep} />
          <Text style={badgeText(V.primaryDeep)}>{event.category}</Text>
        </View>
        {isPast ? (
          <View style={badge(V.canvas, V.inkFaint)}>
            <Text style={badgeText(V.inkFaint)}>Event ended</Text>
          </View>
        ) : null}
        {event.isVirtual ? (
          <View style={badge(V.canvas, V.inkSoft)}>
            <Text style={badgeText(V.inkSoft)}>Virtual</Text>
          </View>
        ) : null}
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {admission ? (
            <View style={badge(V.greenSoft, V.green)}>
              {isFree ? <Ticket size={13} color={V.green} /> : <Banknote size={13} color={V.green} />}
              <Text style={badgeText(V.green)}>{admission}</Text>
            </View>
          ) : null}
          <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
            <ChevronDown size={16} color={V.inkFaint} />
          </View>
        </View>
      </Pressable>

      {!expanded && dateLabel ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 10, marginTop: -2 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: V.ink }}>{dateLabel}</Text>
          {timeLabel ? <Text style={{ fontSize: 12.5, color: V.inkFaint }}>· {timeLabel}</Text> : null}
        </View>
      ) : null}

      {expanded ? (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: V.line }}>
            {orgAvatar ? (
              <Image source={{ uri: resolveMediaUrl(orgAvatar) ?? undefined }} style={{ width: 40, height: 40, borderRadius: 10 }} contentFit="cover" />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: V.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: V.primaryDeep }}>{initialsOf(orgName)}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: V.ink }} numberOfLines={1}>{orgName}</Text>
              {location ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  <MapPin size={12} color={V.inkFaint} />
                  <Text style={{ fontSize: 12, color: V.inkFaint, flexShrink: 1 }} numberOfLines={1}>{location}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={{ marginHorizontal: 12, borderTopWidth: 1, borderTopColor: V.line }} />

          <View style={{ padding: 12, gap: 12 }}>
            {dateLabel ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: V.canvas, alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarDays size={17} color={V.inkSoft} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: V.ink }}>{dateLabel}</Text>
                  {timeLabel ? <Text style={{ fontSize: 12, color: V.inkFaint }}>{timeLabel}</Text> : null}
                </View>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: V.canvas, alignItems: 'center', justifyContent: 'center' }}>
                <Users size={17} color={V.inkSoft} />
              </View>
              <View style={{ flex: 1, paddingTop: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: V.ink }}>
                  {cap ? `${fmt(count)} of ${fmt(cap)} attending` : `${fmt(count)} attending`}
                </Text>
                {fill !== null ? (
                  <View style={{ marginTop: 7, height: 4, borderRadius: 2, backgroundColor: V.line, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${Math.max(fill * 100, count > 0 ? 2 : 0)}%`, backgroundColor: V.primary, borderRadius: 2 }} />
                  </View>
                ) : null}
              </View>
            </View>

            {event.eventId ? (
              <Pressable
                onPress={() => router.push(`/event/${event.eventId}`)}
                accessibilityRole="link"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 2 }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: V.primary }}>View event details</Text>
                <ArrowRight size={15} color={V.primary} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
