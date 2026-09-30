import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Clock } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getPageServices } from '@fashub/api-client';
import type { PageService } from '@fashub/types';
import { RatingSummary } from './RatingSummary';
import { BookingModal } from './BookingModal';

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

/**
 * Home tab's "Services and booking" card from the reviewed mock — a compact
 * preview (top 3 services + real aggregate rating) with per-service "Book"
 * shortcuts, and a "See all" into the full Services tab. Mirrors web's
 * components/pages/ServicesBookingCard.tsx.
 */
export function ServicesBookingCard({
  pageId,
  pageHandle,
  pageName,
  onSeeAll,
}: {
  pageId: string;
  pageHandle: string;
  pageName: string;
  onSeeAll: () => void;
}) {
  const { colors, spacing } = useTheme();
  const [services, setServices] = useState<PageService[] | null>(null);
  const [bookingServiceId, setBookingServiceId] = useState<string | null>(null);

  useEffect(() => {
    getPageServices(pageHandle).then(({ services: list }) => setServices(list)).catch(() => setServices([]));
  }, [pageHandle]);

  if (services !== null && services.length === 0) return null;

  return (
    <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: spacing.md, marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>Services and booking</Text>
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gold }}>See all</Text>
        </Pressable>
      </View>

      <View style={{ marginBottom: 8 }}>
        <RatingSummary pageId={pageId} />
      </View>

      {services === null ? (
        <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.md }} />
      ) : (
        <View>
          {services.slice(0, 3).map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{s.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Clock size={10} color={colors.inkSoft} />
                  <Text style={{ fontSize: 11, color: colors.inkSoft }}>
                    {s.durationMinutes} min{s.price != null ? ` · ${formatMoney(s.price, s.currency)}` : ''}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setBookingServiceId(s.id)} style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#fff' }}>Book</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <BookingModal
        visible={!!bookingServiceId}
        pageHandle={pageHandle}
        pageName={pageName}
        initialServiceId={bookingServiceId ?? undefined}
        onClose={() => setBookingServiceId(null)}
      />
    </View>
  );
}
