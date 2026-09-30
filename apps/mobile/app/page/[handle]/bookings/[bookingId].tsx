import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, CheckCircle2, Clock3, XCircle, MapPin, Video, Clock } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { violetColors as V } from '@fashub/design-tokens';
import { getPageBooking, ApiError } from '@fashub/api-client';
import type { PageBooking } from '@fashub/types';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/ErrorState';

const STATUS_META: Record<string, { label: string; bg: string; fg: string; Icon: typeof CheckCircle2 }> = {
  confirmed: { label: 'Confirmed', bg: V.greenSoft, fg: V.green, Icon: CheckCircle2 },
  pending: { label: 'Awaiting confirmation', bg: V.amberSoft, fg: V.amber, Icon: Clock3 },
  completed: { label: 'Completed', bg: V.canvas, fg: V.inkSoft, Icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', bg: V.pinkSoft, fg: V.pink, Icon: XCircle },
  held: { label: 'Held', bg: V.canvas, fg: V.inkSoft, Icon: Clock3 },
};

/**
 * The client's own booking-status screen — where every booking notification
 * deep-links to. Mirrors web's app/page/[handle]/bookings/[bookingId]/
 * page.tsx. Works for a guest booking (the id itself is the capability, per
 * GET /api/pages/[handle]/bookings/[bookingId]'s doc comment) or a matching
 * logged-in session — api-client attaches a token automatically when one
 * exists.
 */
export default function BookingDetailScreen() {
  const { handle, bookingId } = useLocalSearchParams<{ handle: string; bookingId: string }>();
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const [booking, setBooking] = useState<PageBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!handle || !bookingId) return;
    getPageBooking(handle, bookingId)
      .then(({ booking: b }) => setBooking(b))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Booking not found'))
      .finally(() => setLoading(false));
  }, [handle, bookingId]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <LoadingState label="Loading…" />
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message={error ?? 'Booking not found'} onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  const meta = STATUS_META[booking.status] || STATUS_META.pending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>Booking</Text>
      </View>

      <View style={{ padding: spacing.lg }}>
        <View style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <meta.Icon size={16} color={meta.fg} />
            <View style={{ backgroundColor: meta.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: meta.fg }}>{meta.label}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{booking.service.name}</Text>
          {booking.page ? <Text style={{ fontSize: 12.5, color: colors.inkSoft, marginTop: 2 }}>with {booking.page.name}</Text> : null}

          <View style={{ marginTop: 14, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock size={14} color={colors.inkSoft} />
              <Text style={{ fontSize: 13, color: colors.inkSoft }}>
                {new Date(booking.startAt).toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {booking.service.locationType === 'virtual' ? <Video size={14} color={colors.inkSoft} /> : <MapPin size={14} color={colors.inkSoft} />}
              <Text style={{ fontSize: 13, color: colors.inkSoft }}>{booking.service.locationType === 'virtual' ? 'Virtual' : 'In studio'}</Text>
            </View>
          </View>

          {booking.notes ? <Text style={{ fontSize: 13, color: colors.inkSoft, marginTop: 14, fontStyle: 'italic' }}>"{booking.notes}"</Text> : null}

          {/* The join link only means anything once a real appointment
              exists — never shown for a pending/held/cancelled booking. */}
          {booking.service.locationType === 'virtual' && booking.service.meetingLink && (booking.status === 'confirmed' || booking.status === 'completed') ? (
            <Pressable
              onPress={() => Linking.openURL(booking.service.meetingLink!)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ivoryDeep, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 14, alignSelf: 'flex-start' }}
            >
              <Video size={14} color={colors.gold} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gold }}>Join virtual appointment</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => router.push(`/page/${handle}`)}
            style={{ marginTop: 20, backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#fff' }}>{booking.page ? `View ${booking.page.name}` : 'View Page'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
