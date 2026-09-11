import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Repeat2, X, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { repostPost, resolveMediaUrl, ApiError } from '@fashub/api-client';

export type RepostTarget = {
  id: string;
  title: string;
  authorName: string;
  images: string[];
};

/**
 * Matches web's real Feed-page repost flow (app/feed/page.tsx
 * handleRepostClick/handleRepost) — a confirmation sheet with an optional
 * comment, POST /api/posts/[postId]/repost {userId, comment}. Web's button
 * label is static "Repost" (confirmed — no persisted "Reposted" state), and
 * every failure including "already reposted" surfaces via a blunt alert
 * rather than being silently absorbed.
 *
 * Visual pattern (grabber, rounded-top ivory sheet, X-close header, violet
 * accent) matches the approved Share Post redesign
 * (fashub_share_post_modal_redesign.html) so the two action sheets feel
 * like one consistent system rather than two different modal styles.
 */
export function RepostModal({
  visible,
  onClose,
  target,
  userId,
  onReposted,
}: {
  visible: boolean;
  onClose: () => void;
  target: RepostTarget;
  userId: string;
  /** Fires only after the backend confirms the repost (201) — never on failure. */
  onReposted: (result: { id: string; createdAt: string; comment: string | undefined }) => void;
}) {
  const { colors: C, spacing, radius } = useTheme();
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const cover = target.images[0];

  const handleConfirm = async () => {
    if (sending) return;
    setSending(true);
    try {
      const trimmed = comment.trim() || undefined;
      const { repost } = await repostPost(target.id, userId, trimmed);
      onReposted({ id: repost.id, createdAt: repost.createdAt, comment: trimmed });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setComment('');
        onClose();
      }, 1200);
    } catch (err) {
      Alert.alert('Repost failed', err instanceof ApiError ? err.message : 'Failed to repost. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(27,21,35,0.5)' }}>
        <View style={{ backgroundColor: C.ivory, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: 10, paddingBottom: spacing.xl }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.lineStrong, alignSelf: 'center', marginBottom: spacing.md }} />

          {success ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
                <CheckCircle2 size={28} color="#10B981" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>Reposted!</Text>
              <Text style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 3 }}>This post is now on your profile</Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Repeat2 size={18} color={C.gold} />
                  <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>Repost</Text>
                </View>
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
                  {cover ? <Image source={{ uri: resolveMediaUrl(cover) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }} numberOfLines={1}>{target.title}</Text>
                  <Text style={{ fontSize: 11, color: C.inkSoft, marginTop: 3 }}>by {target.authorName}</Text>
                </View>
              </View>

              <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Add your own comment (optional)…"
                  placeholderTextColor={C.inkSoft}
                  multiline
                  style={{ borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, borderRadius: 12, padding: 12, fontSize: 13, color: C.ink, minHeight: 60, textAlignVertical: 'top' }}
                />
              </View>

              <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
                <Pressable
                  onPress={handleConfirm}
                  disabled={sending}
                  style={{ backgroundColor: C.gold, borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: sending ? 0.6 : 1 }}
                >
                  {sending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Repost</Text>}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
