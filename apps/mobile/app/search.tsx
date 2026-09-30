import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, X, Layers, CalendarDays, FolderKanban, Users as UsersIcon } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { useTheme } from '../theme/ThemeProvider';
import { searchAll, resolveMediaUrl } from '@fashub/api-client';
import type { SearchAllResponse, SearchCategory, SearchPersonResult, SearchPageResult, SearchEventResult, SearchProjectResult } from '@fashub/types';
import { PageVerifiedBadge } from '../components/PageVerifiedBadge';
import { VerifiedBadge, isVerified } from '../components/VerifiedBadge';
import { LoadingState } from '../components/LoadingState';

const DEBOUNCE_MS = 300; // matches web's HeaderSearch exactly
const EMPTY: SearchAllResponse = {
  people: { results: [], total: 0 },
  pages: { results: [], total: 0 },
  events: { results: [], total: 0 },
  projects: { results: [], total: 0 },
};

function formatEventDate(iso: string | null | undefined) {
  if (!iso) return 'Date TBA';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Date TBA';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CATEGORY_NOUN: Record<Exclude<SearchCategory, 'all'>, { singular: string; plural: string }> = {
  people: { singular: 'person', plural: 'people' },
  pages: { singular: 'page', plural: 'pages' },
  events: { singular: 'event', plural: 'events' },
  projects: { singular: 'project', plural: 'projects' },
};
function categoryNoun(category: Exclude<SearchCategory, 'all'>, count: number): string {
  return count === 1 ? CATEGORY_NOUN[category].singular : CATEGORY_NOUN[category].plural;
}

/**
 * Mobile search-parity ticket — the mobile equivalent of BOTH web surfaces
 * at once: components/layout/HeaderSearch.tsx (the as-you-type preview,
 * 300ms debounced, category=all) and app/search-results/page.tsx (the full
 * tabbed/paginated results page). Mobile has no separate "dropdown over the
 * homepage" concept, so this one pushed screen (autofocused input at top)
 * covers both — typing drives the live "all" preview exactly like web's
 * header dropdown; tapping a category pill switches to that category's own
 * cursor-paginated full list exactly like web's results-page tabs. Same
 * GET /api/search backend both web surfaces call — no parallel search
 * logic, no category invented or dropped (people/pages/events/projects is
 * the real, confirmed set; not posts/services/communities).
 */
