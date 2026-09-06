import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Clock,
  MapPin,
  Navigation,
  Bookmark,
  Share2,
  QrCode,
  Check,
  ExternalLink,
  Eye,
  Users,
  DollarSign,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getEvent, getRelatedEvents, attendEvent, unattendEvent, toggleSavedItem, resolveMediaUrl, API_BASE_URL, ApiError } from '@fashub/api-client';
import type { EventDetail, EventListItem } from '@fashub/types';
import { EVENT_CATEGORY_LABELS } from '@fashub/types';
import { VerifiedBadge, isVerified } from '../../components/VerifiedBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { PhotoGalleryViewer } from '../../components/PhotoGalleryViewer';
import { EventCard } from '../../components/events/EventCard';
import { EventsMapWebView } from '../../components/events/EventsMapWebView';
import { EventTicketModal } from '../../components/events/EventTicketModal';
import { violetColors as VF } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { buildEventLocationLine } from '../../lib/eventLocationLine';
import { openDirections } from '../../lib/directions';

const SCREEN_W = Dimensions.get('window').width;

/**
 * Full parity port of app/events/[eventId]/page.tsx: gallery (reusing
 * PhotoGalleryViewer, the same multi-image viewer Project/Post detail
 * use), embedded map + native "Get directions" (web's own version is a
 * plain web URL — this closes that gap with a real native deep link, see
 * lib/directions.ts), agenda timeline (hidden when empty, matching web's
 * exact conditional), related events (hidden when empty), and the full
 * attend/share/QR-ticket action cluster in both attending states. There
 * is no real ticket entity on the Event model (confirmed in Step 0) — "My
 * Ticket" QR-encodes the event's own web URL, exactly like web's version.
 */
