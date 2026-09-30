import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { TrendingUp, TrendingDown, FileText, Heart, Sparkles, Trophy, CalendarDays } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getPagePerformanceStats, ApiError } from '@fashub/api-client';
import type { PagePerformanceStats } from '@fashub/types';
import { LoadingState } from '../LoadingState';

const CHART_HEIGHT = 120;

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function DualLineChart({ points, colorA, colorB }: { points: { likes: number; interests: number }[]; colorA: string; colorB: string }) {
  const width = 320;
  const max = Math.max(...points.map((p) => Math.max(p.likes, p.interests)), 1);
  const stepX = width / Math.max(points.length - 1, 1);
  const toPath = (key: 'likes' | 'interests') =>
    points
      .map((p, i) => {
        const x = i * stepX;
        const y = CHART_HEIGHT - (p[key] / max) * (CHART_HEIGHT - 8) - 4;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

  return (
    <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${width} ${CHART_HEIGHT}`} preserveAspectRatio="none">
      <Path d={toPath('likes')} stroke={colorA} strokeWidth={2} fill="none" />
      <Path d={toPath('interests')} stroke={colorB} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  const { colors } = useTheme();
  if (delta === 0) {
    return (
      <View style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
        <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.inkSoft }}>— 0%</Text>
      </View>
    );
  }
  const up = delta > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: up ? '#E6F4EA' : '#FEE8E9', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Icon size={10} color={up ? '#15803D' : '#B3413A'} />
      <Text style={{ fontSize: 10.5, fontWeight: '700', color: up ? '#15803D' : '#B3413A' }}>{Math.abs(delta)}%</Text>
    </View>
  );
}

function KPICard({ label, value, delta, icon, accent, accentSoft }: { label: string; value: number; delta: number; icon: React.ReactNode; accent: string; accentSoft: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: accentSoft, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
        <DeltaPill delta={delta} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{fmt(value)}</Text>
      <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function StatMini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.paper, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.line }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.inkSoft, letterSpacing: 0.4, marginBottom: 4 }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 1 }}>{sub}</Text> : null}
    </View>
  );
}

/**
 * Mobile's Stats tab performance section — same Page-scoped port of the
 * individual Creator Pro analytics engine as web's PagePerformancePanel.tsx
 * (Pro-tier metrics ticket). Period KPIs, a hand-built dual-line
 * engagement chart (no charting library, same posture as
 * apps/mobile/app/profile-analytics.tsx), all-time overview, and top
 * performing content — none of this existed on the Page Stats tab before,
 * even though personal Pro profiles already had all of it.
 */
export default function PagePerformancePanel({ handle, tier }: { handle: string; tier: string }) {
  const { colors, spacing, typeScale } = useTheme();
  const router = useRouter();
  const [data, setData] = useState<PagePerformanceStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPagePerformanceStats(handle)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Something went wrong'));
    return () => { cancelled = true; };
  }, [handle]);

  if (error) return <Text style={{ fontSize: 13, color: colors.oxblood, textAlign: 'center', paddingVertical: 16 }}>{error}</Text>;
  if (!data) return <LoadingState label="Loading…" />;

  const { periodKPIs, overview, dailySeries, topContent } = data;

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.inkSoft, letterSpacing: 0.4 }}>PERFORMANCE · LAST {data.window.days} DAYS</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <KPICard label="Posts" value={periodKPIs.posts.value} delta={periodKPIs.posts.delta} icon={<FileText size={13} color={colors.gold} />} accent={colors.gold} accentSoft={colors.ivoryDeep} />
        <KPICard label="Likes" value={periodKPIs.likes.value} delta={periodKPIs.likes.delta} icon={<Heart size={13} color={colors.oxblood} />} accent={colors.oxblood} accentSoft="#FEE8E9" />
        <KPICard label="Interests" value={periodKPIs.interests.value} delta={periodKPIs.interests.delta} icon={<Sparkles size={13} color="#15803D" />} accent="#15803D" accentSoft="#E6F4EA" />
      </View>

      <View style={{ backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line }}>
        {/* Section-header role: matches Profile's h2 exactly (typeScale.h2). */}
        <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginBottom: 4 }}>Engagement trend</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.oxblood }} />
            <Text style={{ fontSize: 10.5, color: colors.inkSoft }}>Likes</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#15803D' }} />
            <Text style={{ fontSize: 10.5, color: colors.inkSoft }}>Interests</Text>
          </View>
        </View>
        {dailySeries.length > 0 ? (
          <DualLineChart points={dailySeries} colorA={colors.oxblood} colorB="#15803D" />
        ) : (
          <Text style={{ fontSize: 12, color: colors.inkSoft, textAlign: 'center', paddingVertical: 20 }}>No activity in this window.</Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <StatMini label="Total posts" value={fmt(overview.totalPosts)} />
        <StatMini label="Total likes" value={fmt(overview.totalLikes)} />
        <StatMini label="Total interests" value={fmt(overview.totalInterests)} />
        {tier === 'business_pro' ? (
          <StatMini label="Events" value={`${overview.upcomingEvents} upcoming`} sub={`${overview.totalEvents} total`} />
        ) : (
          <StatMini label="Followers" value={fmt(overview.followers)} />
        )}
      </View>

      <View style={{ backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Trophy size={14} color={colors.inkSoft} />
          <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Top performing content</Text>
        </View>
        {topContent.length === 0 ? (
          <Text style={{ fontSize: 12, color: colors.inkSoft, textAlign: 'center', paddingVertical: 12 }}>No posts or events yet.</Text>
        ) : (
          <View style={{ gap: 4 }}>
            {topContent.map((item, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <Pressable
                  key={item.id}
                  // The API's `url` is web-shaped (/posts/…, /events/…) —
                  // mobile's own routes are singular (/post/…, /event/…),
                  // so this derives the path itself rather than reusing it.
                  onPress={() => router.push(item.contentType === 'event' ? `/event/${item.id}` : `/post/${item.id}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}
                >
                  <Text style={{ width: 22, textAlign: 'center', fontSize: 13 }}>
                    {i < 3 ? medals[i] : <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkSoft }}>{`#${i + 1}`}</Text>}
                  </Text>
                  <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.thumbnail ? (
                      <Image source={{ uri: item.thumbnail }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <FileText size={14} color={colors.inkSoft} />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{item.title}</Text>
                    <Text style={{ fontSize: 10.5, color: colors.inkSoft }}>
                      {item.contentType === 'event' ? `${fmt(item.interests)} views · ${fmt(item.likes)} attending` : `${fmt(item.likes)} likes · ${fmt(item.interests)} interests`}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.inkSoft }}>{item.contentType === 'event' ? 'Event' : 'Post'}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
