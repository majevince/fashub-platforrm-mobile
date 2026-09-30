import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { violetColors as V } from '@fashub/design-tokens';
import { getPageBookings } from '@fashub/api-client';
import type { PageBooking } from '@fashub/types';

/**
 * Admin-only "Upcoming bookings" widget — gated canManageBookings by the
 * parent. Client badges mirror web's UpcomingBookingsWidget.tsx exactly:
 * New client / Returning from PageBooking.isReturningClient, and a small
 * checkmark for isVerifiedUser (a real signed-in platform account made the
 * booking, not a fabricated User.isVerified field — see that file's doc
 * comment for why).
 */
export function UpcomingBookingsWidget({ pageHandle }: { pageHandle: string }) {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const [bookings, setBookings] = useState<PageBooking[] | null>(null);

  useEffect(() => {
    getPageBookings(pageHandle, { limit: 4 }).then(({ bookings: list }) => setBookings(list)).catch(() => setBookings([]));
  }, [pageHandle]);

  if (bookings !== null && bookings.length === 0) return null;

  return (
    <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: spacing.md, marginBottom: spacing.lg }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 10 }}>Upcoming bookings</Text>

      {bookings === null ? (
        <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.md }} />
      ) : (
        <View style={{ gap: 12 }}>
          {bookings.map((b) => (
            <View key={b.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {b.clientUser?.avatar ? (
                  <Image source={{ uri: b.clientUser.avatar }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{(b.clientName || b.clientUser?.displayName || '?').slice(0, 2).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{b.clientName || b.clientUser?.displayName}</Text>
                  {b.isVerifiedUser ? <CheckCircle2 size={12} color={colors.gold} /> : null}
                </View>
                <Text style={{ fontSize: 11.5, color: colors.inkSoft }}>
                  {b.service.name} · {new Date(b.startAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
              <View style={{ backgroundColor: b.isReturningClient ? V.greenSoft : V.primarySoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: b.isReturningClient ? V.green : V.primaryDeep }}>{b.isReturningClient ? 'Returning' : 'New client'}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => router.push(`/page/${pageHandle}/manage/bookings`)}
        style={{ marginTop: 14, backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 11, alignItems: 'center' }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Manage booking calendar</Text>
      </Pressable>
    </View>
  );
}
