import { apiGet, apiPost, apiPatch, apiDelete } from './http';
import type { StoryGroup, CreateStoryPayload, StoryPrivacySettings, StoryViewerEntry } from '@fashub/types';

/**
 * Matches GET /api/stories exactly — unlike /api/feed and /api/posts/*,
 * this route is gated by requireAuth() server-side (Bearer token, not a
 * userId param). Works automatically as long as a token is set via
 * setAuthTokenProvider (see apps/mobile/context/AuthContext.tsx), which
 * request() attaches to every call.
 */
export function getStories(): Promise<{ groups: StoryGroup[] }> {
  return apiGet('/api/stories');
}

/** Matches GET /api/stories/[id] exactly — fetches a single still-live story,
 * used to reopen a story from a chat message's StoryMessageCard tap (its
 * `data` is a permanent snapshot; this is the live check). Returns a
 * one-element `group` shaped identically to getStories()'s groups[], so it
 * slots straight into StoryViewer's `group` prop. Throws ApiError(status:404)
 * once the story has expired or was deleted by its author — callers should
 * treat any failure here as "no longer available," not just a 404 specifically. */
export function getStory(id: string): Promise<{ group: StoryGroup }> {
  return apiGet(`/api/stories/${id}`);
}

/** Matches POST /api/stories exactly — always creates a new story (additive, no PATCH/replace exists server-side). */
export function createStory(payload: CreateStoryPayload): Promise<{ story: { id: string } }> {
  return apiPost('/api/stories', payload);
}

/** Matches DELETE /api/stories/[id] — owner-only. The real mechanism for "replacing" a story: delete, then create. */
export function deleteStory(id: string): Promise<{ success: boolean }> {
  return apiDelete(`/api/stories/${id}`);
}

/** Matches POST /api/stories/[id]/view — idempotent, powers the "seen" ring + real view counts. Owner viewing their own story is a no-op server-side. */
export function markStoryViewed(id: string): Promise<{ success: boolean }> {
  return apiPost(`/api/stories/${id}/view`, {});
}

/** Matches POST /api/stories/[id]/react exactly — one reaction per viewer per story (upsert), defaults to a heart. Gated by the author's allowReplies privacy setting server-side (403 if not permitted). */
export function reactToStory(id: string, emoji = '❤️'): Promise<{ id: string }> {
  return apiPost(`/api/stories/${id}/react`, { emoji });
}

/** Matches GET /api/stories/settings exactly — lazily creates the caller's settings row + resolves their real followers into the Close Friends/Hide-from candidate pool. */
export function getStorySettings(): Promise<StoryPrivacySettings> {
  return apiGet('/api/stories/settings');
}

/** Matches PATCH /api/stories/settings exactly — allowReplies and/or closeFriendsOnly, either may be omitted. */
export function updateStorySettings(patch: { allowReplies?: 'everyone' | 'followers' | 'off'; closeFriendsOnly?: boolean }): Promise<{ allowReplies: string; closeFriendsOnly: boolean }> {
  return apiPatch('/api/stories/settings', patch);
}

/** Matches POST/DELETE /api/stories/settings/close-friends exactly. */
export function addCloseFriend(userId: string): Promise<{ success: boolean }> {
  return apiPost('/api/stories/settings/close-friends', { userId });
}
export function removeCloseFriend(userId: string): Promise<{ success: boolean }> {
  return apiDelete(`/api/stories/settings/close-friends?userId=${encodeURIComponent(userId)}`);
}

/** Matches POST /api/stories/settings/hidden exactly — toggles userId in/out of hiddenFromUserIds. */
export function toggleHiddenFromUser(userId: string): Promise<{ success: boolean }> {
  return apiPost('/api/stories/settings/hidden', { userId });
}

/** Matches POST /api/stories/mute exactly — a real toggle (calling again unmutes), mutes an author's stories entirely (separate from the allowReplies/closeFriends privacy settings, which control the author's own audience, not a viewer's own mute list). */
export function muteStoryAuthor(authorId: string): Promise<{ muted: boolean }> {
  return apiPost('/api/stories/mute', { authorId });
}

/** Matches GET /api/stories/[id]/viewers exactly — owner-only (403 otherwise), real viewedAt + liked per viewer. */
export function getStoryViewers(storyId: string): Promise<{ viewers: StoryViewerEntry[] }> {
  return apiGet(`/api/stories/${storyId}/viewers`);
}

/** Matches POST /api/stories/[id]/report exactly. */
export function reportStory(storyId: string): Promise<{ success: boolean }> {
  return apiPost(`/api/stories/${storyId}/report`, {});
}
