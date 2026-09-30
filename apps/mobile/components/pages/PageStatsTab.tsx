import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Lock } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeProvider';
import { getPageStats, getPageViewAnalytics, resolveMediaUrl, ApiError } from '@fashub/api-client';
import type { PageStats, ProfileViewAnalytics } from '@fashub/types';
import { LoadingState } from '../LoadingState';
import PagePerformancePanel from './PagePerformancePanel';

const CHART_HEIGHT = 120;

/**
 * Mobile's Page Stats tab — Settings-tab ticket (full mobile parity chosen
 * over web-only). Same chart/breakdown approach as apps/mobile/app/
 * profile-analytics.tsx (hand-built react-native-svg, no charting library —
 * matches that screen's own documented reasoning), pointed at the Page-scoped
 * endpoints instead of the personal ones. The summary row (profile views,
 * followers, engagement rate, competitor rank) mirrors web's PageStatsTab —
 * same metrics moved off the old Manage screen, same "—" for untracked
 * numbers rather than fabricated ones.
 */
function TimeSeriesChart({ points }: { points: { date: string; count: number }[] }) {
  const { colors } = useTheme();
  const width = 320;
  const max = Math.max(...points.map((p) => p.count), 1);
  const stepX = width / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => ({ x: i * stepX, y: CHART_HEIGHT - (p.count / max) * (CHART_HEIGHT - 8) - 4 }));
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${width} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;

  return (
    <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${width} ${CHART_HEIGHT}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="pageFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.gold} stopOpacity={0.3} />
          <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#pageFade)" />
      <Path d={linePath} stroke={colors.gold} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function BreakdownBars({ items, getLabel, getCount, total, barColor }: {
  items: { count: number }[];
  getLabel: (item: any) => string;
  getCount: (item: any) => number;
  total: number;
  barColor: string;
}) {
  const { colors } = useTheme();
  const max = Math.max(...items.map(getCount), 1);
  return (
    <View style={{ gap: 10 }}>
      {items.map((item, i) => (
        <View key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, color: colors.ink }}>{getLabel(item)}</Text>
            <Text style={{ fontSize: 12, color: colors.inkSoft }}>{total > 0 ? `${Math.round((getCount(item) / total) * 100)}%` : '0%'}</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(getCount(item) / max) * 100}%`, backgroundColor: barColor, borderRadius: 3 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function StatCard({ label, value, sub, locked }: { label: string; value: string; sub: string; locked?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.paper, borderRadius: 14, padding: 14, borderWidth: locked ? 1.5 : 1, borderColor: locked ? colors.goldSoft : colors.line }}>
      <Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.inkSoft, letterSpacing: 0.4, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {locked ? <Lock size={14} color={colors.gold} /> : null}
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink }}>{value}</Text>
      </View>
      <Text style={{ fontSize: 11, color: locked ? colors.gold : colors.inkSoft, marginTop: 3 }} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

export default function PageStatsTab({ handle, pageTier, postCount }: { handle: string; pageTier: string; postCount: number }) {
  const { colors, spacing, typeScale } = useTheme();
  const [summary, setSummary] = useState<PageStats | null>(null);
  const [data, setData] = useState<ProfileViewAnalytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const chartGated = !['creator_pro', 'business_pro'].includes(pageTier);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getPageStats(handle).then((s) => !cancelled && setSummary(s)).catch(() => {}),
      chartGated
        ? Promise.resolve()
        : getPageViewAnalytics(handle)
            .then((d) => !cancelled && setData(d))
            .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Something went wrong')),
    ]).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [handle, chartGated]);

  if (loading) return <LoadingState label="Loading…" />;

  const locationTotal = data?.locationBreakdown.reduce((s, l) => s + l.count, 0) ?? 0;
  const platformTotal = data?.platformBreakdown.reduce((s, p) => s + p.count, 0) ?? 0;

  return (
    <View style={{ gap: spacing.lg }}>
      {summary ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <StatCard
            label="PROFILE VIEWS (7D)"
            value={summary.profileViews != null ? String(summary.profileViews) : '—'}
            sub="Unique visitors this week"
          />
          <StatCard label="FOLLOWERS" value={summary.followerCount.toLocaleString()} sub={`+${summary.newFollowersThisWeek} this week`} />
          <StatCard
            label="ENGAGEMENT RATE"
            value={summary.engagementRate != null ? `${summary.engagementRate}%` : '—'}
            sub={`Across ${postCount} post${postCount === 1 ? '' : 's'}`}
          />
          <StatCard
            label="COMPETITOR RANK"
            value={summary.competitorRank.unlocked ? '—' : 'Locked'}
            sub={summary.competitorRank.unlocked ? 'Benchmarking coming soon' : 'Upgrade to Business Pro'}
            locked
          />
        </View>
      ) : null}

      {chartGated ? (
        <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1.5, borderColor: colors.goldSoft, padding: 20, alignItems: 'center', gap: 8 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={20} color={colors.gold} />
          </View>
          <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink, textAlign: 'center' }}>Visitor analytics need Creator Pro or Business Pro</Text>
          <Text style={{ fontSize: 12, color: colors.inkSoft, textAlign: 'center' }}>Unique visitors, location, and platform split unlock once this Page upgrades.</Text>
        </View>
      ) : error ? (
        <Text style={{ fontSize: 13, color: colors.oxblood, textAlign: 'center', paddingVertical: 20 }}>{error}</Text>
      ) : data ? (
        <>
          <Text style={{ fontSize: 12, color: colors.inkSoft }}>{`Last 90 days · ${data.totalViews} total views`}</Text>

          <View style={{ backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginBottom: 10 }}>Unique visitors over time</Text>
            <TimeSeriesChart points={data.timeSeries} />
          </View>

          <View style={{ backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginBottom: 12 }}>Visitor location</Text>
            {data.locationBreakdown.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>No views yet.</Text>
            ) : (
              <BreakdownBars items={data.locationBreakdown} getLabel={(l) => l.label} getCount={(l) => l.count} total={locationTotal} barColor={colors.gold} />
            )}
          </View>

          <View style={{ backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginBottom: 12 }}>Platform split</Text>
            {data.platformBreakdown.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>No views yet.</Text>
            ) : (
              <BreakdownBars items={data.platformBreakdown} getLabel={(p) => (p.platform === 'mobile' ? 'Mobile' : 'Web')} getCount={(p) => p.count} total={platformTotal} barColor="#B45309" />
            )}
          </View>

          <View style={{ backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginBottom: 12 }}>Recent visitors</Text>
            {data.visitors.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>No views yet.</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {data.visitors.map((v, i) => {
                  const avatarUri = v.anonymized ? null : resolveMediaUrl(v.avatar);
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {avatarUri ? (
                          <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        ) : (
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkSoft }}>{v.anonymized ? '?' : (v.displayName ?? '').slice(0, 2).toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{v.anonymized ? `A ${v.role}` : v.displayName}</Text>
                        <Text style={{ fontSize: 11, color: colors.inkSoft, textTransform: 'capitalize' }}>{v.anonymized ? 'Private profile' : v.role}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.inkSoft }}>{new Date(v.viewedAt).toLocaleDateString()}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Pro-tier metrics ticket: period KPIs, engagement trend, top
              content — ported from the individual Creator Pro analytics
              engine, which had all of this with no Page equivalent before. */}
          <PagePerformancePanel handle={handle} tier={pageTier} />
        </>
      ) : null}
    </View>
  );
}
