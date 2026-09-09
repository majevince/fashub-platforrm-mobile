import { apiGet } from './http';
import type { SuggestedCreator, RecommendedProjectsResponse } from '@fashub/types';

/** Matches GET /api/recommendations/designers — "Who to Follow" data source. */
export function getSuggestedCreators(
  userId: string,
  opts: { role?: 'designer' | 'tailor' | 'both'; limit?: number; excludeIds?: string[] } = {}
): Promise<{ recommendations: SuggestedCreator[]; total: number }> {
  const params = new URLSearchParams({ userId });
  if (opts.role) params.set('role', opts.role);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.excludeIds?.length) params.set('excludeIds', opts.excludeIds.join(','));
  return apiGet(`/api/recommendations/designers?${params.toString()}`);
}

/**
 * Matches GET /api/recommendations/projects exactly — the "For You" ranked
 * projects feed (marketplace-intent pipeline: content/intent/collaborative/
 * trending blend). userId omitted = anonymous, server falls back to
 * featured/trending. This is the Project tab's only path to that endpoint —
 * no direct fetch, mirroring how discoverProjects() is the only path to
 * /api/projects/discover.
 */
export function getRecommendedProjects(
  opts: { userId?: string; limit?: number; excludeIds?: string[] } = {}
): Promise<RecommendedProjectsResponse> {
  const params = new URLSearchParams({ mode: 'for_you' });
  if (opts.userId) params.set('userId', opts.userId);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.excludeIds?.length) params.set('excludeIds', opts.excludeIds.join(','));
  return apiGet(`/api/recommendations/projects?${params.toString()}`);
}
