import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { X, Search } from 'lucide-react-native';
import { violetColors as V, fontFamilies } from '@fashub/design-tokens';
import {
  searchUsersForMessaging,
  findOrCreateConversation,
  resolveMediaUrl,
  ApiError,
  type MessagingUserSearchResult,
} from '@fashub/api-client';
import { VerifiedBadge } from '../VerifiedBadge';

/**
 * Mobile parity for web's components/chat/NewMessageModal.tsx — same two
 * endpoints (GET /api/users/search, POST /api/conversations/user/[userId])
 * via @fashub/api-client, same single-tap-to-start UX (no multi-select),
 * same inline-render of a blocked response rather than a generic failure.
 * Styled with this screen family's violetColors (V), matching
 * messages/index.tsx and ConversationRow rather than the theme() tokens
 * ProjectShareModal uses — each screen family here keeps its own established
 * palette rather than a single app-wide convention.
 */
export function NewMessageModal({
  visible,
  onClose,
  currentUserId,
  onConversationStarted,
}: {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  onConversationStarted: (conversationId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MessagingUserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) return;
    setQuery('');
    setResults([]);
    setBlockedMessage(null);
  }, [visible]);

  useEffect(() => {
    if (!visible || !query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      searchUsersForMessaging(query.trim(), 0, 20)
        .then((res) => setResults(res.users))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [visible, query]);

  const handleSelect = async (result: MessagingUserSearchResult) => {
    setStartingId(result.id);
    setBlockedMessage(null);
    try {
      const { conversation } = await findOrCreateConversation(currentUserId, result.id);
      onConversationStarted(conversation.id);
    } catch (err) {
      setBlockedMessage(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setStartingId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,17,15,0.5)' }}>
        <View style={{ backgroundColor: V.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 10 }}>
            <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 16, color: V.ink }}>New message</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={V.inkFaint} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: V.canvas, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Search size={15} color={V.inkFaint} />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Search people…"
                placeholderTextColor={V.inkFaint}
                style={{ flex: 1, fontFamily: fontFamilies.sans, fontSize: 13, color: V.ink, padding: 0 }}
              />
            </View>
          </View>

          {blockedMessage ? (
            <View style={{ marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: '#FEF2F2' }}>
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 12, color: '#B91C1C' }}>{blockedMessage}</Text>
            </View>
          ) : null}

          <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            {loading ? (
              <ActivityIndicator color={V.primary} style={{ marginTop: 24 }} />
            ) : !query.trim() ? (
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 12.5, color: V.inkFaint, textAlign: 'center', paddingVertical: 28 }}>
                Search for someone to message
              </Text>
            ) : results.length === 0 ? (
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 12.5, color: V.inkFaint, textAlign: 'center', paddingVertical: 28 }}>
                No one found
              </Text>
            ) : (
              results.map((r) => {
                const avatarUri = resolveMediaUrl(r.avatar);
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => handleSelect(r)}
                    disabled={startingId === r.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, opacity: startingId === r.id ? 0.5 : 1 }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: V.primarySoft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                      {avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      ) : (
                        <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 13, color: V.primary }}>{r.displayName.slice(0, 2).toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontFamily: fontFamilies.sansSemiBold, fontSize: 13, color: V.ink, flexShrink: 1 }} numberOfLines={1}>
                          {r.displayName}
                        </Text>
                        {r.isVerified ? <VerifiedBadge size="sm" /> : null}
                      </View>
                      <Text style={{ fontFamily: fontFamilies.sans, fontSize: 11, color: V.inkFaint }} numberOfLines={1}>
                        {(r.title || r.role) + (r.isConnection ? ' · Connection' : '')}
                      </Text>
                    </View>
                    {startingId === r.id ? <ActivityIndicator color={V.primary} size="small" /> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
