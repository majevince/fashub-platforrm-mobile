import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Search, Flame, Sparkles, Compass, TrendingUp, Award, Users, MessageSquare, UserCheck, Hash } from 'lucide-react-native';
import { violetColors as VF } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { getCommunities, getCommunityDashboardStats, getCommunityTrendingTags, joinCommunity, toggleSavedItem, getSavedItemsStatus } from '@fashub/api-client';
import type { Community, CommunityScope, CommunityDiscoveryTab, CommunityDashboardStats } from '@fashub/types';
import { COMMUNITY_CATEGORIES } from '@fashub/types';
import { LoadingState } from '../../components/LoadingState';
import { EmptyNotice } from '../../components/publicProfile/PortfolioTab';
import { CommunityCard } from '../../components/communities/CommunityCard';

const DISCOVERY_TABS: { key: CommunityDiscoveryTab; label: string; Icon: typeof Flame }[] = [
  { key: 'trending', label: 'Trending', Icon: Flame },
  { key: 'recommended', label: 'Recommended', Icon: Sparkles },
  { key: 'new', label: 'New', Icon: Compass },
  { key: 'active', label: 'Active', Icon: TrendingUp },
  { key: 'editors', label: "Editors' Picks", Icon: Award },
];

const LIMIT = 12;

/**
 * Mobile rebuild of web's app/communities/page.tsx. Web's per-sort-mode
 * grid-column-count switching (horizontal scroll for trending, 4-col for
 * recommended, 3-col for active) collapses into one consistent
 * single-column list on mobile — same sort tabs, same data, just one
 * layout instead of five. The embedded Events section on web's page is
 * skipped (that's Events feature content bolted onto this page, already
 * fully built as its own tab) and the "Activity Score donut for
 * communities[0]" hero visualization is skipped as a decorative one-off —
 * everything else (search, category rail, discover/my toggle, discovery
 * tabs, dashboard stats tiles, trending tags, pagination) is ported.
 */
