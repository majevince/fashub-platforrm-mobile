import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, MapPin, Star, Heart, TrendingUp, Sparkles, ChevronDown, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { getNetworkProfiles, getUserProfile, followUser, findOrCreateConversation } from '@fashub/api-client';
import { ROLE_FILTER_LABELS, NETWORK_CATEGORIES, NETWORK_EVENTS, type NetworkProfile, type NetworkSort } from '@fashub/types';
import { NetworkCard } from '../../components/network/NetworkCard';
import { haversineKm, buildSections, sortProfiles, type NetworkSection } from '../../lib/networkSections';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';

const SORTS: { key: NetworkSort; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'nearest', label: 'Nearest' },
  { key: 'top-rated', label: 'Top Rated' },
  { key: 'most-followed', label: 'Most Followed' },
  { key: 'newest', label: 'Newest' },
];
const SECTION_ICONS = { pin: MapPin, star: Star, heart: Heart, trending: TrendingUp, sparkle: Sparkles };

/**
 * 1:1 port of app/network/page.tsx's actual behavior: ONE data source
 * (GET /api/users?enriched=1), everything else — sections, filters, sort,
 * search, distance — computed client-side, exactly like web (confirmed via
 * direct source read, not assumed). No geolocation permission is involved
 * anywhere on web's version either: distance is purely a haversine between
 * both users' stored profile lat/lon, silently absent if the current user
 * has none — replicated exactly, including that silence.
 */
