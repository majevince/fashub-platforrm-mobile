import { apiPost } from './http';

/**
 * Matches POST /api/users/[userId]/follow exactly — currentUserId in the
 * body, target in the URL. Toggles: follows if not already following,
 * unfollows if already following (single endpoint, no separate unfollow
 * route) — response tells you which way it went.
 */
export function followUser(targetUserId: string, currentUserId: string): Promise<{ success: boolean; isFollowing: boolean; followersCount: number }> {
  return apiPost(`/api/users/${targetUserId}/follow`, { currentUserId });
}
