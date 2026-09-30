import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Search, ShieldOff, X } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { usePage } from '../../../../hooks/usePage';
import {
  resolveMediaUrl,
  getPageRestrictions,
  searchRestrictionCandidates,
  addPageRestriction,
  removePageRestriction,
} from '@fashub/api-client';
import { hasPagePermission, type PageRestrictedMember, type PageFollowerSearchResult } from '@fashub/types';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/ErrorState';

function dateFmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Settings > Restricted members — mobile. Search is scoped to this Page's
 * real followers, same as web's app/page/[handle]/manage/restricted (see
 * that route's comment for why); mirrors manage.tsx's dark-ink-header +
 * paper-card visual language.
 */
export default function RestrictedMembersScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { colors, spacing, typeScale } = useTheme();
  const router = useRouter();

  const { page, viewer, loading, error, reload } = usePage(handle);

  const [restrictions, setRestrictions] = useState<PageRestrictedMember[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<PageFollowerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [restrictingId, setRestrictingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const canManage = viewer ? hasPagePermission(viewer.role, 'canManageRestrictions') : false;

  useEffect(() => {
    if (!page || !canManage) return;
    getPageRestrictions(page.handle)
      .then((res) => setRestrictions(res.restrictions))
      .catch((err) => setListError(err instanceof Error ? err.message : 'Failed to load restricted members'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.handle, canManage]);

  // Fires once with an empty query too, same as Manage admins' own search
  // (apps/mobile/app/page/[handle]/manage/admins.tsx) — skipping the empty-
  // query fetch here meant a Page's real, eligible followers never showed
  // until the admin typed something, which looked like "no real data"
  // rather than the honest "nothing typed yet" it actually was.
  useEffect(() => {
    if (!page || !canManage) return;
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      searchRestrictionCandidates(page.handle, query.trim())
        .then((res) => { if (!cancelled) setCandidates(res.followers); })
        .catch(() => { if (!cancelled) setCandidates([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page?.handle, canManage]);

  const restrict = (candidate: PageFollowerSearchResult) => {
    if (!page) return;
    setRestrictingId(candidate.id);
    addPageRestriction(page.handle, candidate.id)
      .then((res) => {
        setRestrictions((prev) => (prev ? [res.restriction, ...prev] : [res.restriction]));
        setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
        setQuery('');
      })
      .catch((err) => Alert.alert('Could not restrict', err instanceof Error ? err.message : 'Something went wrong'))
      .finally(() => setRestrictingId(null));
  };

  const unrestrict = (restriction: PageRestrictedMember) => {
    if (!page) return;
    Alert.alert(
      `Remove restriction on ${restriction.user.displayName}?`,
      'They will be able to follow and engage with this Page again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setRemovingId(restriction.id);
            removePageRestriction(page.handle, restriction.id)
              .then(() => setRestrictions((prev) => (prev ? prev.filter((r) => r.id !== restriction.id) : prev)))
              .catch((err) => Alert.alert('Could not remove', err instanceof Error ? err.message : 'Something went wrong'))
              .finally(() => setRemovingId(null));
          },
        },
      ]
    );
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
        <ErrorState message="You don't have permission to manage restricted members for this Page." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color="#fff" />
        </Pressable>
        <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: '#fff' }} numberOfLines={1}>Restricted members</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 }}>
          Restricted people can&apos;t follow or engage with this Page. Restricting someone also removes their existing follow.
        </Text>

        <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.ivoryDeep, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Search size={15} color={colors.inkSoft} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search this Page's followers to restrict…"
              placeholderTextColor={colors.inkSoft}
              style={{ flex: 1, fontSize: 13.5, color: colors.ink, padding: 0 }}
            />
          </View>
          <View style={{ marginTop: 8 }}>
              {searching && candidates.length === 0 ? <ActivityIndicator color={colors.gold} style={{ paddingVertical: 10 }} /> : null}
              {!searching && candidates.length === 0 ? (
                <Text style={{ fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', paddingVertical: 10 }}>
                  {query.trim() ? 'No matching followers found.' : 'No followers available to restrict yet — only people who already follow this Page can be restricted.'}
                </Text>
              ) : null}
              {candidates.map((c) => {
                const uri = resolveMediaUrl(c.avatar ?? undefined);
                return (
                  <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : (
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.gold }}>{c.displayName.slice(0, 2).toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{c.displayName}</Text>
                      {c.headline ? <Text style={{ fontSize: 11.5, color: colors.inkSoft }} numberOfLines={1}>{c.headline}</Text> : null}
                    </View>
                    <Pressable
                      onPress={() => restrict(c)}
                      disabled={restrictingId === c.id}
                      style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, opacity: restrictingId === c.id ? 0.6 : 1 }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.goldDim }}>
                        {restrictingId === c.id ? 'Restricting…' : 'Restrict'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
          </View>
        </View>

        {listError ? <Text style={{ fontSize: 12.5, color: colors.oxblood }}>{listError}</Text> : null}

        <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line }}>
          {restrictions === null ? (
            <ActivityIndicator color={colors.gold} style={{ paddingVertical: 24 }} />
          ) : restrictions.length === 0 ? (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 16 }}>
              <ShieldOff size={22} color={colors.inkSoft} />
              <Text style={{ fontSize: 13, color: colors.inkSoft }}>No restricted members.</Text>
            </View>
          ) : (
            restrictions.map((r, i) => {
              const uri = resolveMediaUrl(r.user.avatar ?? undefined);
              return (
                <View
                  key={r.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.line }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : (
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.gold }}>{r.user.displayName.slice(0, 2).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{r.user.displayName}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 1 }} numberOfLines={1}>
                      Restricted by {r.restrictedBy.displayName} on {dateFmt(r.createdAt)}
                    </Text>
                  </View>
                  <Pressable onPress={() => unrestrict(r)} disabled={removingId === r.id} hitSlop={8} style={{ padding: 6, opacity: removingId === r.id ? 0.5 : 1 }}>
                    <X size={16} color={colors.inkSoft} />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
