import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, SlidersHorizontal, Map as MapIcon, List as ListIcon } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getEvents, getRecommendedEvents, getSavedItemsStatus } from '@fashub/api-client';
import type { EventListItem, RecommendedEvent } from '@fashub/types';
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from '@fashub/types';
import { LoadingState } from '../../components/LoadingState';
import { EmptyNotice } from '../../components/publicProfile/PortfolioTab';
import { EventCard } from '../../components/events/EventCard';
import { EventsMapWebView } from '../../components/events/EventsMapWebView';
import { EventPinCard } from '../../components/events/EventPinCard';
import { EventsFilterSheet, DEFAULT_EVENT_FILTERS, type EventFilterState } from '../../components/events/EventsFilterSheet';
import { violetColors as VF } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

type ViewMode = 'list' | 'map';
type CategoryFilter = 'all' | (typeof EVENT_CATEGORIES)[number];

/**
 * Full mobile rebuild of web's app/events/page.tsx — hero/search collapse
 * into a single header+search bar (mobile has no room for web's large
 * hero banner), filters move into a bottom sheet (EventsFilterSheet)
 * rather than web's sidebar/mobile-drawer split, and cards render
 * full-width single-column rather than web's responsive grid — everything
 * else (category tabs with counts, Recommended rail, category-grouped
 * sections, list/map toggle sharing one filtered dataset) mirrors web
 * directly. Map view uses WebView+Leaflet, not react-native-maps — see
 * EventsMapWebView.tsx for why.
 */