export default function NetworkScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [profiles, setProfiles] = useState<NetworkProfile[] | null>(null);
  const [error, setError] = useState('');
  const [selfLocation, setSelfLocation] = useState<{ lat: number | null; lon: number | null; city: string | null; country: string | null }>({ lat: null, lon: null, city: null, country: null });
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [tab, setTab] = useState<'discover' | 'following'>('discover');
  const [filterRole, setFilterRole] = useState<'all' | 'designer' | 'tailor' | 'individual'>('all');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterEvent, setFilterEvent] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<NetworkSort>('recommended');
  const [query, setQuery] = useState('');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);

  const load = () => {
    if (!user) return;
    setError('');
    Promise.all([getNetworkProfiles(), getUserProfile(user.id, user.id)])
      .then(([list, self]) => {
        setProfiles(list);
        const selfProf = self.individualProfile ?? self.designerProfile ?? self.tailorProfile;
        setSelfLocation({ lat: selfProf?.latitude ?? null, lon: selfProf?.longitude ?? null, city: selfProf?.city ?? null, country: selfProf?.country ?? null });
        setFollowingIds(new Set(selfProf?.following ?? []));
        setFollowerCount(selfProf?.followers?.length ?? 0);
        setFollowingCount(selfProf?.following?.length ?? 0);
      })
      .catch(() => setError("Couldn't load the network. Check your connection and try again."));
  };

  useEffect(load, [user]);

  const distances = useMemo(() => {
    const map = new Map<string, number>();
    if (!profiles || selfLocation.lat == null || selfLocation.lon == null) return map;
    for (const p of profiles) {
      if (p.latitude != null && p.longitude != null) {
        map.set(p.id, haversineKm(selfLocation.lat, selfLocation.lon, p.latitude, p.longitude));
      }
    }
    return map;
  }, [profiles, selfLocation]);

  const discoverProfiles = useMemo(() => (profiles ?? []).filter((p) => p.id !== user?.id && !followingIds.has(p.id)), [profiles, followingIds, user?.id]);
  const followingProfiles = useMemo(() => (profiles ?? []).filter((p) => followingIds.has(p.id)), [profiles, followingIds]);

  const baseList = tab === 'discover' ? discoverProfiles : followingProfiles;

  const hasActiveFilters = filterRole !== 'all' || !!filterCategory || !!filterEvent || query.trim().length > 0;

  const filtered = useMemo(() => {
    let list = baseList;
    if (filterRole !== 'all') list = list.filter((p) => p.role === filterRole);
    if (filterCategory) {
      const re = new RegExp(filterCategory, 'i');
      list = list.filter((p) => re.test(p.specialties.join(' ')) || re.test(p.bio ?? ''));
    }
    if (filterEvent) {
      const re = new RegExp(filterEvent, 'i');
      list = list.filter((p) => re.test(p.specialties.join(' ')) || re.test(p.bio ?? ''));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => [p.displayName, p.bio, p.city, p.country, ...p.specialties].filter(Boolean).some((v) => v!.toLowerCase().includes(q)));
    }
    return sortProfiles(list, sortBy, distances);
  }, [baseList, filterRole, filterCategory, filterEvent, query, sortBy, distances]);

  const sections: NetworkSection[] = useMemo(() => {
    if (tab !== 'discover' || hasActiveFilters) return [];
    return buildSections(discoverProfiles, selfLocation, distances);
  }, [tab, hasActiveFilters, discoverProfiles, selfLocation, distances]);

  const showSections = sections.length > 0;

  const handleToggleFollow = async (profile: NetworkProfile) => {
    if (!user) return;
    const wasFollowing = followingIds.has(profile.id);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(profile.id);
      else next.add(profile.id);
      return next;
    });
    setFollowingCount((c) => (wasFollowing ? c - 1 : c + 1));
    try {
      await followUser(profile.id, user.id);
    } catch {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(profile.id);
        else next.delete(profile.id);
        return next;
      });
      setFollowingCount((c) => (wasFollowing ? c + 1 : c - 1));
    }
  };

  const handleMessage = async (profile: NetworkProfile) => {
    if (!user) return;
    try {
      const { conversation } = await findOrCreateConversation(user.id, profile.id);
      router.push(`/messages/${conversation.id}`);
    } catch {
      Alert.alert("Couldn't open conversation", 'Please try again.');
    }
  };

  if (!user) return null;

  const renderCard = (p: NetworkProfile) => (
    <View key={p.id} style={{ width: '48.5%' }}>
      <NetworkCard
        profile={p}
        distanceKm={distances.get(p.id) ?? null}
        isFollowing={followingIds.has(p.id)}
        onToggleFollow={() => handleToggleFollow(p)}
        onMessage={() => handleMessage(p)}
        onPress={() => router.push(`/profile/${p.id}`)}
      />
    </View>
  );

  const header = (
    <View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: 10 }}>
        <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '900', letterSpacing: -0.3, color: colors.ink }}>Network</Text>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, marginTop: 2 }}>Find and connect with designers, tailors, and members.</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <View style={{ backgroundColor: '#F3EDFB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6D28D9' }}>{followerCount} followers</Text>
          </View>
          <View style={{ backgroundColor: '#FCE7F3', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#BE185D' }}>{followingCount} following</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 }}>
          <Search size={15} color={colors.inkSoft} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search people…" placeholderTextColor={colors.inkSoft} style={{ flex: 1, fontSize: 13, fontWeight: '400', color: colors.ink, padding: 0 }} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, marginTop: 12 }}>
        {(['discover', 'following'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center', backgroundColor: tab === t ? colors.ink : colors.paper, borderWidth: 1, borderColor: tab === t ? colors.ink : colors.line }}>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: tab === t ? colors.ivory : colors.inkSoft, textTransform: 'capitalize' }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 10 }}>
        {Object.entries(ROLE_FILTER_LABELS).map(([key, label]) => {
          const active = filterRole === key;
          return (
            <Pressable key={key} onPress={() => setFilterRole(key as typeof filterRole)} style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, backgroundColor: active ? '#6D28D9' : colors.paper, borderWidth: 1, borderColor: active ? '#6D28D9' : colors.line }}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: active ? '#fff' : colors.inkSoft }}>{label}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setCategoryPickerOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, backgroundColor: filterCategory ? '#6D28D9' : colors.paper, borderWidth: 1, borderColor: filterCategory ? '#6D28D9' : colors.line }}>
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: filterCategory ? '#fff' : colors.inkSoft }}>{filterCategory ?? 'Category'}</Text>
          <ChevronDown size={12} color={filterCategory ? '#fff' : colors.inkSoft} />
        </Pressable>
        <Pressable onPress={() => setEventPickerOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, backgroundColor: filterEvent ? '#6D28D9' : colors.paper, borderWidth: 1, borderColor: filterEvent ? '#6D28D9' : colors.line }}>
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: filterEvent ? '#fff' : colors.inkSoft }}>{filterEvent ?? 'Event'}</Text>
          <ChevronDown size={12} color={filterEvent ? '#fff' : colors.inkSoft} />
        </Pressable>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.lg, paddingBottom: 8 }}>
        {SORTS.map((s) => {
          const active = sortBy === s.key;
          return (
            <Pressable key={s.key} onPress={() => setSortBy(s.key)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: active ? colors.ivoryDeep : 'transparent' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.5, color: active ? colors.gold : colors.inkSoft, textTransform: 'uppercase' }}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : profiles === null ? (
        <LoadingState label="Loading your network…" />
      ) : showSections ? (
        <FlatList
          key="sections"
          data={sections}
          keyExtractor={(s) => s.key}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item: section }) => {
            const SectionIcon = SECTION_ICONS[section.icon];
            return (
              <View style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <SectionIcon size={15} color="#6D28D9" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{section.title}</Text>
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#6D28D9' }}>See all</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: spacing.lg }}>{section.profiles.map(renderCard)}</View>
              </View>
            );
          }}
        />
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1 }}>
          {header}
          <EmptyState title="No one found" message={tab === 'following' ? "You aren't following anyone yet." : 'Try a different search or filter.'} />
        </View>
      ) : (
        <FlatList
          key="grid"
          data={filtered}
          keyExtractor={(p) => p.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          columnWrapperStyle={{ gap: 9, paddingHorizontal: spacing.lg, marginBottom: 9 }}
          numColumns={2}
          renderItem={({ item }) => renderCard(item)}
        />
      )}

      <PickerModal visible={categoryPickerOpen} title="Category" options={[...NETWORK_CATEGORIES]} selected={filterCategory} onSelect={(v) => { setFilterCategory(v); setCategoryPickerOpen(false); }} onClose={() => setCategoryPickerOpen(false)} />
      <PickerModal visible={eventPickerOpen} title="Event" options={[...NETWORK_EVENTS]} selected={filterEvent} onSelect={(v) => { setFilterEvent(v); setEventPickerOpen(false); }} onClose={() => setEventPickerOpen(false)} />
    </SafeAreaView>
  );
}

function PickerModal({ visible, title, options, selected, onSelect, onClose }: { visible: boolean; title: string; options: string[]; selected: string | null; onSelect: (v: string | null) => void; onClose: () => void }) {
  const { colors, typeScale, spacing, radius } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,19,16,0.4)' }}>
        <View style={{ backgroundColor: colors.ivory, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
            <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.inkSoft} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: 6 }}>
            <Pressable onPress={() => onSelect(null)} style={{ paddingVertical: 10, borderRadius: radius.md, backgroundColor: !selected ? colors.ivoryDeep : 'transparent', paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '400', color: colors.ink }}>All</Text>
            </Pressable>
            {options.map((opt) => (
              <Pressable key={opt} onPress={() => onSelect(opt)} style={{ paddingVertical: 10, borderRadius: radius.md, backgroundColor: selected === opt ? colors.ivoryDeep : 'transparent', paddingHorizontal: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '400', color: colors.ink }}>{opt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
