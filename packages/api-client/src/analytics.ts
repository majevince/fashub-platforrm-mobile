import { apiGet } from './http';
import type { CreatorAnalytics } from '@fashub/types';

/**
 * Matches GET /api/analytics/creator?userId= exactly. Server 403s for
 * non-Pro/Business users — callers should catch ApiError and check
 * `err.status === 403` to distinguish "not eligible" from a real failure.
 */
export function getCreatorAnalytics(userId: string): Promise<CreatorAnalytics> {
  return apiGet(`/api/analytics/creator?userId=${encodeURIComponent(userId)}`);
}
