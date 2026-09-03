import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Search, Eye, Star } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { discoverProjects, getNotifications, markNotificationRead, resolveMediaUrl } from '@fashub/api-client';
import { PROJECT_CATEGORIES, type DiscoverProject, type DiscoverSort } from '@fashub/types';
import { LoadingState } from '../../components/LoadingState';
import { VerifiedBadge, isVerified } from '../../components/VerifiedBadge';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';

const PAGE_SIZE = 20;
const SORTS: { key: DiscoverSort; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'popular', label: 'Popular' },
  { key: 'featured', label: 'Featured' },
];

/**
 * Web's public "Projects" browse/discovery feed (app/projects/page.tsx) —
 * ported at 1:1 data/behavior parity (search, category chips, sort,
 * infinite scroll); the curated Featured/Trending/Editors/Rising rails web
 * shows above the main grid are simplified into the single sort control
 * here, since the section split is a curation nuance more than a distinct
 * capability — flagging that as a deliberate simplification.
 */
export default function ProjectDiscoveryScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<DiscoverSort>('recent');
  const [projects, setProjects] = useState<DiscoverProject[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    (offset: number, append: boolean) => {
      if (!append) setError('');
      discoverProjects({ section: 'all', category: category ?? undefined, sort, search: query.trim() || undefined, limit: PAGE_SIZE, offset })
        .then((res) => {
          setProjects((prev) => (append ? [...(prev ?? []), ...res.projects] : res.projects));
          setTotal(res.total);
        })
        .catch(() => setError("Couldn't load projects. Check your connection and try again."));
    },
    [category, sort, query]
  );

  useEffect(() => {
    setProjects(null);
    load(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort]);

  // Clears the Project tab's "new activity" dot (app/(tabs)/_layout.tsx) —
  // web has no equivalent signal/clearing behavior to match (see Step 0),
  // so this defines a sensible rule: viewing this tab marks any unread
  // project-update (type: 'workflow') notifications as read, the same way
  // opening a conversation already marks that conversation's messages read.
  // No bulk "mark all of type X" endpoint exists on web, so each unread
  // workflow notification is marked individually — acceptable since this
  // fires only for a handful of items at a time.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getNotifications(user.id, { unreadOnly: true, limit: 50 })
        .then((res) => {
          const workflowIds = res.notifications.filter((n) => n.type === 'workflow').map((n) => n.id);
          for (const id of workflowIds) markNotificationRead(user.id, { notificationId: id }).catch(() => {});
        })
        .catch(() => {});
    }, [user])
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setProjects(null);
      load(0, false);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleRefresh = async () => {
    setRefreshing(true);
    load(0, false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (loadingMore || !projects || projects.length >= total) return;
    setLoadingMore(true);
    load(projects.length, true);
    setLoadingMore(false);
  };

  const header = useMemo(
    () => (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, marginHorizontal: spacing.lg, marginTop: spacing.sm }}>
          <Search size={16} color={colors.inkSoft} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search projects…"
            placeholderTextColor={colors.inkSoft}
            style={{ flex: 1, fontWeight: '400', fontSize: 13.5, color: colors.ink, padding: 0 }}
          />
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', ...PROJECT_CATEGORIES]}
          keyExtractor={(c) => c}
          contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
          renderItem={({ item }) => {
            const active = item === 'All' ? category === null : category === item;
            return (
              <Pressable
                onPress={() => setCategory(item === 'All' ? null : item)}
                style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: active ? colors.ink : colors.line, backgroundColor: active ? colors.ink : 'transparent' }}
              >
                <Text style={{ fontWeight: '600', fontSize: 11.5, color: active ? colors.ivory : colors.inkSoft }}>{item}</Text>
              </Pressable>
            );
          }}
        />
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSort(s.key)}
                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: active ? colors.ivoryDeep : 'transparent' }}
              >
                <Text style={{ fontWeight: '500', fontSize: 10.5, color: active ? colors.oxblood : colors.inkSoft, textTransform: 'uppercase' }}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    ),
    [query, category, sort, colors, spacing]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: 10 }}>
        <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Projects</Text>
      </View>

      {error ? (
        <ErrorState message={error} onRetry={() => load(0, false)} />
      ) : projects === null ? (
        <LoadingState label="Loading projects…" />
      ) : projects.length === 0 ? (
        <View style={{ flex: 1 }}>
          {header}
          <EmptyState title="No projects found" message="Try a different search or category." />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ gap: 12, paddingBottom: spacing.xl }}
          ListHeaderComponent={header}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.oxblood} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/project/${item.id}`)}
              style={({ pressed }) => [
                { flex: 1, backgroundColor: colors.paper, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <View style={{ aspectRatio: 1, backgroundColor: colors.ivoryDeep }}>
                {item.coverImage ? <Image source={{ uri: resolveMediaUrl(item.coverImage) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                {item.isFeatured ? (
                  <View style={{ position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(23,19,16,0.6)', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Star size={9} color={colors.goldSoft} fill={colors.goldSoft} />
                    <Text style={{ fontWeight: '600', fontSize: 8, color: colors.ivory }}>Featured</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ padding: 10, gap: 4 }}>
                <Text style={{ fontWeight: '600', fontSize: 12.5, color: colors.ink }} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.creator ? (
                  <Pressable
                    onPress={() => router.push(`/profile/${item.creator!.userId}`)}
                    hitSlop={4}
                    style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 5 }, pressed ? { opacity: 0.7 } : null]}
                  >
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.inkSoft, overflow: 'hidden' }}>
                      {item.creator.avatar ? <Image source={{ uri: resolveMediaUrl(item.creator.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                    </View>
                    <Text style={{ fontWeight: '400', fontSize: 10, color: colors.inkSoft, flexShrink: 1 }} numberOfLines={1}>
                      {item.creator.displayName}
                    </Text>
                    {isVerified({ subscriptionTier: item.creator.subscriptionTier, verified: item.creator.isVerified }) ? <VerifiedBadge size="sm" /> : null}
                  </Pressable>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Eye size={10} color={colors.inkSoft} />
                  <Text style={{ fontWeight: '500', fontSize: 9.5, color: colors.inkSoft }}>{item.viewCount}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
