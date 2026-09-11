import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator, Share } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { X, Repeat2, Send, Link2, Bookmark, Share2, Globe, Check } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamilies } from '@fashub/design-tokens';
import {
  getConversations,
  findOrCreateConversation,
  sendMessage,
  resolveMediaUrl,
  API_BASE_URL,
} from '@fashub/api-client';
import type { ConversationParticipant } from '@fashub/types';

export type ShareablePost = {
  id: string;
  title: string;
  authorName: string;
  images: string[];
  price?: number | null;
  priceRange?: string | null;
  category?: string;
  materials?: string[];
  colors?: string[];
  sizes?: string[];
};

/**
 * Redesigned to match the approved bottom-sheet mock
 * (fashub_share_post_modal_redesign.html) — icon-tile quick actions, a
 * "Send to" recent-contacts row, a Share via… button, and a link row,
 * replacing the previous tab-based (Share/Send to User) layout. UI only:
 * every action still calls the exact same underlying mechanism as before
 * (Clipboard, native Share.share, findOrCreateConversation+sendMessage).
 *
 * Repost and Save are dispatched back to the caller (PostCard) rather than
 * reimplemented here, since PostCard already owns the real, working
 * repost-target resolution (repost-of-repost redirection) and optimistic
 * save state — this sheet is presentation only, not a second copy of that
 * logic.
 *
 * "Send to" recent contacts has no web equivalent to match (web's share
 * modal is a searchable all-users list, not a contacts row) — this uses
 * mobile's own real getConversations() data, taking the other participant
 * of each of the user's most-recently-active conversations. Tapping a
 * contact sends the post directly (no composer step), matching the mock's
 * single-tap avatar row.
 */
