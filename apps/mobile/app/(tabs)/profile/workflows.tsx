import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronLeft, Search } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useAuth } from '../../../context/AuthContext';
import { getWorkflows, resolveMediaUrl } from '@fashub/api-client';
import type { Workflow, WorkflowStatus } from '@fashub/types';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { EmptyState } from '../../../components/EmptyState';

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';
const ACTIVE_STATUSES: WorkflowStatus[] = ['agreement', 'requirements', 'in_progress', 'review', 'finalization', 'delivered'];

export default function WorkflowsListScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    if (!user) return;
    getWorkflows(user.id)
      .then((res) => {
        setWorkflows(res.workflows);
        setError('');
      })
      .catch(() => setError("Couldn't load workflows."));
  }, [user]);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    if (!workflows) return [];
    let list = workflows;
    if (tab === 'active') list = list.filter((w) => ACTIVE_STATUSES.includes(w.status));
    else if (tab === 'completed') list = list.filter((w) => w.status === 'completed');
    else if (tab === 'cancelled') list = list.filter((w) => w.status === 'cancelled');
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((w) => w.title.toLowerCase().includes(q) || (w.category ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [workflows, tab, query]);

  const kpis = useMemo(() => {
    if (!workflows) return { active: 0, completed: 0, awaiting: 0, value: 0 };
    return {
      active: workflows.filter((w) => ACTIVE_STATUSES.includes(w.status)).length,
      completed: workflows.filter((w) => w.status === 'completed').length,
      awaiting: workflows.filter((w) => w.status === 'delivered').length,
      value: workflows.filter((w) => w.status !== 'cancelled').reduce((sum, w) => sum + (w.agreedPrice ?? 0), 0),
    };
  }, [workflows]);

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Workflows</Text>
      </View>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : workflows === null ? (
        <LoadingState />
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
            {[
              ['Active', kpis.active],
              ['Completed', kpis.completed],
              ['Awaiting', kpis.awaiting],
              ['Value', `$${kpis.value.toLocaleString()}`],
            ].map(([label, value]) => (
              <View key={label as string} style={{ flex: 1, minWidth: '45%', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 10 }}>
                <Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink }}>{value}</Text>
                <Text style={{ fontWeight: '500', fontSize: 9, color: colors.inkSoft, textTransform: 'uppercase' }}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: spacing.lg, marginBottom: spacing.sm }}>
            <Search size={14} color={colors.inkSoft} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Search workflows…" placeholderTextColor={colors.inkSoft} style={{ flex: 1, fontWeight: '400', fontSize: 12.5, color: colors.ink, padding: 0 }} />
          </View>

          <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
            {(['all', 'active', 'completed', 'cancelled'] as FilterTab[]).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: tab === t ? colors.ink : 'transparent', borderWidth: 1, borderColor: tab === t ? colors.ink : colors.line }}>
                <Text style={{ fontWeight: '600', fontSize: 11, color: tab === t ? colors.ivory : colors.inkSoft, textTransform: 'capitalize' }}>{t}</Text>
              </Pressable>
            ))}
          </View>

          {filtered.length === 0 ? (
            <EmptyState title="No workflows" message="Projects you start or agree to will show up here." />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(w) => w.id}
              contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: 10 }}
              renderItem={({ item }) => {
                const other = item.creatorId === user.id ? item.client : item.creator;
                return (
                  <Pressable onPress={() => router.push(`/profile/workflow/${item.id}`)} style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: colors.ivoryDeep, overflow: 'hidden' }}>
                        {item.coverImage ? <Image source={{ uri: resolveMediaUrl(item.coverImage) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontWeight: '600', fontSize: 13, color: colors.ink }} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={{ fontWeight: '400', fontSize: 11, color: colors.inkSoft }} numberOfLines={1}>
                          {other?.displayName ?? 'Unknown'} · {item.category ?? 'General'}
                        </Text>
                        {item.agreedPrice != null ? (
                          <Text style={{ fontWeight: '600', fontSize: 10.5, color: colors.gold, marginTop: 2 }}>${item.agreedPrice.toLocaleString()}</Text>
                        ) : null}
                      </View>
                      <View style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
                        <Text style={{ fontWeight: '600', fontSize: 8.5, color: colors.oxblood, textTransform: 'uppercase' }}>{item.status.replace('_', ' ')}</Text>
                      </View>
                    </View>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' }}>
                      <View style={{ width: `${item.totalStages > 0 ? (item.completedStages / item.totalStages) * 100 : 0}%`, height: '100%', backgroundColor: colors.gold }} />
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}
