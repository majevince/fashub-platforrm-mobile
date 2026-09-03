import React from 'react';
import { View, Text, FlatList, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { X, Send, Pin, MoreHorizontal, AlertCircle } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { resolveMediaUrl } from '@fashub/api-client';
import type { PostComment, CommentReactionType } from '@fashub/types';
import { VerifiedBadge, isVerified } from '../VerifiedBadge';
import { REACTIONS, timeAgo, type CommentsThread } from './useCommentsThread';

/**
 * Presentational pieces shared by CommentsSheet (bottom-sheet modal) and the
 * post detail screen (full-screen, single scrolling column) — both call
 * useCommentsThread() once and pass its return value here, so there is one
 * comment implementation, not two drifting copies. CommentsList and
 * CommentsComposer are exported separately because the detail screen needs
 * the list to scroll WITH the rest of the page while the composer stays
 * pinned to the screen's own bottom edge — CommentsSheet renders both
 * pieces stacked inside its own Modal instead.
 */

function Avatar({ uri, name, size = 32 }: { uri: string | null; name: string; size?: number }) {
  return uri ? (
    <Image
      source={{ uri: resolveMediaUrl(uri) ?? undefined }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: V.canvas }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: V.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '700' }}>
        {name.substring(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function PinnedBadge() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: V.primarySoft,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
        alignSelf: 'flex-start',
        marginBottom: 3,
      }}
    >
      <Pin size={9} color={V.primaryDeep} fill={V.primaryDeep} />
      <Text style={{ fontSize: 9.5, fontWeight: '700', color: V.primaryDeep }}>Pinned</Text>
    </View>
  );
}

function ReactionSummary({ counts }: { counts?: Partial<Record<CommentReactionType, number>> }) {
  const entries = Object.entries(counts ?? {}).filter(([, n]) => (n ?? 0) > 0) as [CommentReactionType, number][];
  if (entries.length === 0) return null;
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ flexDirection: 'row' }}>
        {sorted.slice(0, 3).map(([type], i) => (
          <View
            key={type}
            style={{
              width: 15,
              height: 15,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: V.canvas,
              borderWidth: 1,
              borderColor: '#fff',
              marginLeft: i === 0 ? 0 : -5,
            }}
          >
            <Text style={{ fontSize: 8 }}>{REACTIONS.find((r) => r.type === type)?.emoji}</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 11, fontWeight: '600', color: V.inkFaint }}>{total}</Text>
    </View>
  );
}

