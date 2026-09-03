import { apiGet, apiPatch } from './http';
import type { ProfileDetail, UpdateProfilePayload, RatingStatsSummary, AppNotification } from '@fashub/types';

/** Matches GET /api/users/[userId]?viewerId= exactly. Pass viewerId === userId for the caller's own profile to get the unrestricted shape. */
export function getUserProfile(userId: string, viewerId?: string): Promise<ProfileDetail> {
  return apiGet(`/api/users/${userId}${viewerId ? `?viewerId=${viewerId}` : ''}`);
}

/** Matches PATCH /api/users/[userId] exactly. */
export function updateUserProfile(userId: string, payload: UpdateProfilePayload): Promise<{ message: string; user: ProfileDetail }> {
  return apiPatch(`/api/users/${userId}`, payload);
}

/** Matches GET /api/ratings/[userId] exactly (full shape has componentRatings/distribution too; this is the summary most screens need). */
export function getRatingStats(userId: string): Promise<RatingStatsSummary & { componentRatings?: Record<string, number>; distribution?: { stars: number; count: number; percentage: number }[] }> {
  return apiGet(`/api/ratings/${userId}`);
}

/** Matches GET /api/notifications/[userId] exactly. */
export function getNotifications(userId: string, opts: { limit?: number; unreadOnly?: boolean } = {}): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.unreadOnly) params.set('unreadOnly', 'true');
  const qs = params.toString();
  return apiGet(`/api/notifications/${userId}${qs ? `?${qs}` : ''}`);
}

/** Matches PATCH /api/notifications/[userId] exactly. */
export function markNotificationRead(userId: string, opts: { notificationId?: string; markAllAsRead?: boolean }): Promise<{ success: boolean }> {
  return apiPatch(`/api/notifications/${userId}`, opts);
}