export default function CommunitiesScreen() {
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [communities, setCommunities] = useState<Community[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [scope, setScope] = useState<CommunityScope>('discover');
  const [sort, setSort] = useState<CommunityDiscoveryTab>('trending');

  const [dashStats, setDashStats] = useState<CommunityDashboardStats | null>(null);
  const [trendingTags, setTrendingTags] = useState<{ tag: string; communityCount: number }[]>([]);

  const effectiveSort = scope === 'my' ? 'popular' : sort;

  const load = (nextOffset: number, append: boolean) => {
    setError('');
    if (append) setLoadingMore(true);
    getCommunities({
      tab: scope,
      userId: user?.id,
      limit: LIMIT,
      offset: nextOffset,
      sort: effectiveSort,
      search: search.trim() || undefined,
      category: category ?? undefined,
    })
      .then((res) => {
        setCommunities((prev) => (append && prev ? [...prev, ...res.communities] : res.communities));
        setTotal(res.total);
        setOffset(nextOffset);
      })
      .catch(() => setError("Couldn't load communities."))
      .finally(() => setLoadingMore(false));
  };

  useEffect(() => { load(0, false); }, [user?.id, scope, sort, category, search]);

  useEffect(() => {
    if (!user) return;
    getCommunityDashboardStats(user.id).then(setDashStats).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    getCommunityTrendingTags(8).then((res) => setTrendingTags(res.tags)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || !communities || communities.length === 0) return;
    getSavedItemsStatus(user.id, 'COMMUNITY', communities.map((c) => c.id))
      .then((res) => {
        const ids = new Set(Object.keys(res.saved).filter((id) => res.saved[id]));
        setSavedIds(ids);
      })
      .catch(() => {});
  }, [user?.id, communities]);

  const displayedCommunities = useMemo(() => {
    if (!communities) return [];
    return communities.map((c) => ({ ...c, isSaved: savedIds.has(c.id) || c.isSaved }));
  }, [communities, savedIds]);

  const handleJoin = async (slug: string) => {
    if (!user) return;
    try {
      const res = await joinCommunity(slug, user.id);
      setCommunities((prev) =>
        prev
          ? prev.map((c) => (c.slug === slug ? { ...c, myMembership: { ...(c.myMembership as any), joinStatus: res.joinStatus, role: 'member' }, memberCount: res.joinStatus === 'approved' ? c.memberCount + 1 : c.memberCount } : c))
          : prev
      );
    } catch {
      // best-effort — errors (e.g. private community) surface via a future toast; no-op for now
    }
  };

  const handleToggleSave = async (id: string) => {
    if (!user) return;
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      await toggleSavedItem(user.id, id, 'COMMUNITY');
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
          <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>Communities</Text>
        </View>
        <Pressable onPress={() => router.push('/community/create')} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Plus size={14} color={colors.ivory} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ivory }}>Create</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 }}>
            <Search size={16} color={VF.inkFaint} strokeWidth={2} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search communities…" placeholderTextColor={VF.inkFaint} style={{ flex: 1, fontSize: 13.5, color: colors.ink }} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Pressable onPress={() => setCategory(null)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: category === null ? colors.gold : colors.paper, borderWidth: 1, borderColor: category === null ? colors.gold : colors.line }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: category === null ? colors.ivory : colors.ink }}>All</Text>
            </Pressable>
            {COMMUNITY_CATEGORIES.map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: category === c ? colors.gold : colors.paper, borderWidth: 1, borderColor: category === c ? colors.gold : colors.line }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: category === c ? colors.ivory : colors.ink }}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 10, overflow: 'hidden' }}>
            <Pressable onPress={() => setScope('discover')} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, backgroundColor: scope === 'discover' ? colors.gold : 'transparent' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: scope === 'discover' ? colors.ivory : colors.inkSoft }}>Discover</Text>
            </Pressable>
            <Pressable onPress={() => setScope('my')} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, backgroundColor: scope === 'my' ? colors.gold : 'transparent' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: scope === 'my' ? colors.ivory : colors.inkSoft }}>My Communities</Text>
            </Pressable>
          </View>

          {scope === 'discover' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {DISCOVERY_TABS.map(({ key, label, Icon }) => {
                const active = sort === key;
                return (
                  <Pressable key={key} onPress={() => setSort(key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? colors.ink : colors.paper, borderWidth: 1, borderColor: active ? colors.ink : colors.line }}>
                    <Icon size={13} color={active ? colors.gold : colors.inkSoft} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? colors.ivory : colors.inkSoft }}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {dashStats ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                { Icon: Users, label: 'Communities Joined', value: dashStats.communitiesJoined },
                { Icon: MessageSquare, label: 'New Discussions', value: dashStats.newDiscussionsToday },
                { Icon: UserCheck, label: 'Active Members Now', value: dashStats.activeMembersNow },
                { Icon: Hash, label: 'Top Trending Topic', value: dashStats.topTrendingTag ?? '—' },
              ].map(({ Icon, label, value }) => (
                <View key={label} style={{ flex: 1, minWidth: '45%', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, gap: 5 }}>
                  <Icon size={14} color={colors.gold} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{value}</Text>
                  <Text style={{ fontSize: 9, fontWeight: '500', color: colors.inkSoft, textTransform: 'uppercase' }}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {trendingTags.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {trendingTags.map(({ tag, communityCount }) => (
                <View key={tag} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.gold }}>#{tag}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '500', color: colors.inkSoft }}>({communityCount})</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          {communities === null ? (
            <LoadingState label="Loading communities…" />
          ) : error ? (
            <EmptyNotice icon={Search} title="Couldn't load communities" message={error} />
          ) : displayedCommunities.length === 0 ? (
            <EmptyNotice
              icon={Users}
              title={scope === 'my' ? 'No communities yet' : 'No communities found'}
              message={scope === 'my' ? 'Join a community to see it here.' : 'Try a different search, category, or filter.'}
            />
          ) : (
            <>
              {displayedCommunities.map((c, i) => (
                <CommunityCard key={c.id} community={c} onJoin={handleJoin} onToggleSave={handleToggleSave} ribbon={sort === 'trending' && i === 0 && scope === 'discover' ? 'Featured' : sort === 'new' ? 'New' : undefined} />
              ))}
              {total > offset + LIMIT && sort !== 'trending' ? (
                <Pressable onPress={() => load(offset + LIMIT, true)} disabled={loadingMore} style={{ borderRadius: 999, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.line }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{loadingMore ? 'Loading…' : 'Load more'}</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
