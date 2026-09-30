import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Rss, X } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { usePage } from '../../../../hooks/usePage';
import {
  resolveMediaUrl,
  getPageFollowing,
  addPageFollowing,
  removePageFollowing,
} from '@fashub/api-client';
import { hasPagePermission, type PageFollowedPageSummary } from '@fashub/types';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/ErrorState';
import { PageVerifiedBadge } from '../../../../components/PageVerifiedBadge';

/**
 * Settings > Manage following — mobile. Pages this Page follows
 * (PageFollowsPage), distinct from a user following a Page. Mirrors web's
 * app/page/[handle]/manage/following and manage.tsx's dark-ink-header +
 * paper-card visual language.
 */
export default function ManageFollowingScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { colors, spacing, typeScale } = useTheme();
  const router = useRouter();

  const { page, viewer, loading, error, reload } = usePage(handle);

  const [following, setFollowing] = useState<PageFollowedPageSummary[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const canManage = viewer ? hasPagePermission(viewer.role, 'canManageFollowing') : false;

  useEffect(() => {
    if (!page || !canManage) return;
    getPageFollowing(page.handle)
      .then((res) => setFollowing(res.following))
      .catch((err) => setListError(err instanceof Error ? err.message : 'Failed to load following'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.handle, canManage]);

  const addFollowing = () => {
    const target = handleInput.trim();
    if (!page || !target) return;
    setAdding(true);
    addPageFollowing(page.handle, target)
      .then((res) => {
        setFollowing((prev) => (prev ? [res.following, ...prev] : [res.following]));
        setHandleInput('');
      })
      .catch((err) => Alert.alert('Could not follow', err instanceof Error ? err.message : 'Something went wrong'))
      .finally(() => setAdding(false));
  };

  const unfollow = (f: PageFollowedPageSummary) => {
    if (!page) return;
    Alert.alert(`Unfollow ${f.page.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unfollow',
        style: 'destructive',
        onPress: () => {
          setRemovingId(f.id);
          removePageFollowing(page.handle, f.id)
            .then(() => setFollowing((prev) => (prev ? prev.filter((x) => x.id !== f.id) : prev)))
            .catch((err) => Alert.alert('Could not unfollow', err instanceof Error ? err.message : 'Something went wrong'))
            .finally(() => setRemovingId(null));
        },
      },
    ]);
  };

  if (loading && !page) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <LoadingState label="Loading…" />
      </SafeAreaView>
    );
  }

  if (error || !page || !viewer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message={error ?? 'Page not found'} onRetry={reload} />
      </SafeAreaView>
    );
  }

  if (!canManage) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message="You don't have permission to manage following for this Page." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color="#fff" />
        </Pressable>
        <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: '#fff' }} numberOfLines={1}>Manage following</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 }}>Pages this Page follows.</Text>

        <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 12, flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={handleInput}
            onChangeText={setHandleInput}
            placeholder="Enter a Page handle, e.g. atelier_house"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={addFollowing}
            style={{ flex: 1, fontSize: 13.5, color: colors.ink, backgroundColor: colors.ivoryDeep, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}
          />
          <Pressable
            onPress={addFollowing}
            disabled={adding || !handleInput.trim()}
            style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', opacity: adding || !handleInput.trim() ? 0.6 : 1 }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#fff' }}>{adding ? 'Following…' : 'Follow'}</Text>
          </Pressable>
        </View>

        {listError ? <Text style={{ fontSize: 12.5, color: colors.oxblood }}>{listError}</Text> : null}

        <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line }}>
          {following === null ? (
            <ActivityIndicator color={colors.gold} style={{ paddingVertical: 24 }} />
          ) : following.length === 0 ? (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 16 }}>
              <Rss size={22} color={colors.inkSoft} />
              <Text style={{ fontSize: 13, color: colors.inkSoft }}>Not following any Pages yet.</Text>
            </View>
          ) : (
            following.map((f, i) => {
              const uri = resolveMediaUrl(f.page.avatar ?? undefined);
              return (
                <Pressable
                  key={f.id}
                  onPress={() => router.push(`/page/${f.page.handle}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.line }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : (
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.gold }}>{f.page.name.slice(0, 2).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{f.page.name}</Text>
                      {f.page.verified ? <PageVerifiedBadge size="sm" /> : null}
                    </View>
                    <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 1 }} numberOfLines={1}>@{f.page.handle}</Text>
                  </View>
                  <Pressable onPress={() => unfollow(f)} disabled={removingId === f.id} hitSlop={8} style={{ padding: 6, opacity: removingId === f.id ? 0.5 : 1 }}>
                    <X size={16} color={colors.inkSoft} />
                  </Pressable>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
