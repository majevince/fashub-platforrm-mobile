import { apiGet } from './http';
import type { CreatorAnalytics, ProjectAnalyticsSummary } from '@fashub/types';

/**
 * Matches GET /api/analytics/creator?userId= exactly. Server 403s for
 * non-Pro/Business users — callers should catch ApiError and check
 * `err.status === 403` to distinguish "not eligible" from a real failure.
 */
export function getCreatorAnalytics(userId: string): Promise<CreatorAnalytics> {
  return apiGet(`/api/analytics/creator?userId=${encodeURIComponent(userId)}`);
}

/**
 * Matches GET /api/analytics/projects?userId= (summary mode) exactly —
 * same server-side Pro gate as getCreatorAnalytics above.
 */
export function getProjectAnalyticsSummary(userId: string): Promise<ProjectAnalyticsSummary> {
  return apiGet<ProjectAnalyticsSummary>(`/api/analytics/projects?userId=${encodeURIComponent(userId)}`);
}
