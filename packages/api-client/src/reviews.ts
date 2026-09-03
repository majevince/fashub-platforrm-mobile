import { apiGet, apiPost } from './http';
import type { Review, CreateReviewPayload } from '@fashub/types';

/** Matches GET /api/reviews exactly. */
export function getReviews(userId: string, opts: { limit?: number; offset?: number; sortBy?: 'recent' | 'rating' | 'helpful' } = {}): Promise<{ reviews: Review[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }> {
  const params = new URLSearchParams({ userId });
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.offset) params.set('offset', String(opts.offset));
  if (opts.sortBy) params.set('sortBy', opts.sortBy);
  return apiGet(`/api/reviews?${params.toString()}`);
}

/** Matches POST /api/reviews exactly — required: reviewerId, reviewerName, revieweeId, comment, and all 5 rating components. */
export function createReview(payload: CreateReviewPayload): Promise<{ review: Review }> {
  return apiPost('/api/reviews', payload);
}