function ReactionPicker({ onPick, onClose }: { onPick: (type: CommentReactionType) => void; onClose: () => void }) {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 26,
        left: 0,
        flexDirection: 'row',
        gap: 4,
        backgroundColor: V.surface,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: V.line,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
        zIndex: 20,
      }}
    >
      {REACTIONS.map((r) => (
        <Pressable
          key={r.type}
          onPress={() => {
            onPick(r.type);
            onClose();
          }}
          style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 17 }}>{r.emoji}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function CommentsMenuSheet({
  onClose,
  actions,
}: {
  onClose: () => void;
  actions: { icon: React.ReactNode; label: string; onPress: () => void; danger?: boolean }[];
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(27,21,35,0.35)' }} onPress={onClose}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={{
              backgroundColor: V.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingVertical: 8,
              paddingBottom: 24,
            }}
          >
            {actions.map((a, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  a.onPress();
                  onClose();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 }}
              >
                {a.icon}
                <Text style={{ fontSize: 15, fontWeight: '600', color: a.danger ? '#DC2626' : V.ink }}>{a.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function CommentRow({ thread, comment, isReply }: { thread: CommentsThread; comment: PostComment; isReply: boolean }) {
  const { typeScale } = useTheme();
  const router = useRouter();
  const isEditing = thread.editingId === comment.id;
  const isPending = thread.pendingIds.has(comment.id);
  const goToProfile = () => router.push(`/profile/${comment.userId}`);

  return (
    <View style={{ flexDirection: 'row', gap: 8, opacity: isPending ? 0.6 : 1 }}>
      <Pressable onPress={goToProfile} hitSlop={4}>
        <Avatar uri={comment.userAvatar} name={comment.userName} size={isReply ? 26 : 32} />
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        {comment.isPinned && <PinnedBadge />}
        {isEditing ? (
          <View style={{ gap: 6 }}>
            <TextInput
              value={thread.editText}
              onChangeText={thread.setEditText}
              style={{
                fontSize: 13,
                color: V.ink,
                borderWidth: 1,
                borderColor: V.primary,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
              autoFocus
              onSubmitEditing={thread.saveEdit}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={thread.saveEdit}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: V.primary }}>Save</Text>
              </Pressable>
              <Pressable onPress={thread.cancelEdit}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: V.inkFaint }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View
              style={{
                backgroundColor: V.canvas,
                borderWidth: 1,
                borderColor: V.line,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Pressable onPress={goToProfile} hitSlop={4} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: V.ink }} numberOfLines={1}>{comment.userName}</Text>
                  {isVerified({ subscriptionTier: comment.userSubscriptionTier, verified: comment.isVerified }) ? <VerifiedBadge size="sm" /> : null}
                </Pressable>
                <Pressable onPress={() => thread.openMenu(comment)} hitSlop={8} style={{ padding: 2 }}>
                  <MoreHorizontal size={14} color={V.inkFaint} />
                </Pressable>
              </View>
              {comment.userHeadline ? (
                <Text style={{ fontSize: 10.5, color: V.inkFaint, marginBottom: 2 }}>{comment.userHeadline}</Text>
              ) : null}
              <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: V.inkSoft }}>
                {isReply && comment.replyToUsername ? (
                  <Text style={{ fontWeight: '700', color: V.primary }}>@{comment.replyToUsername} </Text>
                ) : null}
                {comment.content}
              </Text>
              {comment.isEdited ? <Text style={{ fontSize: 9.5, fontStyle: 'italic', color: V.inkFaint }}>edited</Text> : null}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginLeft: 4 }}>
              {isPending ? (
                <>
                  <ActivityIndicator size="small" color={V.inkFaint} />
                  <Text style={{ fontSize: 10.5, fontWeight: '500', color: V.inkFaint }}>Sending…</Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 10.5, fontWeight: '500', color: V.inkFaint }}>{timeAgo(comment.createdAt)}</Text>
                  <View>
                    <Pressable onPress={() => thread.setReactionPickerId(thread.reactionPickerId === comment.id ? null : comment.id)}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: comment.viewerReactionType ? V.primary : V.inkFaint }}>
                        {comment.viewerReactionType ? REACTIONS.find((r) => r.type === comment.viewerReactionType)?.label : 'Like'}
                      </Text>
                    </Pressable>
                    {thread.reactionPickerId === comment.id && (
                      <ReactionPicker onPick={(type) => thread.handleReact(comment, type)} onClose={() => thread.setReactionPickerId(null)} />
                    )}
                  </View>
                  <Pressable onPress={() => thread.startReply(comment.id, comment.userName)}>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: V.primary }}>Reply</Text>
                  </Pressable>
                  <ReactionSummary counts={comment.reactionCounts} />
                </>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function TopLevelComment({ thread, comment }: { thread: CommentsThread; comment: PostComment }) {
  const replies = comment.replies ?? [];
  const historyOpen = thread.expandedHistory.has(comment.id);
  const mostRecent = replies.length > 0 ? replies[replies.length - 1] : null;
  const olderReplies = historyOpen ? replies.slice(0, -1) : [];

  return (
    <View style={{ gap: 6 }}>
      <CommentRow thread={thread} comment={comment} isReply={false} />
      {replies.length > 0 && (
        <View style={{ marginLeft: 16, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: V.line, gap: 8 }}>
          {!historyOpen && replies.length > 1 && (
            <Pressable onPress={() => thread.toggleHistory(comment.id)}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: V.primary }}>
                See {replies.length - 1} previous {replies.length - 1 === 1 ? 'reply' : 'replies'}
              </Text>
            </Pressable>
          )}
          {historyOpen && (
            <Pressable onPress={() => thread.toggleHistory(comment.id)}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: V.inkFaint }}>Hide previous replies</Text>
            </Pressable>
          )}
          {olderReplies.map((r) => (
            <View key={r.id}>
              <CommentRow thread={thread} comment={r} isReply />
            </View>
          ))}
          {mostRecent && (
            <View>
              <CommentRow thread={thread} comment={mostRecent} isReply />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * `scrollable=true` (CommentsSheet): its own FlatList inside the bottom
 * sheet's fixed-height modal. `scrollable=false` (post detail screen): a
 * plain mapped list with FlatList's own scrolling disabled, so the parent
 * screen's single ScrollView owns the scroll instead, per the mockup's
 * "one scrolling column" layout.
 */
export function CommentsList({
  thread,
  scrollable,
  headerCount,
}: {
  thread: CommentsThread;
  scrollable: boolean;
  headerCount?: boolean;
}) {
  const { typeScale, spacing } = useTheme();

  if (thread.error) {
    return <ErrorStateInline message={thread.error} onRetry={thread.load} />;
  }
  if (thread.comments === null) {
    return (
      <View style={{ padding: spacing.xl, alignItems: 'center' }}>
        <ActivityIndicator color={V.primary} />
      </View>
    );
  }
  if (thread.comments.length === 0) {
    return (
      <View style={{ padding: spacing.xl, alignItems: 'center' }}>
        <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: V.inkSoft, textAlign: 'center' }}>
          No comments yet. Be the first to say something.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={thread.comments}
      keyExtractor={(c) => c.id}
      scrollEnabled={scrollable}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      renderItem={({ item }) => <TopLevelComment thread={thread} comment={item} />}
    />
  );
}

function ErrorStateInline({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.xl, alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: V.inkSoft, textAlign: 'center' }}>{message}</Text>
      <Pressable onPress={onRetry}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: V.primary }}>Retry</Text>
      </Pressable>
    </View>
  );
}