export default function SearchScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [data, setData] = useState<SearchAllResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Full paginated list for the active single category (mirrors web's
  // search-results page's categoryResults/categoryCursor pair exactly).
  const [categoryResults, setCategoryResults] = useState<any[]>([]);
  const [categoryCursor, setCategoryCursor] = useState<number | null>(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // The "all" preview — drives both the plain type-ahead view and the tab
  // count badges even while a single category is active.
  useEffect(() => {
    if (!debounced) { setData(null); setLoading(false); setFailed(false); return; }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    searchAll(debounced, 'all')
      .then((json) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) { setData(null); setFailed(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  // The active single category's own fully-paginated list.
  useEffect(() => {
    if (category === 'all' || !debounced) { setCategoryResults([]); setCategoryCursor(0); return; }
    setCategoryResults([]);
    setCategoryCursor(0);
    searchAll(debounced, category, { cursor: 0 })
      .then((json) => {
        const bucket = (json as any)[category];
        setCategoryResults(bucket.results);
        setCategoryCursor(bucket.results.length < bucket.total ? bucket.results.length : null);
      })
      .catch(() => {});
  }, [category, debounced]);

  const loadMore = () => {
    if (categoryCursor == null || loadingMore || category === 'all') return;
    setLoadingMore(true);
    searchAll(debounced, category, { cursor: categoryCursor })
      .then((json) => {
        const bucket = (json as any)[category];
        setCategoryResults((prev) => [...prev, ...bucket.results]);
        setCategoryCursor(categoryCursor + bucket.results.length < bucket.total ? categoryCursor + bucket.results.length : null);
      })
      .finally(() => setLoadingMore(false));
  };

  const d = data ?? EMPTY;
  const totalCount = d.people.total + d.pages.total + d.events.total + d.projects.total;
  const tabs: { key: SearchCategory; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'people', label: 'People', count: d.people.total },
    { key: 'pages', label: 'Pages', count: d.pages.total },
    { key: 'events', label: 'Events', count: d.events.total },
    { key: 'projects', label: 'Projects', count: d.projects.total },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: V.canvas, borderWidth: 1, borderColor: V.line, borderRadius: 999, paddingHorizontal: 12, height: 40 }}>
          <Search size={16} color={V.inkFaint} strokeWidth={2} />
          <TextInput
            ref={inputRef}
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search FaSHub"
            placeholderTextColor={V.inkFaint}
            style={{ flex: 1, fontSize: 14, color: colors.ink, paddingVertical: 0 }}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <X size={15} color={V.inkFaint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!debounced ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Text style={{ fontSize: 13.5, color: colors.inkSoft, textAlign: 'center' }}>Search for people, Pages, events, and projects.</Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // flexGrow/flexShrink: 0 pins this bar to its own content height —
            // without it, native Yoga has nothing telling it NOT to let this
            // ScrollView expand into the column's remaining space.
            // alignItems: 'center' on the content container is the actual
            // fix for the reported bug: RN's cross-axis default for a flex
            // container is 'stretch', so each tab Pressable was stretching
            // to fill the ScrollView's (ambiguous, native-Yoga-computed)
            // vertical space — rendering as full-height vertical capsules on
            // a real device/emulator instead of compact horizontal chips.
            // react-native-web's CSS-flexbox engine does not reproduce this
            // native-only Yoga behavior, which is why it passed web-preview
            // verification earlier despite being broken on-device.
            style={{ flexGrow: 0, flexShrink: 0, borderBottomWidth: 1, borderBottomColor: colors.line }}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8, paddingVertical: 10, alignItems: 'center' }}
          >
            {tabs.map((t) => {
              const active = category === t.key;
              // "All" is a permanent, always-ink anchor pill regardless of
              // which category is actually selected — every other pill is
              // a plain outline chip by default and fills with the brand
              // violet (not the reference photo's literal blue — FasHub's
              // own accent, consistent with every other design token in
              // this app) only when it's the selected one.
              const isAllTab = t.key === 'all';
              const bg = isAllTab ? colors.ink : active ? V.primarySoft : colors.paper;
              const border = isAllTab || active ? 0 : 1;
              const labelColor = isAllTab ? '#fff' : active ? V.primary : colors.ink;
              const countColor = isAllTab ? 'rgba(255,255,255,0.65)' : active ? V.primaryDeep : colors.inkSoft;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setCategory(t.key)}
                  style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: bg, borderWidth: border, borderColor: colors.line }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: labelColor }}>{t.label}</Text>
                  {data ? <Text style={{ fontSize: 12, fontWeight: '600', color: countColor }}>{t.count}</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
            <LoadingState label="Searching…" />
          ) : failed ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
              <Text style={{ fontSize: 13.5, color: colors.inkSoft, textAlign: 'center' }}>Search is unavailable right now. Try again.</Text>
            </View>
          ) : category === 'all' ? (
            totalCount === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
                <Text style={{ fontSize: 13.5, color: colors.inkSoft, textAlign: 'center' }}>No results for '{debounced}'.</Text>
              </View>
            ) : (
              // flex: 1 is required here — without it this ScrollView's own
              // height is undefined in the surrounding flex column (sized to
              // its content instead of the remaining screen space), so on
              // native it can render with no usable scrollable viewport at
              // all depending on how much space the tab bar above claimed.
              // Combined with the tab-bar stretching bug above, this is the
              // most coherent explanation for results (e.g. Events, whose
              // list is long) appearing to "fail to load" on a real device
              // while working fine in the web preview.
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: 20 }}>
                {d.people.total > 0 ? (
                  <SearchSection icon={<UsersIcon size={15} color={colors.ink} />} label="People" total={d.people.total} onSeeAll={() => setCategory('people')}>
                    {d.people.results.map((p) => <PersonRow key={p.id} p={p} onPress={() => router.push(`/profile/${p.id}`)} />)}
                  </SearchSection>
                ) : null}
                {d.pages.total > 0 ? (
                  <SearchSection icon={<Layers size={15} color={colors.ink} />} label="Pages" total={d.pages.total} onSeeAll={() => setCategory('pages')}>
                    {d.pages.results.map((p) => <PageRow key={p.id} p={p} onPress={() => router.push(`/page/${p.handle}`)} />)}
                  </SearchSection>
                ) : null}
                {d.events.total > 0 ? (
                  <SearchSection icon={<CalendarDays size={15} color={colors.ink} />} label="Events" total={d.events.total} onSeeAll={() => setCategory('events')}>
                    {d.events.results.map((e) => <EventRow key={e.id} e={e} onPress={() => router.push(`/event/${e.id}`)} />)}
                  </SearchSection>
                ) : null}
                {d.projects.total > 0 ? (
                  <SearchSection icon={<FolderKanban size={15} color={colors.ink} />} label="Projects" total={d.projects.total} onSeeAll={() => setCategory('projects')}>
                    {d.projects.results.map((p) => <ProjectRow key={p.id} p={p} onPress={() => router.push(`/project/${p.id}`)} />)}
                  </SearchSection>
                ) : null}
              </ScrollView>
            )
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
              <Text style={{ fontSize: 12.5, color: colors.inkSoft, marginBottom: 10 }}>
                {(d as any)[category].total} {categoryNoun(category, (d as any)[category].total)}
              </Text>
              {categoryResults.length === 0 ? (
                <Text style={{ fontSize: 13.5, color: colors.inkSoft, textAlign: 'center', paddingVertical: 40 }}>
                  No {categoryNoun(category, 0)} found for '{debounced}'. Try the All tab for more results.
                </Text>
              ) : (
                <>
                  {categoryResults.map((item) =>
                    category === 'people' ? <PersonRow key={item.id} p={item} onPress={() => router.push(`/profile/${item.id}`)} /> :
                    category === 'pages' ? <PageRow key={item.id} p={item} onPress={() => router.push(`/page/${item.handle}`)} /> :
                    category === 'events' ? <EventRow key={item.id} e={item} onPress={() => router.push(`/event/${item.id}`)} /> :
                    <ProjectRow key={item.id} p={item} onPress={() => router.push(`/project/${item.id}`)} />
                  )}
                  {categoryCursor != null ? (
                    <Pressable disabled={loadingMore} onPress={loadMore} style={{ paddingVertical: 14, alignItems: 'center' }}>
                      {loadingMore ? <ActivityIndicator color={colors.gold} /> : <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gold }}>Load more</Text>}
                    </Pressable>
                  ) : (
                    // Everything this category has for the query is already
                    // shown — a friendly nudge toward the broader "All" view,
                    // matching the reviewed design's "Only N match... try
                    // the All tab" copy.
                    <Text style={{ fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', marginTop: 16 }}>
                      Only {categoryResults.length} {categoryNoun(category, categoryResults.length)} {categoryResults.length === 1 ? 'matches' : 'match'} '{debounced}'. Try the All tab for more results.
                    </Text>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

function SearchSection({ icon, label, total, onSeeAll, children }: { icon: React.ReactNode; label: string; total: number; onSeeAll: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon}
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{label} <Text style={{ color: V.inkFaint, fontWeight: '500' }}>({total})</Text></Text>
        </View>
        {total > 5 ? (
          <Pressable onPress={onSeeAll} hitSlop={6}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gold }}>Show all →</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ gap: 2 }}>{children}</View>
    </View>
  );
}

function RowAvatar({ uri, fallbackText, shape = 'circle', bg, fallbackColor = '#fff', icon }: { uri: string | null; fallbackText: string; shape?: 'circle' | 'square'; bg: string; fallbackColor?: string; icon?: React.ReactNode }) {
  const resolved = resolveMediaUrl(uri);
  const radius = shape === 'circle' ? 22 : 10;
  return (
    <View style={{ width: 44, height: 44, borderRadius: radius, overflow: 'hidden', backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {resolved ? (
        <Image source={{ uri: resolved }} style={{ width: '100%', height: '100%' }} />
      ) : icon ? icon : (
        <Text style={{ fontSize: 15, fontWeight: '700', color: fallbackColor }}>{(fallbackText || '?').slice(0, 2).toUpperCase()}</Text>
      )}
    </View>
  );
}

function PersonRow({ p, onPress }: { p: SearchPersonResult; onPress: () => void }) {
  const { colors } = useTheme();
  const subtitle = [p.title || p.role, p.location].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
      <RowAvatar uri={p.avatar} fallbackText={p.displayName} bg={colors.gold} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{p.displayName}</Text>
          {isVerified(p) ? <VerifiedBadge size="sm" /> : null}
        </View>
        {subtitle ? <Text style={{ fontSize: 12, color: colors.inkSoft, textTransform: 'capitalize' }} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

function PageRow({ p, onPress }: { p: SearchPageResult; onPress: () => void }) {
  const { colors } = useTheme();
  const subtitle = [p.category, p.location].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
      {/* Light-violet circle + initials when there's no cover image
          (reviewed design), not a generic dark Page icon. */}
      <RowAvatar uri={p.avatar} fallbackText={p.name} bg={V.primarySoft} fallbackColor={V.primary} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{p.name}</Text>
          {p.verified ? <PageVerifiedBadge size="sm" /> : null}
        </View>
        <Text style={{ fontSize: 12, color: colors.inkSoft }} numberOfLines={1}>
          Page{subtitle ? ` · ${subtitle}` : ''} · {(p.followerCount ?? 0).toLocaleString()} followers
        </Text>
      </View>
    </Pressable>
  );
}

function EventRow({ e, onPress }: { e: SearchEventResult; onPress: () => void }) {
  const { colors } = useTheme();
  const hostName = e.organizerPage?.name ?? e.organizer?.displayName ?? 'Unknown';
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
      <RowAvatar uri={e.image} fallbackText={e.title} shape="square" bg={V.amber} icon={<CalendarDays size={17} color="#fff" />} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{e.title}</Text>
        <Text style={{ fontSize: 12, color: colors.inkSoft }} numberOfLines={1}>
          {formatEventDate(e.startDate)}{e.location ? ` · ${e.location}` : ''} · Hosted by {hostName}
        </Text>
      </View>
    </Pressable>
  );
}

function ProjectRow({ p, onPress }: { p: SearchProjectResult; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
      <RowAvatar uri={p.coverImage} fallbackText={p.title} shape="square" bg={V.primary} icon={<FolderKanban size={17} color="#fff" />} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{p.title}</Text>
        <Text style={{ fontSize: 12, color: colors.inkSoft }} numberOfLines={1}>by {p.ownerName}{p.category ? ` · ${p.category}` : ''}</Text>
      </View>
    </Pressable>
  );
}
