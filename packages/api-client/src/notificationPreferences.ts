import { apiGet, apiPut } from './http';
import type { NotificationPreferences } from '@fashub/types';

/** Matches GET /api/notification-preferences/[userId] exactly. Server auto-creates a default row if none exists. */
export function getNotificationPreferences(userId: string): Promise<{ success: boolean; preferences: NotificationPreferences }> {
  return apiGet(`/api/notification-preferences/${userId}`);
}

/** Matches PUT /api/notification-preferences/[userId] exactly — a whole-record overwrite, not a partial patch (matches web's own save call). */
export function updateNotificationPreferences(userId: string, preferences: NotificationPreferences): Promise<{ success: boolean; preferences: NotificationPreferences }> {
  return apiPut(`/api/notification-preferences/${userId}`, preferences);
}
