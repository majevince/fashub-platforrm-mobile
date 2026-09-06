import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Share } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Heart, MessageCircle, Pin, Check, Send, Share2 } from 'lucide-react-native';
import { violetColors as VF } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { resolveMediaUrl, toggleCommunityPostLike, voteCommunityPoll, addCommunityComment, deleteCommunityComment, toggleCommunityPostPin, API_BASE_URL } from '@fashub/api-client';
import type { CommunityPost, CommunityComment } from '@fashub/types';
import { VerifiedBadge, isVerified } from '../VerifiedBadge';
import { PhotoGalleryViewer } from '../PhotoGalleryViewer';

const LONG_CONTENT_THRESHOLD = 300;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function VideoPreview({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => { p.loop = false; });
  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000' }}>
      <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls />
    </View>
  );
}

/**
 * Ports web's PostCard.tsx (community discussion feed item) — like, threaded
 * comments (top-level + one level of replies, matching the API's 3+3 cap),
 * poll voting (upsert — voting again changes your vote; UI disables further
 * taps once voted, matching web exactly even though the backend would
 * technically allow a change), and pin/unpin for admins/moderators/owner.
 */
export function CommunityPostCard({
  slug,
  post: initialPost,
  currentUserId,
  canModerate,
  canComment,
}: {
  slug: string;
  post: CommunityPost;
  currentUserId: string;
  canModerate: boolean;
  canComment: boolean;
}) {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [voting, setVoting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const resolvedImages = post.images.map((u) => resolveMediaUrl(u)).filter((v): v is string => !!v);
  const authorVerified = post.author ? isVerified({ subscriptionTier: post.author.subscriptionTier }) : false;
  const isLongContent = post.content.length > LONG_CONTENT_THRESHOLD;
  const displayContent = isLongContent && !expanded ? `${post.content.slice(0, LONG_CONTENT_THRESHOLD)}...` : post.content;

  const handleShare = () => {
    const url = `${API_BASE_URL}/communities/${slug}?post=${post.id}`;
    const title = post.content.length > 80 ? `${post.content.slice(0, 80)}…` : post.content;
    Share.share({ message: `${title} — ${url}` }).catch(() => {});
  };

  const handleLike = async () => {
    const next = !post.hasLiked;
    setPost((p) => ({ ...p, hasLiked: next, likeCount: next ? p.likeCount + 1 : Math.max(0, p.likeCount - 1) }));
    try {
      await toggleCommunityPostLike(slug, post.id, currentUserId);
    } catch {
      setPost((p) => ({ ...p, hasLiked: !next, likeCount: !next ? p.likeCount + 1 : Math.max(0, p.likeCount - 1) }));
    }
  };

  const handleVote = async (optionId: string) => {
    if (post.myPollVote || voting) return;
    setVoting(true);
    try {
      const res = await voteCommunityPoll(slug, post.id, currentUserId, optionId);
      setPost((p) => ({ ...p, myPollVote: res.myVote, pollVoteCounts: res.voteCounts, pollTotalVotes: res.totalVotes }));
    } catch {
      // no-op — leave poll state as-is on failure
    } finally {
      setVoting(false);
    }
  };

  const handlePin = async () => {
    const next = !post.isPinned;
    setPost((p) => ({ ...p, isPinned: next }));
    try {
      await toggleCommunityPostPin(slug, post.id, currentUserId);
    } catch {
      setPost((p) => ({ ...p, isPinned: !next }));
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const comment = await addCommunityComment(slug, post.id, currentUserId, commentText.trim(), replyTo?.id);
      setPost((p) => ({
        ...p,
        commentCount: p.commentCount + 1,
        comments: replyTo
          ? (p.comments ?? []).map((c) => (c.id === replyTo.id ? { ...c, replies: [...(c.replies ?? []), comment] } : c))
          : [...(p.comments ?? []), comment],
      }));
      setCommentText('');
      setReplyTo(null);
    } catch {
      // no-op — leave composer text intact so the user can retry
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string, parentId: string | null) => {
    try {
      await deleteCommunityComment(slug, post.id, commentId, currentUserId);
      setPost((p) => ({
        ...p,
        commentCount: Math.max(0, p.commentCount - 1),
        comments: parentId
          ? (p.comments ?? []).map((c) => (c.id === parentId ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) } : c))
          : (p.comments ?? []).filter((c) => c.id !== commentId),
      }));
    } catch {
      // no-op
    }
  };

  const renderComment = (comment: CommunityComment, parentId: string | null) => {
    const canDelete = comment.authorId === currentUserId || canModerate;
    return (
      <View key={comment.id} style={{ marginLeft: parentId ? 24 : 0, marginTop: 8, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{comment.author?.displayName ?? 'Member'}</Text>
          <Text style={{ fontSize: 10, fontWeight: '400', color: VF.inkFaint }}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={{ fontSize: 12.5, fontWeight: '400', color: colors.ink }}>{comment.content}</Text>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {!parentId && canComment ? (
            <Pressable onPress={() => setReplyTo({ id: comment.id, name: comment.author?.displayName ?? 'Member' })}>
              <Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.gold }}>Reply</Text>
            </Pressable>
          ) : null}
          {canDelete ? (
            <Pressable onPress={() => handleDeleteComment(comment.id, parentId)}>
              <Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.oxblood }}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
        {!parentId ? (comment.replies ?? []).map((r) => renderComment(r, comment.id)) : null}
      </View>
    );
  };

  return (
    <View style={{ backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 10 }}>
      {post.isPinned ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Pin size={11} color={colors.gold} />
          <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.4 }}>Pinned by admin</Text>
        </View>
      ) : null}

      <Pressable onPress={() => post.author && router.push(`/profile/${post.author.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.gold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {post.author?.avatar ? (
            <Image source={{ uri: resolveMediaUrl(post.author.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ivory }}>{(post.author?.displayName ?? '?').slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{post.author?.displayName ?? 'Member'}</Text>
            {authorVerified ? <VerifiedBadge size="sm" /> : null}
            {post.author?.role ? (
              <View style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1.5 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.gold, textTransform: 'capitalize' }}>{post.author.role}</Text>
              </View>
            ) : null}
          </View>
          <Text style={{ fontSize: 10.5, fontWeight: '400', color: VF.inkFaint }}>{timeAgo(post.createdAt)}</Text>
        </View>
        {canModerate ? (
          <Pressable onPress={handlePin} hitSlop={8}>
            <Pin size={16} color={post.isPinned ? colors.gold : VF.inkFaint} fill={post.isPinned ? colors.gold : 'transparent'} />
          </Pressable>
        ) : null}
      </Pressable>

      <View>
        <Text style={{ fontSize: 13.5, lineHeight: 19, color: colors.ink }}>{displayContent}</Text>
        {isLongContent && !expanded ? (
          <Pressable onPress={() => setExpanded(true)}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.gold, marginTop: 2 }}>See more</Text>
          </Pressable>
        ) : null}
      </View>

      {resolvedImages.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {resolvedImages.map((uri, i) => (
            <Pressable key={i} onPress={() => { setGalleryIndex(i); setGalleryOpen(true); }} style={{ width: resolvedImages.length === 1 ? '100%' : '48.5%', aspectRatio: 1.2, borderRadius: 10, overflow: 'hidden' }}>
              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      ) : null}

      {post.videoUrl ? <VideoPreview url={resolveMediaUrl(post.videoUrl) ?? post.videoUrl} /> : null}

      {post.postType === 'poll' && post.pollOptions ? (
        <View style={{ gap: 8 }}>
          {post.pollQuestion ? <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink }}>{post.pollQuestion}</Text> : null}
          {post.pollOptions.map((opt) => {
            const count = post.pollVoteCounts?.[opt.id] ?? 0;
            const total = post.pollTotalVotes ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const isMine = post.myPollVote === opt.id;
            const hasVoted = !!post.myPollVote;
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleVote(opt.id)}
                disabled={hasVoted}
                style={{ borderRadius: radius.md, borderWidth: 1, borderColor: isMine ? colors.gold : colors.line, padding: 10, overflow: 'hidden' }}
              >
                {hasVoted ? <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`, backgroundColor: colors.ivoryDeep }} /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isMine ? <Check size={13} color={colors.gold} /> : null}
                    <Text style={{ fontSize: 12.5, fontWeight: isMine ? '700' : '500', color: colors.ink }}>{opt.text}</Text>
                  </View>
                  {hasVoted ? <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.inkSoft }}>{pct}%</Text> : null}
                </View>
              </Pressable>
            );
          })}
          {post.pollTotalVotes != null ? <Text style={{ fontSize: 10.5, fontWeight: '500', color: VF.inkFaint }}>{post.pollTotalVotes} votes</Text> : null}
        </View>
      ) : null}

      {post.likeCount > 0 || post.commentCount > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {post.likeCount > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Heart size={12} color={colors.oxblood} fill={colors.oxblood} />
              <Text style={{ fontSize: 11, fontWeight: '500', color: VF.inkFaint }}>{post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}</Text>
            </View>
          ) : null}
          {post.commentCount > 0 ? (
            <Pressable onPress={() => setCommentsOpen((v) => !v)}>
              <Text style={{ fontSize: 11, fontWeight: '500', color: VF.inkFaint }}>{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.line }}>
        <Pressable onPress={handleLike} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}>
          <Heart size={16} color={post.hasLiked ? colors.oxblood : VF.inkFaint} fill={post.hasLiked ? colors.oxblood : 'transparent'} />
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: post.hasLiked ? colors.oxblood : colors.inkSoft }}>Like</Text>
        </Pressable>
        <Pressable onPress={() => setCommentsOpen((v) => !v)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}>
          <MessageCircle size={16} color={VF.inkFaint} />
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.inkSoft }}>Comment</Text>
        </Pressable>
        <Pressable onPress={handleShare} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}>
          <Share2 size={16} color={VF.inkFaint} />
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.inkSoft }}>Share</Text>
        </Pressable>
      </View>

      {commentsOpen ? (
        <View style={{ gap: 4, paddingTop: 4 }}>
          {(post.comments ?? []).map((c) => renderComment(c, null))}
          {canComment ? (
            <View style={{ marginTop: 8, gap: 6 }}>
              {replyTo ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '500', color: colors.inkSoft }}>Replying to {replyTo.name}</Text>
                  <Pressable onPress={() => setReplyTo(null)}><Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.gold }}>Cancel</Text></Pressable>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Write a comment…"
                  placeholderTextColor={VF.inkFaint}
                  style={{ flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12.5, color: colors.ink }}
                />
                <Pressable onPress={handleSubmitComment} disabled={!commentText.trim() || submittingComment} hitSlop={6}>
                  <Send size={18} color={commentText.trim() ? colors.gold : VF.inkFaint} />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <PhotoGalleryViewer visible={galleryOpen} images={resolvedImages} initialIndex={galleryIndex} onClose={() => setGalleryOpen(false)} />
    </View>
  );
}
