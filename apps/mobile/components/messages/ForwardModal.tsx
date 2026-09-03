import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { X, Search, Check, Send } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { getConversations, forwardMessage } from '@fashub/api-client';
import type { Conversation, ChatMessage } from '@fashub/types';
import { AvatarPresence } from './AvatarPresence';

type Props = {
  visible: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  currentUserId: string;
  onForwarded: (successCount: number) => void;
};

/** 1:1 port of web's components/chat/ForwardModal.tsx — multi-select recipients + optional comment, client-orchestrated (see api-client's forwardMessage). */
export function ForwardModal({ visible, onClose, message, currentUserId, onForwarded }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setSelected(new Set());
    setComment('');
    setQuery('');
    getConversations(currentUserId)
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [visible, currentUserId]);

  const filtered = conversations.filter((c) => {
    const other = c.participants.find((p) => p.userId !== currentUserId);
    if (!other) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return other.userName.toLowerCase().includes(q) || other.userRole.toLowerCase().includes(q);
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleForward = async () => {
    if (!message || selected.size === 0 || sending) return;
    setSending(true);
    try {
      const result = await forwardMessage(
        {
          content: message.content,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          fileMimeType: message.fileMimeType,
          senderId: message.senderId,
          senderName: message.senderName,
          attachmentType: message.attachmentType,
          attachmentData: message.attachmentData,
        },
        Array.from(selected),
        currentUserId,
        comment
      );
      onForwarded(result.success);
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11,11,12,0.5)' }}>
        <View style={{ backgroundColor: V.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '78%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 }}>
            <View>
              <Text style={{ fontWeight: '700', fontSize: 17, color: V.ink }}>Forward message</Text>
              <Text style={{ fontWeight: '400', fontSize: 11, color: V.inkFaint, marginTop: 2 }}>
                {selected.size > 0 ? `${selected.size} recipient${selected.size > 1 ? 's' : ''} selected` : 'Select recipients'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={V.inkSoft} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Add a comment (optional)…"
              placeholderTextColor={V.inkFaint}
              style={{ backgroundColor: V.canvas, borderWidth: 1, borderColor: V.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontWeight: '400', fontSize: 12.5, color: V.ink }}
            />
          </View>

          <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: V.canvas, borderWidth: 1, borderColor: V.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }}>
              <Search size={15} color={V.inkFaint} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search contacts…"
                placeholderTextColor={V.inkFaint}
                style={{ flex: 1, fontWeight: '400', fontSize: 12.5, color: V.ink, padding: 0 }}
              />
            </View>
          </View>

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={V.primary} />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.id}
              style={{ flex: 1, borderTopWidth: 1, borderTopColor: V.line }}
              ListEmptyComponent={
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '400', fontSize: 12.5, color: V.inkFaint }}>{query ? 'No contacts match your search' : 'No contacts available'}</Text>
                </View>
              }
              renderItem={({ item }) => {
                const other = item.participants.find((p) => p.userId !== currentUserId);
                if (!other) return null;
                const isSelected = selected.has(item.id);
                return (
                  <Pressable onPress={() => toggle(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 11, backgroundColor: isSelected ? V.primarySoft : 'transparent' }}>
                    <AvatarPresence uri={other.userAvatar} name={other.userName} size="sm" subscriptionTier={other.subscriptionTier} onlineStatus={null} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontWeight: '600', fontSize: 13, color: V.ink }} numberOfLines={1}>
                        {other.userName}
                      </Text>
                      <Text style={{ fontWeight: '400', fontSize: 10.5, color: V.inkFaint, textTransform: 'capitalize' }}>{other.userRole}</Text>
                    </View>
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: isSelected ? V.primary : V.line, backgroundColor: isSelected ? V.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected ? <Check size={12} color="#fff" /> : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}

          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: V.line }}>
            <Pressable onPress={onClose} style={{ flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: V.line, alignItems: 'center' }}>
              <Text style={{ fontWeight: '600', fontSize: 13, color: V.inkSoft }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleForward}
              disabled={selected.size === 0 || sending}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, backgroundColor: V.primary, opacity: selected.size === 0 || sending ? 0.5 : 1 }}
            >
              <Send size={14} color="#fff" />
              <Text style={{ fontWeight: '600', fontSize: 13, color: '#fff' }}>{sending ? 'Forwarding…' : `Forward${selected.size > 1 ? ` (${selected.size})` : ''}`}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