export default function EventsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<EventListItem[] | null>(null);
  const [recommended, setRecommended] = useState<RecommendedEvent[]>([]);
  const [recPersonalized, setRecPersonalized] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState<EventFilterState>(DEFAULT_EVENT_FILTERS);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<CategoryFilter | null>(null);

  const load = () => {
    setError('');
    getEvents({
      latitude: !filters.showAnyLocation && filters.latitude != null ? filters.latitude : undefined,
      longitude: !filters.showAnyLocation && filters.longitude != null ? filters.longitude : undefined,
      radius: !filters.showAnyLocation ? filters.radius : undefined,
      isFree: filters.showFreeOnly || undefined,
      userId: user?.id,
      limit: 50,
    })
      .then((res) => setEvents(res.events))
      .catch(() => setError("Couldn't load events."));

    if (user) {
      getRecommendedEvents(user.id, 8)
        .then((res) => {
          setRecommended(res.events);
          setRecPersonalized(res.personalized);
        })
        .catch(() => {});
    }
  };

  useEffect(load, [user?.id, filters.showAnyLocation, filters.latitude, filters.longitude, filters.radius, filters.showFreeOnly]);

  useEffect(() => {
    if (!user || !events || events.length === 0) return;
    getSavedItemsStatus(user.id, 'EVENT', events.map((e) => e.id))
      .then((res) => setSavedIds(new Set(Object.keys(res.saved).filter((id) => res.saved[id]))))
      .catch(() => {});
  }, [user?.id, events]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (events ?? []).forEach((e) => { counts[e.category] = (counts[e.category] ?? 0) + 1; });
    return counts;
  }, [events]);

  const filteredAndSorted = useMemo(() => {
    let list = events ?? [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q) || (e.city ?? '').toLowerCase().includes(q) || (e.tags ?? []).some((t) => t.toLowerCase().includes(q)));
    }
    const activeCategory = expandedCategory ?? category;
    if (activeCategory !== 'all') list = list.filter((e) => e.category === activeCategory);

    const sorted = [...list];
    switch (filters.sort) {
      case 'popular':
        sorted.sort((a, b) => b.attendeeCount - a.attendeeCount);
        break;
      case 'price_asc':
        sorted.sort((a, b) => (a.isFree ? 0 : a.price ?? Infinity) - (b.isFree ? 0 : b.price ?? Infinity));
        break;
      case 'price_free':
        sorted.sort((a, b) => Number(b.isFree) - Number(a.isFree));
        break;
      default:
        sorted.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }
    return sorted;
  }, [events, searchQuery, category, expandedCategory, filters.sort]);

  const activePin = activePinId ? (events ?? []).find((e) => e.id === activePinId) ?? null : null;

  const activeFilterCount = (filters.showFreeOnly ? 1 : 0) + (!filters.showAnyLocation ? 1 : 0) + (filters.sort !== 'date' ? 1 : 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>Events</Text>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 }}>
          <Search size={16} color={VF.inkFaint} strokeWidth={2} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search fashion events…"
            placeholderTextColor={VF.inkFaint}
            style={{ flex: 1, fontSize: 13.5, color: colors.ink }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flexDirection: 'row', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 10, overflow: 'hidden' }}>
            <Pressable onPress={() => setViewMode('list')} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: viewMode === 'list' ? colors.gold : 'transparent' }}>
              <ListIcon size={14} color={viewMode === 'list' ? '#fff' : colors.inkSoft} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: viewMode === 'list' ? '#fff' : colors.inkSoft }}>List</Text>
            </Pressable>
            <Pressable onPress={() => setViewMode('map')} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: viewMode === 'map' ? colors.gold : 'transparent' }}>
              <MapIcon size={14} color={viewMode === 'map' ? '#fff' : colors.inkSoft} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: viewMode === 'map' ? '#fff' : colors.inkSoft }}>Map</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => setFilterSheetOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }}>
            <SlidersHorizontal size={14} color={colors.ink} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['all', ...EVENT_CATEGORIES] as CategoryFilter[])
            .filter((c) => c === 'all' || (categoryCounts[c] ?? 0) > 0)
            .map((c) => {
              const active = category === c;
              const label = c === 'all' ? 'All' : EVENT_CATEGORY_LABELS[c];
              const count = c === 'all' ? (events?.length ?? 0) : categoryCounts[c] ?? 0;
              return (
                <Pressable
                  key={c}
                  onPress={() => { setCategory(c); setExpandedCategory(null); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? colors.gold : '#fff', borderWidth: 1, borderColor: active ? colors.gold : colors.line }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : colors.ink }}>{label}</Text>
                  <View style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : colors.line, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: active ? '#fff' : colors.inkSoft }}>{count}</Text>
                  </View>
                </Pressable>
              );
            })}
        </ScrollView>
      </View>

      {events === null ? (
        <LoadingState label="Loading events…" />
      ) : error ? (
        <EmptyNotice icon={Search} title="Couldn't load events" message={error} />
      ) : viewMode === 'map' ? (
        <View style={{ flex: 1 }}>
          <EventsMapWebView events={filteredAndSorted} activeId={activePinId} onPinPress={setActivePinId} />
          {activePin ? <EventPinCard event={activePin} userId={user?.id} onClose={() => setActivePinId(null)} /> : null}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 20 }}>
              {recommended.length > 0 ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>
                    {recPersonalized ? 'Recommended for You' : 'Popular Near You'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    {recommended.map((e) => (
                      <View key={e.id} style={{ width: 260 }}>
                        <EventCard event={e} userId={user?.id} initialSaved={savedIds.has(e.id)} matchScore={e.matchScore} />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {filteredAndSorted.length === 0 ? (
                <EmptyNotice icon={Search} title="No events found" message="Try a different search, category, or location." />
              ) : category === 'all' && !expandedCategory ? (
                EVENT_CATEGORIES.filter((c) => (categoryCounts[c] ?? 0) > 0).map((c) => {
                  const items = filteredAndSorted.filter((e) => e.category === c).slice(0, 3);
                  if (items.length === 0) return null;
                  return (
                    <View key={c} style={{ gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{EVENT_CATEGORY_LABELS[c]} <Text style={{ color: VF.inkFaint, fontWeight: '500' }}>({categoryCounts[c]})</Text></Text>
                        {categoryCounts[c] > 3 ? (
                          <Pressable onPress={() => setExpandedCategory(c)}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gold }}>See all</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <View style={{ gap: 12 }}>
                        {items.map((e) => <EventCard key={e.id} event={e} userId={user?.id} initialSaved={savedIds.has(e.id)} />)}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={{ gap: 12 }}>
                  {expandedCategory ? (
                    <Pressable onPress={() => setExpandedCategory(null)}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gold, marginBottom: 4 }}>← Back to all categories</Text>
                    </Pressable>
                  ) : null}
                  {filteredAndSorted.map((e) => <EventCard key={e.id} event={e} userId={user?.id} initialSaved={savedIds.has(e.id)} />)}
                </View>
              )}
          </View>
        </ScrollView>
      )}

      <EventsFilterSheet
        visible={filterSheetOpen}
        initial={filters}
        onClose={() => setFilterSheetOpen(false)}
        onApply={(f) => { setFilters(f); setFilterSheetOpen(false); }}
      />
    </SafeAreaView>
  );
}
