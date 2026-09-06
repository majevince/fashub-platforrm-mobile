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

/**
 * Matches POST /api/users/[userId]/follow exactly — currentUserId in the
 * body, target in the URL. Toggles: follows if not already following,
 * unfollows if already following (single endpoint, no separate unfollow
 * route) — response tells you which way it went.
 */
export function followUser(targetUserId: string, currentUserId: string): Promise<{ success: boolean; isFollowing: boolean; followersCount: number }> {
  return apiPost(`/api/users/${targetUserId}/follow`, { currentUserId });
}
