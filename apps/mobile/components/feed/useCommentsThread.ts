import { useEffect, useMemo, useState } from 'react';
import { Pencil, Pin, Trash2, Flag } from 'lucide-react-native';
import React from 'react';
import { violetColors as V } from '@fashub/design-tokens';
import { useAuth } from '../../context/AuthContext';
import {
  getComments,
  addComment,
  editComment,
  deleteComment,
  reactToComment,
  pinComment,
  reportComment,
  ApiError,
} from '@fashub/api-client';
import type { PostComment, CommentReactionType } from '@fashub/types';

export const REACTIONS: { type: CommentReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate' },
  { type: 'funny', emoji: '😂', label: 'Funny' },
  { type: 'insightful', emoji: '💡', label: 'Insightful' },
];

export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export type ReplyTarget = { targetId: string; username: string };
type PendingSend = { content: string; target: ReplyTarget | null };

/**
 * Attaches an optimistic comment either as a new top-level entry, or under
 * whichever top-level ancestor the reply target (itself top-level OR an
 * existing reply — both already flattened one level by the server) belongs
 * to. Mirrors the server's own flattening so the optimistic placement never
 * has to be corrected after the real response lands.
 */
function insertOptimistic(list: PostComment[], optimistic: PostComment, target: ReplyTarget | null): PostComment[] {
  if (!target) return [optimistic, ...list];
  return list.map((c) => {
    if (c.id === target.targetId || c.replies.some((r) => r.id === target.targetId)) {
      return { ...c, replies: [...c.replies, optimistic] };
    }
    return c;
  });
}

function replaceOptimistic(list: PostComment[], tempId: string, real: PostComment): PostComment[] {
  return list.map((c) => {
    if (c.id === tempId) return real;
    if (c.replies.some((r) => r.id === tempId)) {
      return { ...c, replies: c.replies.map((r) => (r.id === tempId ? real : r)) };
    }
    return c;
  });
}

function removeOptimistic(list: PostComment[], tempId: string): PostComment[] {
  return list.filter((c) => c.id !== tempId).map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== tempId) }));
}

/**
 * All comment-thread state/behavior in one place — called once by whichever
 * screen is presenting the thread (the bottom-sheet CommentsSheet, or the
 * full-screen post detail view), so both get identical behavior instead of
 * a second, drifting implementation. See CommentsThreadView.tsx for the
 * shared presentational pieces that consume this hook's return value.
 */
