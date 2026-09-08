import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ChevronLeft, Lock, Eye, Users2, Star, FolderKanban, Briefcase, Bookmark, MessageSquare } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import {
  getUserProfile,
  getProfileViewAnalytics,
  getCreatorAnalytics,
  getProjectAnalyticsSummary,
  resolveMediaUrl,
  ApiError,
} from '@fashub/api-client';
import type { ProfileViewAnalytics, CreatorAnalytics, ProjectAnalyticsSummary, ProfileDetail } from '@fashub/types';
import { calcProfileStrength } from '../lib/profileStrength';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

type TabKey = 'overview' | 'visitors' | 'projects' | 'portfolio';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'visitors', label: 'Visitors' },
  { key: 'projects', label: 'Projects' },
  { key: 'portfolio', label: 'Portfolio' },
];

// Cycled across donut/breakdown segments — colors.gold is this app's real
// violet accent (see the design-tokens remap), matching the mock's #6D28D9
// exactly; the other two are the mock's own gold/light-violet secondaries.
const SEGMENT_COLORS = ['#6D28D9', '#C6A15B', '#8b5cf6', '#6E1F2A'];

/**
 * Gate — checked here, independently of whatever screen linked in (Dashboard's
 * InsightsCard has its own isPro prop, but that can be stale; this re-fetches
 * fresh on every visit, per the ticket's "live/current data" requirement).
 * 'checking' renders nothing but a spinner, so real content never flashes
 * before the check resolves. A network failure lands in 'error' (retry
 * offered), never silently treated as 'denied' — a timeout must not paywall
 * a paying user.
 */
type GateState = 'checking' | 'denied' | 'error' | 'ok';

function TimeSeriesChart({ points, color }: { points: { date: string; count: number }[]; color: string }) {
  const width = 300;
  const height = 90;
  const max = Math.max(...points.map((p) => p.count), 1);
  const stepX = width / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => ({ x: i * stepX, y: height - (p.count / max) * (height - 8) - 4 }));
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="insightsFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.3} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#insightsFade)" />
      <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" />
    </Svg>
  );
}

/**
 * Ports the mock's "Profile visits by country" donut 1:1 (stroke-dasharray
 * ring segments, count in the center) — hand-built on react-native-svg,
 * same no-new-dependency approach as TimeSeriesChart above.
 */
function DonutChart({ items, total }: { items: { label: string; count: number }[]; total: number }) {
  const { colors } = useTheme();
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let offsetAccum = 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Svg width={100} height={100} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={radius} fill="none" stroke={colors.line} strokeWidth={18} />
        {items.map((item, i) => {
          const fraction = total > 0 ? item.count / total : 0;
          const dash = fraction * circumference;
          const el = (
            <Circle
              key={item.label}
              cx={60}
              cy={60}
              r={radius}
              fill="none"
              stroke={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
              strokeWidth={18}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offsetAccum}
              transform="rotate(-90 60 60)"
            />
          );
          offsetAccum += dash;
          return el;
        })}
        <SvgText x={60} y={57} textAnchor="middle" fontSize={18} fontWeight="800" fill={colors.ink}>{String(total)}</SvgText>
        <SvgText x={60} y={72} textAnchor="middle" fontSize={8} fill={colors.inkSoft}>visits</SvgText>
      </Svg>
      <View style={{ flex: 1, gap: 7 }}>
        {items.map((item, i) => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
            <Text style={{ fontSize: 10.5, color: colors.ink, flex: 1 }} numberOfLines={1}>{item.label}</Text>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.ink }}>{total > 0 ? `${Math.round((item.count / total) * 100)}%` : '0%'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatCard({ icon, label, value, sub, subColor }: { icon: React.ReactNode; label: string; value: string; sub?: string; subColor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {icon}
        <Text style={{ fontSize: 9.5, color: colors.inkSoft }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 6 }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 9, color: subColor ?? colors.inkSoft, marginTop: 2 }}>{sub}</Text> : null}
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14 }}>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink, marginBottom: 10 }}>{title}</Text>
      {children}
    </View>
  );
}

