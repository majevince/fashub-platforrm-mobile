import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { matchProfessionals, resolveMediaUrl, findOrCreateConversation } from '@fashub/api-client';
import { MATCH_CATEGORIES, CATEGORY_DOT_COLORS, MATCH_SORT_OPTIONS, type MatchedProfessional, type MatchResponse, type SortBy } from '@fashub/types';
import { useAuth } from '../../context/AuthContext';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { MatchCard } from '../../components/professionals/MatchCard';
import { CompactMatchCard } from '../../components/professionals/CompactMatchCard';
import { MatchRing } from '../../components/professionals/MatchRing';
import { VerifiedBadge, isVerified } from '../../components/VerifiedBadge';
import { FiltersSheet, DEFAULT_FILTERS, type FilterState } from '../../components/professionals/FiltersSheet';
import { formatStartingPrice } from '../../lib/matchFormat';
import { setSelectedMatch } from '../../lib/selectedMatchStore';

const CARD_GAP = 10;

/**
 * "Professionals" — 1:1 mobile port of web's /search page (Header nav entry
 * "Professionals"). Same single matching endpoint (POST /api/search/match)
 * for both the main search and the recommended carousel, same 15 categories,
 * same 10 filter dimensions (in FiltersSheet), same 5 sort options, same
 * server-computed match%/badges/reasons — nothing recomputed client-side.
 * Filters are NOT persisted between sessions (confirmed web doesn't either).
 */
