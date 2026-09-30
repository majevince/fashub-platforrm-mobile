import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Clock, MapPin, Video } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getPageServices } from '@fashub/api-client';
import type { PageService } from '@fashub/types';
import { RatingSummary } from './RatingSummary';
import { BookingModal } from './BookingModal';

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

/**
 * The Page's Services tab — the gap Step 0 found (no Services data model
 * existed anywhere) filled in. Mirrors web's PageServicesTab.tsx.
 */
export function PageServicesTab({ pageId, pageHandle, pageName }: { pageId: string; pageHandle: string; pageName: string }) {
  const { colors, spacing } = useTheme();
  const [services, setServices] = useState<PageService[] | null>(null);
  const [bookingServiceId, setBookingServiceId] = useState<string | null>(null);

  useEffect(() => {
    getPageServices(pageHandle).then(({ services: list }) => setServices(list)).catch(() => setServices([]));
  }, [pageHandle]);

  return (
    <View>
      <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md }}>
        <RatingSummary pageId={pageId} />
      </View>

      {services === null ? (
        <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.xl }} />
      ) : services.length === 0 ? (
        <Text style={{ fontSize: 13, color: colors.inkSoft, textAlign: 'center', paddingVertical: spacing.xl }}>This Page hasn't added any bookable services yet.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {services.map((s) => (
            <View key={s.id} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{s.name}</Text>
                  {s.description ? <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 3 }}>{s.description}</Text> : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} color={colors.inkSoft} />
                      <Text style={{ fontSize: 11, color: colors.inkSoft }}>{s.durationMinutes} min</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {s.locationType === 'virtual' ? <Video size={11} color={colors.inkSoft} /> : <MapPin size={11} color={colors.inkSoft} />}
                      <Text style={{ fontSize: 11, color: colors.inkSoft }}>{s.locationType === 'virtual' ? 'Virtual' : 'In studio'}</Text>
                    </View>
                    {s.depositAmount != null ? <Text style={{ fontSize: 11, color: colors.inkSoft }}>Deposit: {formatMoney(s.depositAmount, s.currency)}</Text> : null}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  {s.price != null ? <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gold }}>{formatMoney(s.price, s.currency)}</Text> : null}
                  <Pressable onPress={() => setBookingServiceId(s.id)} style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Book</Text>
                  </Pressable>
                </View>
              </View>
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