export function CommentsComposer({ thread }: { thread: CommentsThread }) {
  const { spacing } = useTheme();
  return (
    <View>
      {thread.sendError && (
        <Pressable
          onPress={thread.retrySend}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginHorizontal: spacing.lg,
            marginBottom: 4,
            backgroundColor: '#FEF2F2',
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 10,
          }}
        >
          <AlertCircle size={14} color="#DC2626" />
          <Text style={{ fontSize: 11.5, color: '#DC2626', fontWeight: '600', flex: 1 }}>
            Couldn't post your comment — tap to retry
          </Text>
        </Pressable>
      )}

      {thread.replyTarget && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            marginLeft: spacing.lg,
            marginBottom: 4,
            backgroundColor: V.primarySoft,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 10,
          }}
        >
          <Text style={{ fontSize: 11.5, color: V.primaryDeep, fontWeight: '500' }}>
            Replying to <Text style={{ fontWeight: '700' }}>@{thread.replyTarget.username}</Text>
          </Text>
          <Pressable onPress={() => thread.setReplyTarget(null)} hitSlop={6}>
            <X size={12} color={V.primaryDeep} />
          </Pressable>
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: spacing.sm,
          padding: spacing.lg,
          borderTopWidth: 1,
          borderTopColor: V.line,
          backgroundColor: V.surface,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: V.canvas,
            borderWidth: 1.5,
            borderColor: thread.composerFocused ? V.primary : V.line,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            maxHeight: 100,
          }}
        >
          <TextInput
            value={thread.draft}
            onChangeText={thread.setDraft}
            onFocus={() => thread.setComposerFocused(true)}
            onBlur={() => thread.setComposerFocused(false)}
            placeholder={thread.replyTarget ? `Reply to ${thread.replyTarget.username}…` : 'Add a comment…'}
            placeholderTextColor={V.inkFaint}
            multiline
            style={{ fontSize: 13.5, fontWeight: '400', color: V.ink, maxHeight: 84 }}
          />
        </View>
        <Pressable
          onPress={thread.handleSend}
          disabled={!thread.draft.trim() || thread.sending}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: V.primary,
            opacity: !thread.draft.trim() || thread.sending ? 0.5 : 1,
          }}
        >
          {thread.sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={16} color="#fff" />}
        </Pressable>
      </View>
    </View>
  );
}
