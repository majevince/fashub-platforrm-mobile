import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { violetColors as V } from '@fashub/design-tokens';
import { useAuth } from '../../context/AuthContext';
import { getFeed, getStories, getSuggestedCreators, getTrending, ApiError } from '@fashub/api-client';
import type { FeedPost, FeedFilter, StoryGroup, SuggestedCreator, TrendingTag } from '@fashub/types';
import { FeedAppBar } from '../../components/feed/FeedAppBar';
import { StoriesRail } from '../../components/feed/StoriesRail';
import { Composer } from '../../components/feed/Composer';
import { FeedTabs } from '../../components/feed/FeedTabs';
import { PostCard } from '../../components/feed/PostCard';
import { SuggestedProsCard } from '../../components/feed/SuggestedProsCard';
import { TrendingRail } from '../../components/feed/TrendingRail';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { CreatePostModal } from '../../components/feed/CreatePostModal';
import { CreateStoryModal } from '../../components/feed/CreateStoryModal';
import { StoryViewer } from '../../components/feed/StoryViewer';

const PAGE_SIZE = 20;

export default function FeedScreen() {
  const { user } = useAuth();

  const [filter, setFilter] = useState<FeedFilter>('all');
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [postsError, setPostsError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [suggestions, setSuggestions] = useState<{ items: SuggestedCreator[]; total: number }>({ items: [], total: 0 });
  const [trending, setTrending] = useState<TrendingTag[]>([]);

  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [createStoryVisible, setCreateStoryVisible] = useState(false);
  const [viewerGroup, setViewerGroup] = useState<StoryGroup | null>(null);

  const loadPosts = useCallback(
    async (f: FeedFilter) => {
      if (!user) return;
      setPostsError('');
      setPosts(null);
      try {
        const res = await getFeed(user.id, { filter: f, limit: PAGE_SIZE });
        setPosts(res.posts);
        setNextCursor(res.nextCursor);
      } catch (err) {
        setPostsError(err instanceof ApiError ? err.message : "Couldn't load your feed. Check your connection and try again.");
      }
    },
    [user]
  );

  const loadStories = useCallback(() => {
    if (!user) return;
    getStories()
      .then((res) => setStories(res.groups))
      .catch(() => setStories([]));
  }, [user]);

  // Secondary rails degrade quietly on failure — a stories/suggestions/trending
  // hiccup shouldn't block the whole screen behind a full-page error.
  const loadRails = useCallback(() => {
    if (!user) return;
    loadStories();
    getSuggestedCreators(user.id, { limit: 8 })
      .then((res) => setSuggestions({ items: res.recommendations, total: res.total }))
      .catch(() => setSuggestions({ items: [], total: 0 }));
    getTrending({ limit: 6 })
      .then((res) => setTrending(res.data))
      .catch(() => setTrending([]));
  }, [user, loadStories]);

  // Fires as soon as this screen mounts, which happens the instant
  // Stack.Protected swaps to (tabs) after a successful login — no manual
  // refresh needed. Logging out and back in as someone else fully
  // unmounts/remounts (tabs) (see app/_layout.tsx), so this state can't
  // carry stale data between sessions.
  useEffect(() => {
    loadPosts(filter);
    loadRails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleFilterChange = (f: FeedFilter) => {
    setFilter(f);
    loadPosts(f);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadPosts(filter), Promise.resolve(loadRails())]);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!user || !nextCursor || loadingMore || !posts) return;
    setLoadingMore(true);
    try {
      const res = await getFeed(user.id, { filter, cursor: nextCursor, limit: PAGE_SIZE });
      setPosts((prev) => [...(prev ?? []), ...res.posts]);
      setNextCursor(res.nextCursor);
    } catch {
      // Pagination failures stay silent — the list the user already has keeps working; they can pull-to-refresh to retry.
    } finally {
      setLoadingMore(false);
    }
  };

  // Updates the ring/seen state immediately from the view call's own success,
  // rather than waiting on a full stories refetch just to reflect it.
  const handleStoryViewed = (storyId: string) => {
    setStories((prev) =>
      prev.map((g) => {
        if (!g.stories.some((s) => s.id === storyId)) return g;
        const updatedStories = g.stories.map((s) => (s.id === storyId ? { ...s, seen: true } : s));
        return { ...g, stories: updatedStories, hasUnseen: updatedStories.some((s) => !s.seen) };
      })
    );
  };

  if (!user) return null;

  const header = (
    <View>
      <StoriesRail
        groups={stories}
        currentUserId={user.id}
        currentUserAvatar={user.avatar}
        currentUserName={user.displayName}
        onPressAdd={() => setCreateStoryVisible(true)}
        onPressGroup={(group) => setViewerGroup(group)}
      />
      <Composer onPress={() => setCreatePostVisible(true)} />
      <FeedTabs active={filter} onChange={handleFilterChange} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: V.canvas }} edges={['top']}>
      <FeedAppBar onRefresh={handleRefresh} />

      {postsError ? (
        <ErrorState message={postsError} onRetry={() => loadPosts(filter)} tint={{ accent: V.primary, text: V.ink }} />
      ) : posts === null ? (
        <LoadingState label="Loading your feed…" tint={{ accent: V.primary, text: V.inkSoft }} />
      ) : posts.length === 0 ? (
        <View style={{ flex: 1 }}>
          {header}
          <EmptyState
            title="Your feed is quiet right now"
            message={
              filter === 'following'
                ? "You haven't followed anyone yet — follow a designer or tailor to see their work here."
                : 'Follow a few designers and tailors, or check back once the community starts posting.'
            }
            tint={{ text: V.ink, textSoft: V.inkSoft }}
          />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item, index }) => (
            <>
              <PostCard
                post={item}
                onReposted={(newPost) => setPosts((prev) => (prev ? [newPost, ...prev] : [newPost]))}
              />
              {index === 0 ? <SuggestedProsCard creators={suggestions.items} total={suggestions.total} /> : null}
            </>
          )}
          ListHeaderComponent={header}
          ListFooterComponent={<TrendingRail tags={trending} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={V.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CreatePostModal
        visible={createPostVisible}
        onClose={() => setCreatePostVisible(false)}
        onCreated={() => loadPosts(filter)}
      />
      <CreateStoryModal
        visible={createStoryVisible}
        onClose={() => setCreateStoryVisible(false)}
        onCreated={loadStories}
      />
      {viewerGroup ? (
        <StoryViewer
          group={viewerGroup}
          currentUserId={user.id}
          onClose={() => setViewerGroup(null)}
          onViewed={handleStoryViewed}
          onDeleted={loadStories}
        />
      ) : null}
    </SafeAreaView>
  );
}