export default function ProfessionalsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortBy>('best-match');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [results, setResults] = useState<MatchResponse | null>(null);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  const [recommended, setRecommended] = useState<MatchedProfessional[] | null>(null);

  // Location for the default search, in order: the account's saved profile
  // location (resolved server-side from `userId` — see buildRequest's
  // preferSavedLocation), then this device's GPS, then none (the server runs
  // an honest worldwide search). GPS is best-effort: denying it no longer
  // sends a fake 0,0/radius-500 "worldwide" request, which the server actually
  // treated as a 500 km circle off the coast of West Africa (33 results).
  // `locationResolved` gates the first search so it can't race the GPS fix.
  const [locationResolved, setLocationResolved] = useState(false);
  // Coordinates from the automatic GPS fix — anything different that reaches
  // handleApplyFilters was chosen by the user ("use my current location" in
  // the filters sheet) and then wins over the saved profile location.
  const autoCoords = useRef<{ lat: number; lng: number } | null>(null);
  const [locationEdited, setLocationEdited] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          autoCoords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setFilters((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        }
      } catch {
        // No GPS — fall through to saved location / worldwide on the server.
      } finally {
        setLocationResolved(true);
      }
    })();
  }, []);

  const buildRequest = useCallback((f: FilterState, sb: SortBy, q: string, page: number, edited: boolean = locationEdited) => ({
    query: q,
    description: f.description,
    categories: f.categories,
    gender: f.gender,
    occasion: f.occasion || undefined,
    fabricType: f.fabricType || undefined,
    budgetMin: f.budgetMin,
    budgetMax: f.budgetMax,
    currency: f.currency,
    professionalType: f.professionalType,
    skillLevel: 'any' as const,
    minRating: f.minRating,
    minExperience: f.minExperience,
    deliveryMode: f.deliveryMode,
    timeline: f.timeline,
    latitude: f.latitude ?? undefined,
    longitude: f.longitude ?? undefined,
    userId: user?.id,
    preferSavedLocation: !edited,
    radius: f.country ? 50000 : f.radius,
    country: f.country || undefined,
    sortBy: sb,
    page,
    limit: 20,
  }), [user?.id, locationEdited]);

  const search = useCallback((f: FilterState, sb: SortBy, q: string, page = 1, append = false, edited: boolean = locationEdited) => {
    if (!locationResolved) return; // wait for the GPS attempt to settle first
    if (page === 1) { setError(''); if (!append) setResults(null); } else { setLoadingMore(true); }
    matchProfessionals(buildRequest(f, sb, q, page, edited))
      .then((res) => {
        setResults((prev) => (append && prev ? { ...res, professionals: [...prev.professionals, ...res.professionals] } : res));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load professionals."))
      .finally(() => setLoadingMore(false));
  }, [buildRequest, locationResolved, locationEdited]);

  useEffect(() => {
    if (!locationResolved) return;
    search(filters, sortBy, query);
    matchProfessionals({ ...buildRequest(DEFAULT_FILTERS, 'best-match', '', 1), latitude: filters.latitude ?? undefined, longitude: filters.longitude ?? undefined, radius: 50000, limit: 8 })
      .then((res) => setRecommended(res.professionals))
      .catch(() => setRecommended([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationResolved]);

  const handleSearch = () => search(filters, sortBy, query);
  const handleSort = (sb: SortBy) => { setSortBy(sb); search(filters, sb, query); };
  const handleApplyFilters = (f: FilterState) => {
    const auto = autoCoords.current;
    const chosen = f.latitude != null && f.longitude != null && (!auto || f.latitude !== auto.lat || f.longitude !== auto.lng);
    if (chosen) setLocationEdited(true);
    setFilters(f);
    setFiltersOpen(false);
    // setLocationEdited hasn't flushed yet — pass the value this call needs.
    search(f, sortBy, query, 1, false, chosen || locationEdited);
  };
  const toggleCategory = (id: string) => {
    const next = { ...filters, categories: filters.categories.includes(id) ? filters.categories.filter((c) => c !== id) : [...filters.categories, id] };
    setFilters(next);
    search(next, sortBy, query);
  };

  const openDetail = (pro: MatchedProfessional, rank?: number) => {
    setSelectedMatch(pro);
    router.push(`/professional/${pro.id}?rank=${rank ?? ''}`);
  };

  const handleMessage = async (pro: MatchedProfessional) => {
    if (!user) return;
    try {
      const { conversation } = await findOrCreateConversation(user.id, pro.id);
      router.push(`/messages/${conversation.id}`);
    } catch {
      // Non-fatal — the user can retry from the detail screen.
    }
  };

  if (!user) return null;

  const grid = results?.professionals ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: V.canvas }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <View>
            <View style={{ padding: 16, gap: 12 }}>
              <View style={{ backgroundColor: V.primarySoft, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: V.primaryDeep }} />
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: V.primaryDeep }}>Matching made friendly</Text>
              </View>
              <Text style={{ fontSize: 24, fontWeight: '700', color: V.ink, lineHeight: 30 }}>
                Meet the professionals <Text style={{ color: V.primary }}>made for you.</Text>
              </Text>
              <Text style={{ fontSize: 13, color: V.inkSoft, lineHeight: 19 }}>Pick a few categories and we'll rank verified designers & tailors for you.</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: V.surface, borderWidth: 1, borderColor: V.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Search size={16} color={V.inkFaint} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearch}
                  placeholder="Search a style, city or occasion…"
                  placeholderTextColor={V.inkFaint}
                  style={{ flex: 1, fontSize: 13.5, color: V.ink }}
                  returnKeyType="search"
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {MATCH_CATEGORIES.map((c, i) => {
                  const active = filters.categories.includes(c.id);
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => toggleCategory(c.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: active ? V.primary : V.surface, borderWidth: 1, borderColor: active ? V.primary : V.line }}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? '#fff' : CATEGORY_DOT_COLORS[i % CATEGORY_DOT_COLORS.length] }} />
                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: active ? '#fff' : V.ink }}>{c.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {recommended && recommended.length > 0 ? (
              <View style={{ paddingBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: V.ink, paddingHorizontal: 16, marginBottom: 10 }}>Recommended for you</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
                  {recommended.map((pro) => (
                    <Pressable key={pro.id} onPress={() => openDetail(pro)} style={{ width: 150, borderRadius: 16, overflow: 'hidden', backgroundColor: V.surface, borderWidth: 1, borderColor: V.line }}>
                      <View style={{ height: 90, backgroundColor: V.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                        {resolveMediaUrl(pro.avatar) ? (
                          <Image source={{ uri: resolveMediaUrl(pro.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <Text style={{ fontSize: 24, fontWeight: '700', color: V.primaryDeep }}>{pro.name.slice(0, 2).toUpperCase()}</Text>
                        )}
                        <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: V.surface, borderRadius: 999, padding: 2 }}>
                          <MatchRing score={pro.matchScore} size={28} />
                        </View>
                      </View>
                      <View style={{ padding: 10, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: V.ink, flexShrink: 1 }} numberOfLines={1}>{pro.name}</Text>
                          {isVerified({ subscriptionTier: pro.subscriptionTier, verified: pro.verified }) ? <VerifiedBadge size="sm" /> : null}
                        </View>
                        <Text style={{ fontSize: 10.5, fontWeight: '500', color: V.inkFaint }} numberOfLines={1}>{formatStartingPrice(pro)}</Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: V.ink }}>{results ? `${results.total} professionals` : ' '}</Text>
                {results?.query.personalized ? (
                  <View style={{ backgroundColor: V.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: V.primary }}>Personalized for you</Text>
                  </View>
                ) : null}
              </View>
              <Pressable onPress={() => setFiltersOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <SlidersHorizontal size={14} color={V.primary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: V.primary }}>Filters</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 14 }}>
              {MATCH_SORT_OPTIONS.map((s) => {
                const active = sortBy === s.id;
                return (
                  <Pressable key={s.id} onPress={() => handleSort(s.id)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: active ? V.ink : V.surface, borderWidth: 1, borderColor: active ? V.ink : V.line }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '600', color: active ? '#fff' : V.inkSoft }}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {error ? (
              <ErrorState message={error} onRetry={handleSearch} tint={{ accent: V.primary, text: V.ink }} />
            ) : results === null ? (
              <LoadingState label="Finding your matches…" tint={{ accent: V.primary, text: V.inkSoft }} />
            ) : grid.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: V.inkSoft, textAlign: 'center' }}>No professionals match these filters yet. Try widening your search.</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16, gap: 14 }}>
                {results.topPick ? (
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: V.primary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Top Pick for You</Text>
                    <MatchCard
                      pro={results.topPick}
                      rank={1}
                      spotlight
                      onViewProfile={() => router.push(`/profile/${results.topPick!.id}`)}
                      onMessage={() => handleMessage(results.topPick!)}
                    />
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP }}>
                  {grid.filter((p) => p.id !== results.topPick?.id).map((pro, i) => (
                    <View key={pro.id} style={{ width: `${(100 - (CARD_GAP / 3.6)) / 2}%` }}>
                      <CompactMatchCard pro={pro} onPress={() => openDetail(pro, i + 2)} onViewProfile={() => router.push(`/profile/${pro.id}`)} />
                    </View>
                  ))}
                </View>

                {results.page < results.totalPages ? (
                  <Pressable
                    onPress={() => search(filters, sortBy, query, results.page + 1, true)}
                    disabled={loadingMore}
                    style={{ alignItems: 'center', paddingVertical: 14 }}
                  >
                    {loadingMore ? <ActivityIndicator color={V.primary} /> : <Text style={{ fontSize: 13, fontWeight: '700', color: V.primary }}>Load more</Text>}
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
      </ScrollView>

      <FiltersSheet visible={filtersOpen} initial={filters} onClose={() => setFiltersOpen(false)} onApply={handleApplyFilters} />
    </SafeAreaView>
  );
}
