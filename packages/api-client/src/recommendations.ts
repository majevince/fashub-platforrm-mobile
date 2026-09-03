import { apiGet } from './http';
import type { SuggestedCreator } from '@fashub/types';

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