// Each bar gets its own color, cycling the same violet/gold/light-violet
// palette as DonutChart above — matches the mock exactly (its "Visitor
// type" and "Views by category" breakdowns each color every row
// differently, not one accent color repeated down the list).
function BreakdownBars({ items }: { items: { label: string; count: number }[] }) {
  const { colors } = useTheme();
  const total = items.reduce((s, i) => s + i.count, 0);
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <View style={{ gap: 10 }}>
      {items.map((item, i) => (
        <View key={item.label}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, color: colors.ink }}>{item.label}</Text>
            <Text style={{ fontSize: 12, color: colors.inkSoft }}>{total > 0 ? `${Math.round((item.count / total) * 100)}%` : '0%'}</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(item.count / max) * 100}%`, backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length], borderRadius: 3 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Paywall — full-screen adaptation of InsightsCard.tsx's own already-
 * established non-Pro pattern (lock icon, ivoryDeep surface, violet accent),
 * scaled up rather than porting web's UpgradePromptCard verbatim, since
 * mobile already has its own precedent for this exact feature.
 */
function InsightsPaywall({ onUpgrade }: { onUpgrade: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center' }}>
        <Lock size={28} color={colors.gold} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink, textAlign: 'center' }}>Insights is a Creator Pro feature</Text>
      <Text style={{ fontSize: 13, color: colors.inkSoft, textAlign: 'center', lineHeight: 19 }}>
        Upgrade to Creator Pro to see profile views, visitor trends, and portfolio performance.
      </Text>
      <Pressable onPress={onUpgrade} style={{ backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 28, marginTop: 8 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.ivory }}>Upgrade to Creator Pro</Text>
      </Pressable>
    </View>
  );
}

export default function InsightsScreen() {
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [gate, setGate] = useState<GateState>('checking');
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [tab, setTab] = useState<TabKey>('overview');

  const [views, setViews] = useState<ProfileViewAnalytics | null>(null);
  const [creator, setCreator] = useState<CreatorAnalytics | null>(null);
  const [projects, setProjects] = useState<ProjectAnalyticsSummary | null>(null);

  const checkGate = () => {
    if (!user) return;
    setGate('checking');
    getUserProfile(user.id, user.id)
      .then((p) => {
        setProfile(p);
        setGate(p.subscriptionTier === 'pro' || p.subscriptionTier === 'business' ? 'ok' : 'denied');
      })
      .catch(() => setGate('error'));
  };

  // Re-checked every time this screen is focused-on-mount, not read from a
  // value passed in via navigation params or a parent's cached prop — a
  // user who upgrades mid-session and comes back here gets real access
  // immediately, no reinstall/hard-refresh needed.
  useEffect(checkGate, [user?.id]);

  useEffect(() => {
    if (gate !== 'ok' || !user) return;
    getProfileViewAnalytics(user.id).then(setViews).catch(() => {});
    getCreatorAnalytics(user.id).then(setCreator).catch(() => {});
    getProjectAnalyticsSummary(user.id).then(setProjects).catch(() => {});
  }, [gate, user?.id]);

  if (!user) return null;

  const role = user.role === 'tailor' ? 'tailor' : 'designer';
  const detail = profile?.designerProfile || profile?.tailorProfile;
  const strength = profile && (user.role === 'designer' || user.role === 'tailor') ? calcProfileStrength(profile, detail, role) : null;

  // Split the 90-day series in half to compute a real "vs prior period"
  // delta for the headline stat, instead of inventing one.
  const viewsDelta = (() => {
    if (!views || views.timeSeries.length < 2) return null;
    const mid = Math.floor(views.timeSeries.length / 2);
    const prior = views.timeSeries.slice(0, mid).reduce((s, p) => s + p.count, 0);
    const recent = views.timeSeries.slice(mid).reduce((s, p) => s + p.count, 0);
    if (prior === 0) return recent > 0 ? 100 : null;
    return Math.round(((recent - prior) / prior) * 100);
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>Insights</Text>
      </View>

      {gate === 'checking' ? (
        <LoadingState />
      ) : gate === 'error' ? (
        <ErrorState message="Couldn't check your subscription status." onRetry={checkGate} />
      ) : gate === 'denied' ? (
        <InsightsPaywall onUpgrade={() => router.push('/profile/settings/billing')} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 6, backgroundColor: colors.line, borderRadius: 10, padding: 3, marginHorizontal: spacing.lg, marginBottom: spacing.md }}>
            {TABS.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8, backgroundColor: tab === t.key ? colors.paper : 'transparent' }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: tab === t.key ? '700' : '400', color: tab === t.key ? colors.gold : colors.inkSoft }}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md }}>
            {tab === 'overview' && (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <StatCard
                    icon={<Eye size={13} color={colors.gold} />}
                    label="Profile views"
                    value={String(views?.totalViews ?? 0)}
                    sub={viewsDelta !== null ? `${viewsDelta >= 0 ? '↑' : '↓'} ${Math.abs(viewsDelta)}% vs prior` : undefined}
                    subColor={viewsDelta !== null && viewsDelta >= 0 ? '#16a34a' : colors.oxblood}
                  />
                  <StatCard icon={<Users2 size={13} color={colors.gold} />} label="Followers" value={String(creator?.overview.followers ?? 0)} />
                  <StatCard
                    icon={<Star size={13} color="#C6A15B" />}
                    label="Rating"
                    value={creator?.overview.rating ? creator.overview.rating.toFixed(1) : '—'}
                    sub={creator?.overview.reviewCount ? `${creator.overview.reviewCount} reviews` : undefined}
                  />
                  <StatCard icon={<FolderKanban size={13} color={colors.gold} />} label="Projects" value={String(profile?.projectCount ?? 0)} />
                </View>

                <Card title="Unique visitors over time">
                  {views ? <TimeSeriesChart points={views.timeSeries} color={colors.gold} /> : <Text style={{ fontSize: 12, color: colors.inkSoft }}>Loading…</Text>}
                </Card>

                {strength ? (
                  <Card title="Profile strength">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: colors.inkSoft }}>Completion</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gold }}>{strength.percentage}%</Text>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${strength.percentage}%`, backgroundColor: colors.gold, borderRadius: 3 }} />
                    </View>
                    {(() => {
                      const missing = strength.fields.filter((f) => !f.done);
                      return missing.length > 0 ? (
                        <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 8 }}>{`Add ${missing[0].label.toLowerCase()} to improve your score`}</Text>
                      ) : (
                        <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 8 }}>Your profile is complete.</Text>
                      );
                    })()}
                  </Card>
                ) : null}
              </>
            )}

            {tab === 'visitors' && (
              <>
                <Card title="Unique visitors over time">
                  {views ? <TimeSeriesChart points={views.timeSeries} color={colors.gold} /> : <Text style={{ fontSize: 12, color: colors.inkSoft }}>Loading…</Text>}
                </Card>
                <Card title="Profile visits by country">
                  {views && views.locationBreakdown.length > 0 ? (
                    <DonutChart items={views.locationBreakdown} total={views.totalViews} />
                  ) : (
                    <Text style={{ fontSize: 12, color: colors.inkSoft }}>No views yet.</Text>
                  )}
                </Card>
                <Card title="Visitor type">
                  {views && views.visitorTypeBreakdown.length > 0 ? (
                    <BreakdownBars
                      items={views.visitorTypeBreakdown.map((v) => ({ label: v.role.charAt(0).toUpperCase() + v.role.slice(1), count: v.count }))}
                    />
                  ) : (
                    <Text style={{ fontSize: 12, color: colors.inkSoft }}>No views yet.</Text>
                  )}
                </Card>
                <Card title="Platform split">
                  {views && views.platformBreakdown.length > 0 ? (
                    <BreakdownBars items={views.platformBreakdown.map((p) => ({ label: p.platform === 'mobile' ? 'Mobile' : 'Web', count: p.count }))} />
                  ) : (
                    <Text style={{ fontSize: 12, color: colors.inkSoft }}>No views yet.</Text>
                  )}
                </Card>
                <Card title="Recent visitors">
                  {views && views.visitors.length > 0 ? (
                    <View style={{ gap: 12 }}>
                      {views.visitors.map((v, i) => {
                        const avatarUri = v.anonymized ? null : resolveMediaUrl(v.avatar);
                        return (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                              ) : (
                                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.inkSoft }}>{v.anonymized ? '?' : (v.displayName ?? '').slice(0, 2).toUpperCase()}</Text>
                              )}
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{v.anonymized ? `A ${v.role}` : v.displayName}</Text>
                              <Text style={{ fontSize: 10.5, color: colors.inkSoft, textTransform: 'capitalize' }}>{v.anonymized ? 'Private profile' : v.role}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, color: colors.inkSoft }}>No views yet.</Text>
                  )}
                </Card>
              </>
            )}

            {tab === 'projects' && (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <StatCard icon={<Briefcase size={13} color={colors.gold} />} label="Total projects" value={String(projects?.totalProjects ?? 0)} />
                  <StatCard icon={<Eye size={13} color="#C6A15B" />} label="Project views" value={String(projects?.kpis.views.value ?? 0)} />
                  <StatCard icon={<Bookmark size={13} color={colors.oxblood} />} label="Saves" value={String(projects?.kpis.saves.value ?? 0)} />
                  <StatCard icon={<MessageSquare size={13} color="#8b5cf6" />} label="Inquiries" value={String(projects?.kpis.inquiries.value ?? 0)} />
                </View>

                {projects && projects.projectRanking.length > 0 ? (
                  <Card title="Top project">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: colors.line, overflow: 'hidden' }}>
                        {(() => {
                          const thumbUri = resolveMediaUrl(projects.projectRanking[0].thumbnail);
                          return thumbUri ? <Image source={{ uri: thumbUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null;
                        })()}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{projects.projectRanking[0].title}</Text>
                        <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>
                          {`${projects.projectRanking[0].views} views · ${projects.projectRanking[0].saves} saves · ${projects.projectRanking[0].inquiries} inquiries`}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ) : null}

                <Card title="Views by category">
                  {(() => {
                    if (!projects || projects.projectRanking.length === 0) {
                      return <Text style={{ fontSize: 12, color: colors.inkSoft }}>No projects yet.</Text>;
                    }
                    const byCategory = new Map<string, number>();
                    for (const p of projects.projectRanking) {
                      const label = p.category || 'Uncategorized';
                      byCategory.set(label, (byCategory.get(label) ?? 0) + p.views);
                    }
                    const items = Array.from(byCategory.entries())
                      .map(([label, count]) => ({ label, count }))
                      .sort((a, b) => b.count - a.count);
                    return <BreakdownBars items={items} />;
                  })()}
                </Card>
              </>
            )}

            {tab === 'portfolio' && (
              <>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <StatCard icon={<Eye size={13} color={colors.gold} />} label="Total views" value={String(projects?.kpis.views.value ?? 0)} />
                  <StatCard icon={<FolderKanban size={13} color={colors.gold} />} label="Projects" value={String(projects?.totalProjects ?? 0)} />
                </View>
                {projects?.insights.length ? (
                  <Card title="Insights">
                    <View style={{ gap: 6 }}>
                      {projects.insights.map((line, i) => (
                        <Text key={i} style={{ fontSize: 12, color: colors.ink }}>{`• ${line}`}</Text>
                      ))}
                    </View>
                  </Card>
                ) : null}
                <Card title="Top performing projects">
                  {projects && projects.projectRanking.length > 0 ? (
                    <View style={{ gap: 12 }}>
                      {projects.projectRanking.slice(0, 8).map((p) => {
                        const thumbUri = resolveMediaUrl(p.thumbnail);
                        return (
                          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.line, overflow: 'hidden' }}>
                              {thumbUri ? <Image source={{ uri: thumbUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{p.title}</Text>
                              <Text style={{ fontSize: 10.5, color: colors.inkSoft }}>{`${p.views} views · ${p.likes} likes`}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, color: colors.inkSoft }}>No projects yet.</Text>
                  )}
                </Card>
              </>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
