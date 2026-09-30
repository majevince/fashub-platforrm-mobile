import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { violetColors as V } from '@fashub/design-tokens';
import { getPageAvailabilityStatus, type AvailabilityStatusData } from '@fashub/api-client';

// The closest FasHub-safe tokens to the reviewed design's literal dot colors
// (#57C26B / #E8B339 / #E24B4A) — violetColors has no "red" token, so
// fully-booked uses V.pink, the palette's other warning/destructive accent.
const DOT_COLOR: Record<AvailabilityStatusData['status'], string> = {
  open: V.green,
  almost_booked: V.amber,
  fully_booked: V.pink,
};

const STATUS_LABEL: Record<AvailabilityStatusData['status'], string> = {
  open: 'Open for bookings',
  almost_booked: 'Almost booked',
  fully_booked: 'Fully booked',
};

function formatNextOpening(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * The Live Availability Status indicator — LinkedIn's minimal presence
 * pattern per the reviewed design: a plain colored dot + muted text, never
 * a pill/badge/button. Mirrors fashub web's components/pages/
 * AvailabilityStatusIndicator.tsx.
 *
 * `detail` (Page header, under name/handle/location): full "N slots left" /
 * "Next opening" text, fetched once per mount. `compact` (Feed byline):
 * dot + short label only — self-polls every 30s here rather than the
 * Feed screen deduping by unique Page, since mobile's PostCard has no
 * existing lifted-state pattern to piggyback on (web's Feed already had
 * one for author online-status; mobile doesn't).
 */
export function AvailabilityStatusIndicator({
  pageHandle,
  variant = 'detail',
  data: providedData,
}: {
  pageHandle: string;
  variant?: 'detail' | 'compact';
  /** When provided (e.g. the Page header, which also needs this value for its own CTA-swap logic), renders it directly and never fetches — avoids a redundant second request for the same data. */
  data?: AvailabilityStatusData | null;
}) {
  const [fetchedData, setFetchedData] = useState<AvailabilityStatusData | null>(null);

  useEffect(() => {
    if (providedData !== undefined) return; // parent already has this value
    let cancelled = false;
    const load = () => {
      getPageAvailabilityStatus(pageHandle).then((d) => { if (!cancelled) setFetchedData(d); }).catch(() => {});
    };
    load();
    if (variant !== 'compact') return () => { cancelled = true; };
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [pageHandle, variant, providedData]);

  const data = providedData !== undefined ? providedData : fetchedData;
  if (!data) return null;

  const dotColor = DOT_COLOR[data.status];
  const label = STATUS_LABEL[data.status];

  if (variant === 'compact') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
        <Text style={{ fontSize: 11, color: V.inkFaint }}>{label}</Text>
      </View>
    );
  }

  const detail = data.status === 'fully_booked'
    ? data.nextOpeningDate
      ? `Next opening ${formatNextOpening(data.nextOpeningDate)}`
      : 'No openings in the next 30 days'
    : `${data.openSlotsThisWeek} slot${data.openSlotsThisWeek === 1 ? '' : 's'} left this week`;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
      <Text style={{ fontSize: 13, color: V.inkSoft }}>{label}</Text>
      <Text style={{ fontSize: 13, color: V.inkFaint }}>·</Text>
      <Text style={{ fontSize: 13, color: V.inkFaint }}>{detail}</Text>
    </View>
  );
}

/** Feed byline usage — tapping the dot/label opens the Page, the same tap target as the Page name (per SelectRow's existing pattern elsewhere in this app). */
export function AvailabilityDotCompact({ pageHandle }: { pageHandle: string }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/page/${pageHandle}`)}>
      <AvailabilityStatusIndicator pageHandle={pageHandle} variant="compact" />
    </Pressable>
  );
}