export function useCommentsThread(postId: string, postAuthorId: string | undefined, onCommentAdded: () => void, active: boolean = true) {
  const { user } = useAuth();
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [resolvedPostAuthorId, setResolvedPostAuthorId] = useState<string | null>(postAuthorId ?? null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<PendingSend | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [composerFocused, setComposerFocused] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<PostComment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const isOwnPost = !!user && !!resolvedPostAuthorId && user.id === resolvedPostAuthorId;

  const load = () => {
    setError('');
    setComments(null);
    getComments(postId)
      .then((res) => {
        setComments(res.comments);
        if (res.postAuthorId) setResolvedPostAuthorId(res.postAuthorId);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load comments."));
  };

  useEffect(() => {
    if (active) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, postId]);

  const submitComment = async ({ content, target }: PendingSend) => {
    if (!user || !comments) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: PostComment = {
      id: tempId,
      userId: user.id,
      userName: user.displayName,
      userAvatar: user.avatar ?? null,
      userHeadline: null,
      isVerified: false,
      content,
      createdAt: new Date().toISOString(),
      parentId: target?.targetId ?? null,
      replyToUserId: null,
      replyToUsername: target?.username ?? null,
      isPinned: false,
      isEdited: false,
      editedAt: null,
      reactionCounts: {},
      viewerReactionType: null,
      replies: [],
    };

    setSendError(null);
    setSending(true);
    setComments((prev) => (prev ? insertOptimistic(prev, optimistic, target) : prev));
    setPendingIds((prev) => new Set(prev).add(tempId));

    try {
      const res = await addComment(postId, user.id, content, target?.targetId);
      setComments((prev) => (prev ? replaceOptimistic(prev, tempId, res.comment) : prev));
      onCommentAdded();
    } catch {
      // Roll back the optimistic row and surface a retry-capable failure
      // state instead of silently discarding the attempt — content/target
      // are preserved on the error so "tap to retry" resubmits identically.
      setComments((prev) => (prev ? removeOptimistic(prev, tempId) : prev));
      setSendError({ content, target });
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      setSending(false);
    }
  };

  const handleSend = () => {
    const content = draft.trim();
    if (!content || !user || sending) return;
    const target = replyTarget;
    setDraft('');
    setReplyTarget(null);
    submitComment({ content, target });
  };

  const retrySend = () => {
    if (!sendError) return;
    const pending = sendError;
    setSendError(null);
    submitComment(pending);
  };

  const startReply = (targetId: string, username: string) => setReplyTarget({ targetId, username });

  const handleReact = async (comment: PostComment, type: CommentReactionType) => {
    if (!user) return;
    const apply = (list: PostComment[]): PostComment[] =>
      list.map((c) => {
        if (c.id === comment.id) {
          const prevType = c.viewerReactionType;
          const counts = { ...(c.reactionCounts ?? {}) };
          if (prevType) counts[prevType] = Math.max(0, (counts[prevType] ?? 1) - 1);
          const nextType = prevType === type ? null : type;
          if (nextType) counts[nextType] = (counts[nextType] ?? 0) + 1;
          return { ...c, viewerReactionType: nextType, reactionCounts: counts };
        }
        return { ...c, replies: apply(c.replies) };
      });
    setComments((prev) => (prev ? apply(prev) : prev));
    try {
      const res = await reactToComment(postId, comment.id, user.id, type);
      const reconcile = (list: PostComment[]): PostComment[] =>
        list.map((c) =>
          c.id === comment.id
            ? { ...c, reactionCounts: res.reactionCounts, viewerReactionType: res.viewerReactionType }
            : { ...c, replies: reconcile(c.replies) }
        );
      setComments((prev) => (prev ? reconcile(prev) : prev));
    } catch {
      load();
    }
  };

  const handlePin = async (comment: PostComment) => {
    if (!user) return;
    try {
      await pinComment(postId, comment.id, user.id);
      load();
    } catch {
      // no-op — reload already reflects server truth on next open
    }
  };

  const handleReport = async (comment: PostComment) => {
    if (!user) return;
    try {
      await reportComment(postId, comment.id, user.id);
    } catch {
      // idempotent server-side — safe to ignore a transient failure here
    }
  };

  const handleDelete = async (comment: PostComment) => {
    if (!user) return;
    try {
      await deleteComment(postId, comment.id, user.id);
      load();
    } catch {
      // reload on next open reflects server truth
    }
  };

  const startEdit = (comment: PostComment) => {
    setEditingId(comment.id);
    setEditText(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async () => {
    if (!user || !editingId || !editText.trim()) return;
    try {
      await editComment(postId, editingId, user.id, editText.trim());
      setEditingId(null);
      setEditText('');
      load();
    } catch {
      // leave editor open so the user can retry
    }
  };

  const toggleHistory = (commentId: string) => {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const openMenu = (comment: PostComment) => setMenuFor(comment);
  const closeMenu = () => setMenuFor(null);

  const menuActions = useMemo(() => {
    if (!menuFor || !user) return [];
    const isOwn = menuFor.userId === user.id;
    const actions: { icon: React.ReactNode; label: string; onPress: () => void; danger?: boolean }[] = [];
    if (isOwn) {
      actions.push({ icon: React.createElement(Pencil, { size: 18, color: V.ink }), label: 'Edit', onPress: () => startEdit(menuFor) });
    }
    if (isOwnPost && !menuFor.parentId) {
      actions.push({
        icon: React.createElement(Pin, { size: 18, color: V.ink }),
        label: menuFor.isPinned ? 'Unpin' : 'Pin',
        onPress: () => handlePin(menuFor),
      });
    }
    if (isOwn || isOwnPost) {
      actions.push({ icon: React.createElement(Trash2, { size: 18, color: '#DC2626' }), label: 'Delete', onPress: () => handleDelete(menuFor), danger: true });
    }
    if (!isOwn) {
      actions.push({ icon: React.createElement(Flag, { size: 18, color: isOwnPost ? V.ink : '#DC2626' }), label: 'Report', onPress: () => handleReport(menuFor), danger: !isOwnPost });
    }
    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuFor, isOwnPost, user]);

  return {
    comments,
    error,
    load,
    draft,
    setDraft,
    sending,
    sendError,
    retrySend,
    pendingIds,
    composerFocused,
    setComposerFocused,
    replyTarget,
    setReplyTarget,
    startReply,
    handleSend,
    expandedHistory,
    toggleHistory,
    reactionPickerId,
    setReactionPickerId,
    handleReact,
    menuFor,
    openMenu,
    closeMenu,
    menuActions,
    editingId,
    editText,
    setEditText,
    saveEdit,
    cancelEdit,
  };
}

export type CommentsThread = ReturnType<typeof useCommentsThread>;
