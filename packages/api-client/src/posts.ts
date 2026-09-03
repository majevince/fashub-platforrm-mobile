import { apiGet, apiPost, apiPatch, apiDelete } from './http';
import type { PostComment, CreatePostPayload, CommentReactionType, PostDetail } from '@fashub/types';

/**
 * Matches POST /api/posts exactly — JSON body, images/videos are
 * already-uploaded URLs (see uploadFiles). The returned `post` is raw
 * Prisma shape, not the feed's enriched FeedPost transform (different
 * route, different response shape) — typed loosely since callers should
 * refetch the feed to display the new post correctly rather than trust
 * this shape to match.
 */
export function createPost(payload: CreatePostPayload): Promise<{ message: string; post: { id: string } }> {
  return apiPost('/api/posts', payload);
}

/** Matches GET /api/posts/[postId] exactly — the single-post detail fetch, a genuinely different shape from the feed's FeedPost (see PostDetail). */
export function getPost(postId: string, viewerId?: string): Promise<PostDetail> {
  return apiGet(`/api/posts/${postId}${viewerId ? `?viewerId=${encodeURIComponent(viewerId)}` : ''}`);
}

/** Matches POST /api/posts/[postId]/like exactly — toggles, does not just "set liked". */
export function toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
  return apiPost(`/api/posts/${postId}/like`, { userId });
}

/** Matches GET /api/posts/[postId]/comments — full thread tree, not flat. */
export function getComments(postId: string): Promise<{ comments: PostComment[]; postAuthorId: string | null; total: number }> {
  return apiGet(`/api/posts/${postId}/comments`);
}

/**
 * Matches POST /api/posts/[postId]/comments — parentId omitted for a
 * top-level comment. Pass the ACTUAL clicked comment/reply id as parentId
 * when replying to a reply — the server resolves flattening (attaches to
 * the top-level ancestor, sets replyToUserId/replyToUsername) itself; the
 * client must never pre-resolve this.
 */
export function addComment(postId: string, userId: string, content: string, parentId?: string): Promise<{ comment: PostComment }> {
  return apiPost(`/api/posts/${postId}/comments`, { userId, content, parentId });
}

/** Matches PATCH /api/posts/[postId]/comments — own comment only, server sets isEdited/editedAt. */
export function editComment(postId: string, commentId: string, userId: string, content: string): Promise<{ comment: PostComment }> {
  return apiPatch(`/api/posts/${postId}/comments`, { commentId, userId, content });
}

/** Matches DELETE /api/posts/[postId]/comments?commentId=&userId= — own comment, or post owner moderating. */
export function deleteComment(postId: string, commentId: string, userId: string): Promise<{ deletedId: string }> {
  return apiDelete(`/api/posts/${postId}/comments?commentId=${encodeURIComponent(commentId)}&userId=${encodeURIComponent(userId)}`);
}

/** Matches POST /api/posts/[postId]/comments/[commentId]/react — toggle semantics, one reaction per user per comment. */
export function reactToComment(
  postId: string,
  commentId: string,
  userId: string,
  type: CommentReactionType
): Promise<{ reactionCounts: Partial<Record<CommentReactionType, number>>; viewerReactionType: CommentReactionType | null }> {
  return apiPost(`/api/posts/${postId}/comments/${commentId}/react`, { userId, type });
}

/** Matches POST /api/posts/[postId]/comments/[commentId]/pin — post-owner only, one pinned comment per post (toggle). */
export function pinComment(postId: string, commentId: string, userId: string): Promise<{ isPinned: boolean }> {
  return apiPost(`/api/posts/${postId}/comments/${commentId}/pin`, { userId });
}

/** Matches POST /api/posts/[postId]/comments/[commentId]/report — idempotent, mirrors StoryReport. */
export function reportComment(postId: string, commentId: string, userId: string): Promise<{ success: boolean }> {
  return apiPost(`/api/posts/${postId}/comments/${commentId}/report`, { userId });
}

/** Matches POST /api/posts/[postId]/repost — server 400s if this user already reposted it. */
export function repostPost(postId: string, userId: string, comment?: string): Promise<{ message: string }> {
  return apiPost(`/api/posts/${postId}/repost`, { userId, comment });
}

/** Matches POST /api/saved-items — a genuine toggle (calling it again un-saves), contentType 'POST'. */
export function toggleSavedPost(postId: string, userId: string): Promise<{ saved: boolean }> {
  return apiPost('/api/saved-items', { userId, contentId: postId, contentType: 'POST' });
}