export function PostShareModal({
  visible,
  onClose,
  post,
  currentUserId,
  onOpenRepost,
  saved,
  onToggleSave,
}: {
  visible: boolean;
  onClose: () => void;
  post: ShareablePost;
  currentUserId: string;
  onOpenRepost: () => void;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const { colors: C, spacing, radius } = useTheme();
  const [copied, setCopied] = useState(false);
  const [contacts, setContacts] = useState<ConversationParticipant[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const shareUrl = `${API_BASE_URL}/posts/${post.id}`;

  useEffect(() => {
    if (!visible) {
      setCopied(false);
      setSentTo(new Set());
      return;
    }
    setContactsLoading(true);
    getConversations(currentUserId)
      .then((convs) => {
        const others = convs
          .map((c) => c.participants.find((p) => p.userId !== currentUserId))
          .filter((p): p is ConversationParticipant => !!p)
          .slice(0, 12);
        setContacts(others);
      })
      .catch(() => setContacts([]))
      .finally(() => setContactsLoading(false));
  }, [visible, currentUserId]);

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({ message: `${post.title} — ${post.authorName} on FaSHub\n${shareUrl}`, url: shareUrl });
    } catch {
      // Cancelling or the share sheet failing isn't an error worth surfacing.
    }
  };

  const handleSendToContact = async (recipientId: string) => {
    if (sendingTo || sentTo.has(recipientId)) return;
    setSendingTo(recipientId);
    try {
      const { conversation } = await findOrCreateConversation(currentUserId, recipientId);
      await sendMessage(conversation.id, {
        senderId: currentUserId,
        recipientId,
        content: `Check out this post: "${post.title}" by ${post.authorName}`,
        attachedPostId: post.id,
        attachmentType: 'post',
        attachmentData: {
          id: post.id,
          title: post.title,
          images: post.images,
          basePrice: post.price ?? null,
          category: post.category ?? null,
          authorName: post.authorName,
          fabrics: post.materials ?? [],
          colors: post.colors ?? [],
          sizes: post.sizes ?? [],
        },
      });
      setSentTo((prev) => new Set(prev).add(recipientId));
    } catch {
      // Best-effort per contact — a failed send just leaves that avatar
      // untouched (no "sent" checkmark) rather than blocking the sheet.
    } finally {
      setSendingTo(null);
    }
  };

  const QuickAction = ({
    icon,
    label,
    onPress,
    active,
  }: {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    active?: boolean;
  }) => (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 7 }}>
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 15,
          backgroundColor: active ? C.gold : C.ivoryDeep,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text style={{ fontSize: 10, fontWeight: '600', color: C.ink }}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(27,21,35,0.5)' }}>
        <View style={{ backgroundColor: C.ivory, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: 10, paddingBottom: spacing.lg }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.lineStrong, alignSelf: 'center', marginBottom: spacing.md }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>Share post</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(27,21,35,0.06)', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} color={C.ink} />
            </Pressable>
          </View>

          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 10 }}>
            <View style={{ width: 52, height: 60, borderRadius: 10, backgroundColor: C.ivoryDeep, overflow: 'hidden' }}>
              {post.images[0] ? (
                <Image source={{ uri: resolveMediaUrl(post.images[0]) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : null}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }} numberOfLines={1}>{post.title}</Text>
              <Text style={{ fontSize: 11, color: C.inkSoft, marginTop: 3 }}>by {post.authorName}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <QuickAction icon={<Repeat2 size={22} color={C.gold} />} label="Repost" onPress={() => { onClose(); onOpenRepost(); }} />
            {/* Purely a visual entry point into the "Send to" row below, which
                is always already visible in this sheet — no separate action. */}
            <QuickAction icon={<Send size={22} color={C.gold} />} label="Send to" onPress={() => {}} />
            <QuickAction
              icon={copied ? <Check size={22} color="#fff" /> : <Link2 size={22} color={C.gold} />}
              label={copied ? 'Copied' : 'Copy link'}
              onPress={handleCopyLink}
              active={copied}
            />
            <QuickAction
              icon={<Bookmark size={20} color={saved ? '#fff' : C.gold} fill={saved ? '#fff' : 'transparent'} />}
              label={saved ? 'Saved' : 'Save'}
              onPress={onToggleSave}
              active={saved}
            />
          </View>

          <Text style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg, fontSize: 11, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Send to
          </Text>
          <View style={{ marginTop: 10, minHeight: 66 }}>
            {contactsLoading ? (
              <ActivityIndicator color={C.gold} style={{ marginLeft: spacing.lg }} />
            ) : contacts.length === 0 ? (
              <Text style={{ marginHorizontal: spacing.lg, fontSize: 11.5, color: C.inkSoft }}>No recent contacts yet</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 14 }}>
                {contacts.map((c) => {
                  const avatarUri = resolveMediaUrl(c.userAvatar);
                  const isSending = sendingTo === c.userId;
                  const isSent = sentTo.has(c.userId);
                  return (
                    <Pressable key={c.userId} onPress={() => handleSendToContact(c.userId)} style={{ alignItems: 'center', gap: 6 }}>
                      <View
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 25,
                          backgroundColor: C.gold,
                          borderWidth: 2,
                          borderColor: C.paper,
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {isSending ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : isSent ? (
                          <Check size={20} color="#fff" />
                        ) : avatarUri ? (
                          <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        ) : (
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{c.userName.slice(0, 2).toUpperCase()}</Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 9.5, color: C.ink }} numberOfLines={1}>{isSent ? 'Sent' : c.userName.split(' ')[0]}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <Pressable
              onPress={handleNativeShare}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.gold, borderRadius: 14, paddingVertical: 14 }}
            >
              <Share2 size={17} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Share via…</Text>
            </Pressable>
          </View>

          <View style={{ marginHorizontal: spacing.lg, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14 }}>
            <Globe size={15} color={C.inkSoft} />
            <Text style={{ flex: 1, fontSize: 11.5, color: C.inkSoft, fontFamily: fontFamilies.mono }} numberOfLines={1}>
              {shareUrl.replace(/^https?:\/\//, '')}
            </Text>
            <Pressable onPress={handleCopyLink}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: copied ? '#10B981' : C.gold }}>{copied ? 'Copied!' : 'Copy'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