export default function EventDetailScreen() {
  const { colors, fontFamilies } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [related, setRelated] = useState<EventListItem[]>([]);
  const [error, setError] = useState('');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [attending, setAttending] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);

  const load = () => {
    if (!id || !user) return;
    setError('');
    getEvent(id, user.id)
      .then((res) => {
        setEvent(res);
        setAttending(!!res.isAttending);
        setAttendeeCount(res.attendeeCount ?? 0);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load this event."));
    getRelatedEvents(id)
      .then((res) => setRelated(res.events))
      .catch(() => {});
  };

  useEffect(load, [id, user?.id]);

  if (!user || !id) return null;

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
        </View>
        <ErrorState message={error} onRetry={load} />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <LoadingState label="Loading event…" />
      </SafeAreaView>
    );
  }

  const galleryImages = Array.from(new Set([event.image, ...(event.images ?? [])].filter((v): v is string => !!v)));
  const resolvedGalleryImages = galleryImages.map((uri) => resolveMediaUrl(uri)).filter((v): v is string => !!v);
  const start = new Date(event.startDate);
  const now = new Date();
  const end = event.endDate ? new Date(event.endDate) : null;
  const isPast = (end ?? start).getTime() < now.getTime();
  const isOngoing = !isPast && start.getTime() <= now.getTime();
  const endedAgo = (() => {
    if (!isPast) return '';
    const daysAgo = Math.floor((now.getTime() - (end ?? start).getTime()) / 86_400_000);
    if (daysAgo === 0) return 'Ended today';
    if (daysAgo === 1) return 'Ended yesterday';
    return `Ended ${daysAgo} days ago`;
  })();
  const priceLabel = event.isFree ? 'Free' : event.price != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: event.currency, maximumFractionDigits: 0 }).format(event.price) : null;
  const locationLine = buildEventLocationLine(event);
  const hasGeocodedLocation = !event.isVirtual && Number.isFinite(event.latitude) && Number.isFinite(event.longitude);
  const organizerVerified = event.organizer ? isVerified({ subscriptionTier: event.organizer.subscriptionTier }) : false;
  const spotsRemaining = event.capacity != null ? event.capacity - attendeeCount : null;
  const hasAdditionalInfo = !!(event.dresscode || event.ageRestriction || event.accessibilityInfo || event.parkingInfo);

  const onMediaScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  };

  const handleAttend = async () => {
    const next = !attending;
    setAttending(next);
    setAttendeeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    try {
      if (next) await attendEvent(event.id, user.id);
      else await unattendEvent(event.id, user.id);
    } catch {
      setAttending(!next);
      setAttendeeCount((c) => (next ? Math.max(0, c - 1) : c + 1));
    }
  };

  const handleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await toggleSavedItem(user.id, event.id, 'EVENT');
    } catch {
      setSaved(!next);
    }
  };

  const handleShare = () => {
    Share.share({ message: `${event.title} — ${event.city} · ${start.toLocaleDateString()} — ${API_BASE_URL}/events/${event.id}` }).catch(() => {});
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ position: 'relative' }}>
          {resolvedGalleryImages.length > 0 ? (
            <View style={{ width: '100%', aspectRatio: 1.3, backgroundColor: colors.ink }}>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onMediaScroll}>
                {resolvedGalleryImages.map((uri, i) => (
                  <Pressable key={i} onPress={() => { setGalleryIndex(i); setGalleryOpen(true); }} style={{ width: SCREEN_W, height: '100%' }}>
                    <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  </Pressable>
                ))}
              </ScrollView>
              {isPast ? (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(27,21,35,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>PAST EVENT</Text>
                </View>
              ) : isOngoing ? (
                <View style={{ position: 'absolute', top: 14, right: 14, backgroundColor: colors.oxblood, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#fff' }}>● Happening Now</Text>
                </View>
              ) : null}
              {resolvedGalleryImages.length > 1 ? (
                <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                  {resolvedGalleryImages.map((_, i) => (
                    <View key={i} style={{ width: i === galleryIndex ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === galleryIndex ? colors.gold : 'rgba(255,255,255,0.5)' }} />
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ width: '100%', aspectRatio: 1.6, backgroundColor: colors.ivoryDeep }} />
          )}

          <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: 'absolute', top: 12, left: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(27,21,35,0.5)', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.gold }}>{EVENT_CATEGORY_LABELS[event.category]}</Text>
            </View>
            {priceLabel ? (
              <View style={{ backgroundColor: event.isFree ? '#059669' : colors.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#fff' }}>{priceLabel}</Text>
              </View>
            ) : null}
          </View>

          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink, lineHeight: 26 }}>{event.title}</Text>

          {isPast && endedAgo ? (
            <View style={{ backgroundColor: '#374151', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#fff' }}>This event has ended · {endedAgo}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Clock size={15} color={VF.inkFaint} style={{ marginTop: 1 }} />
            <View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.inkSoft }}>
                {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
              {end ? (
                <Text style={{ fontSize: 11.5, fontWeight: '400', color: VF.inkFaint, marginTop: 2 }}>
                  Ends: {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              ) : null}
            </View>
          </View>
          {event.isVirtual ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MapPin size={15} color={VF.inkFaint} />
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.inkSoft }}>Virtual event</Text>
            </View>
          ) : locationLine ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MapPin size={15} color={VF.inkFaint} />
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.inkSoft, flex: 1 }}>{locationLine}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Users size={15} color={VF.inkFaint} style={{ marginTop: 1 }} />
            <View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.inkSoft }}>
                {attendeeCount}{event.capacity ? ` / ${event.capacity}` : ''} attendees
              </Text>
              {spotsRemaining != null ? (
                <Text style={{ fontSize: 11.5, fontWeight: '600', color: spotsRemaining > 0 ? '#059669' : colors.oxblood, marginTop: 2 }}>
                  {spotsRemaining > 0 ? `${spotsRemaining} spots remaining` : 'Sold out'}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <DollarSign size={15} color={VF.inkFaint} />
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.inkSoft }}>{event.isFree ? 'Free Event' : priceLabel ?? '—'}</Text>
          </View>

          {event.description ? (
            <Text style={{ fontSize: 13.5, lineHeight: 20, color: colors.inkSoft, marginTop: 4 }}>{event.description}</Text>
          ) : null}

          {hasGeocodedLocation ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <View style={{ width: '100%', height: 160, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
                <EventsMapWebView events={[event]} activeId={event.id} interactive={false} />
              </View>
              <Pressable onPress={() => openDirections(event.latitude, event.longitude, event.venueName ?? event.title)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Navigation size={14} color={colors.gold} />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.gold }}>Get directions</Text>
              </Pressable>
            </View>
          ) : null}

          {event.agenda && event.agenda.length > 0 ? (
            <View style={{ marginTop: 10, gap: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>Agenda</Text>
              {event.agenda.map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ alignItems: 'center', width: 12 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />
                    {i < event.agenda!.length - 1 ? <View style={{ width: 1, flex: 1, backgroundColor: colors.line, marginTop: 2 }} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 12 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.gold, fontFamily: fontFamilies.mono }}>{item.time}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.ink, marginTop: 2 }}>{item.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {hasAdditionalInfo ? (
            <View style={{ marginTop: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>Additional Information</Text>
              {event.dresscode ? (
                <View>
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.ink }}>Dress Code</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '400', color: colors.inkSoft, marginTop: 1 }}>{event.dresscode}</Text>
                </View>
              ) : null}
              {event.ageRestriction ? (
                <View>
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.ink }}>Age Restriction</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '400', color: colors.inkSoft, marginTop: 1 }}>{event.ageRestriction}</Text>
                </View>
              ) : null}
              {event.accessibilityInfo ? (
                <View>
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.ink }}>Accessibility</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '400', color: colors.inkSoft, marginTop: 1 }}>{event.accessibilityInfo}</Text>
                </View>
              ) : null}
              {event.parkingInfo ? (
                <View>
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.ink }}>Parking</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '400', color: colors.inkSoft, marginTop: 1 }}>{event.parkingInfo}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {event.tags && event.tags.length > 0 ? (
            <View style={{ marginTop: 10, gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>Tags</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {event.tags.map((tag, i) => (
                  <View key={i} style={{ backgroundColor: '#F3EDFB', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.gold }}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {event.organizer || event.organizerName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.line }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                {event.organizer?.avatar ? (
                  <Image source={{ uri: resolveMediaUrl(event.organizer.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{(event.organizer?.displayName ?? event.organizerName ?? '?').slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{event.organizer?.displayName ?? event.organizerName}</Text>
                  {organizerVerified ? <VerifiedBadge size="sm" /> : null}
                </View>
                <Text style={{ fontSize: 11, fontWeight: '400', color: VF.inkFaint }}>Organizer</Text>
              </View>
              {event.organizer ? (
                <Pressable onPress={() => router.push(`/profile/${event.organizer!.id}`)}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gold }}>View Profile</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Eye size={13} color={VF.inkFaint} />
            <Text style={{ fontSize: 11.5, fontWeight: '500', color: VF.inkFaint }}>{event.views} views</Text>
          </View>

          <View style={{ gap: 10, marginTop: 8 }}>
            {isPast ? (
              <View style={{ backgroundColor: '#E5E5E5', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#888' }}>Event Has Ended</Text>
              </View>
            ) : (
              <Pressable
                onPress={handleAttend}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: attending ? colors.ink : colors.gold, borderRadius: 12, paddingVertical: 13 }}
              >
                {attending ? <Check size={16} color="#fff" /> : null}
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{attending ? "You're attending" : "I'm attending"}</Text>
              </Pressable>
            )}

            {event.requiresRegistration && event.registrationUrl ? (
              <Pressable onPress={() => Linking.openURL(event.registrationUrl!).catch(() => {})} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 12 }}>
                <ExternalLink size={14} color={colors.ink} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Register Now</Text>
              </Pressable>
            ) : null}
            {event.externalUrl ? (
              <Pressable onPress={() => Linking.openURL(event.externalUrl!).catch(() => {})} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 12 }}>
                <ExternalLink size={14} color={colors.ink} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>View on External Site</Text>
              </Pressable>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={handleSave} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 12 }}>
                <Bookmark size={14} color={saved ? colors.gold : colors.ink} fill={saved ? colors.gold : 'transparent'} />
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: saved ? colors.gold : colors.ink }}>Save</Text>
              </Pressable>
              <Pressable onPress={handleShare} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 12 }}>
                <Share2 size={14} color={colors.ink} />
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>Share</Text>
              </Pressable>
              <Pressable
                onPress={() => attending && setTicketOpen(true)}
                disabled={!attending}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 12, opacity: attending ? 1 : 0.4 }}
              >
                <QrCode size={14} color={colors.ink} />
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>My Ticket</Text>
              </Pressable>
            </View>
            {!attending && !isPast ? (
              <Text style={{ fontSize: 10.5, fontWeight: '400', color: VF.inkFaint, textAlign: 'center' }}>Ticket QR unlocks once you're attending</Text>
            ) : null}
          </View>

          {related.length > 0 ? (
            <View style={{ marginTop: 16, gap: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>Related Events</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {related.slice(0, 4).map((e) => (
                  <View key={e.id} style={{ width: 260 }}>
                    <EventCard event={e} userId={user.id} />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <PhotoGalleryViewer visible={galleryOpen} images={resolvedGalleryImages} initialIndex={galleryIndex} onClose={() => setGalleryOpen(false)} />
      <EventTicketModal visible={ticketOpen} eventId={event.id} eventTitle={event.title} onClose={() => setTicketOpen(false)} />
    </SafeAreaView>
  );
}
