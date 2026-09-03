import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, SectionList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SquarePen, Search } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { useAuth } from '../../../context/AuthContext';
import { getConversations } from '@fashub/api-client';
import type { Conversation } from '@fashub/types';
import { ConversationRow } from '../../../components/messages/ConversationRow';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { EmptyState } from '../../../components/EmptyState';
import { useOnlineHeartbeat } from '../../../hooks/useOnlineHeartbeat';
import { getDayBucket, getInquiryPreviewType } from '../../../lib/chatFormat';

const INBOX_POLL_MS = 15000;
const DAY_ORDER = ['Today', 'Yesterday', 'This week', 'Earlier'] as const;

type FilterTab = 'all' | 'inquiries' | 'messages';

export default function MessagesInboxScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');

  useOnlineHeartbeat(user?.id);

  const load = useCallback(() => {
    if (!user) return;
    getConversations(user.id)
      .then((res) => {
        setConversations(res);
        setError('');
      })
      .catch(() => setError("Couldn't load your messages. Check your connection and try again."));
  }, [user]);

  useEffect(() => {
    load();
    const id = setInterval(load, INBOX_POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (!conversations || !user) return [];
    let list = conversations;
    if (tab === 'inquiries') {
      list = list.filter((c) => getInquiryPreviewType(c.lastMessage));
    } else if (tab === 'messages') {
      list = list.filter((c) => !getInquiryPreviewType(c.lastMessage));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((c) => {
        const other = c.participants.find((p) => p.userId !== user.id);
        return other && (other.userName.toLowerCase().includes(q) || other.userRole.toLowerCase().includes(q));
      });
    }
    return list;
  }, [conversations, tab, query, user]);

  const sections = useMemo(() => {
    if (query.trim()) return [{ title: '', data: filtered }];
    const buckets = new Map<string, Conversation[]>();
    for (const c of filtered) {
      const b = getDayBucket(c.updatedAt);
      if (!buckets.has(b)) buckets.set(b, []);
      buckets.get(b)!.push(c);
    }
    return DAY_ORDER.filter((b) => buckets.has(b)).map((b) => ({ title: b, data: buckets.get(b)! }));
  }, [filtered, query]);

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: V.surface }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: V.line }}>
        <Text style={{ fontWeight: '900', fontSize: 20, color: V.ink }}>Messages</Text>
        {/* Web's "new message" compose flow needs a user-picker screen that
            doesn't exist anywhere in this app yet — out of scope for this
            ticket, so this icon is present (visual parity) but inert. */}
        <SquarePen size={19} color={V.primary} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: V.canvas, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
          <Search size={14} color={V.inkFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search conversations"
            placeholderTextColor={V.inkFaint}
            style={{ flex: 1, fontWeight: '400', fontSize: 12, color: V.ink, padding: 0 }}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: V.line }}>
        {(['all', 'inquiries', 'messages'] as FilterTab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ paddingVertical: 8, paddingBottom: 9, borderBottomWidth: 2, borderBottomColor: tab === t ? V.primary : 'transparent' }}>
            <Text style={{ fontWeight: tab === t ? '600' : '400', fontSize: 11.5, color: tab === t ? V.ink : V.inkFaint, textTransform: 'capitalize' }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <ErrorState message={error} onRetry={load} tint={{ accent: V.primary, text: V.ink }} />
      ) : conversations === null ? (
        <LoadingState tint={{ accent: V.primary, text: V.inkSoft }} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No matches' : 'No messages yet'}
          message={query ? 'Try a different search.' : 'When someone messages you, it will show up here.'}
          tint={{ text: V.ink, textSoft: V.inkFaint }}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(c) => c.id}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, backgroundColor: V.surface }}>
                <Text style={{ fontWeight: '600', fontSize: 10, letterSpacing: 0.5, color: V.inkFaint, textTransform: 'uppercase' }}>{section.title}</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => <ConversationRow conversation={item} currentUserId={user.id} onPress={() => router.push(`/messages/${item.id}`)} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={V.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
