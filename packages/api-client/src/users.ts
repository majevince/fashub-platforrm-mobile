import { apiGet, apiPost } from './http';

export interface UserSearchResult {
  id: string;
  email: string;
  displayName: string;
  avatar: string | null;
  role: string;
}

/** Matches GET /api/users?search=&limit= exactly — the plain (non-enriched) response, a bare array. Used by Communities settings' "Add Members" search. */
export function searchUsers(search: string, limit: number = 10): Promise<UserSearchResult[]> {
  return apiGet(`/api/users?search=${encodeURIComponent(search)}&limit=${limit}`);
}

export interface MessagingUserSearchResult {
  id: string;
  displayName: string;
  avatar: string | null;
  role: string;
  title: string | null;
  isVerified: boolean;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isConnection: boolean;
}

export interface MessagingUserSearchResponse {
  users: MessagingUserSearchResult[];
  nextCursor: number | null;
  total: number;
}

/**
 * Matches GET /api/users/search exactly — the new-message compose flow's
 * search, distinct from searchUsers() above (which hits the older, plainer
 * /api/users?search= used by Communities' "Add Members"). Discoverability
 * here is unconditional: results include users regardless of their
 * messagePrivacy tier — that's enforced separately at conversation-creation
 * time (see findOrCreateConversation in conversations.ts), not here.
 */
export function searchUsersForMessaging(query: string, cursor: number = 0, limit: number = 20): Promise<MessagingUserSearchResponse> {
  return apiGet(`/api/users/search?q=${encodeURIComponent(query)}&cursor=${cursor}&limit=${limit}`);
}

/**
 * Matches POST /api/users/[userId]/follow exactly — currentUserId in the
 * body, target in the URL. Toggles: follows if not already following,
 * unfollows if already following (single endpoint, no separate unfollow
 * route) — response tells you which way it went.
 */
export function followUser(targetUserId: string, currentUserId: string): Promise<{ success: boolean; isFollowing: boolean; followersCount: number }> {
  return apiPost(`/api/users/${targetUserId}/follow`, { currentUserId });
}
