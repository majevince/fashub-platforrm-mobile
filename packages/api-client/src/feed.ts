import { apiGet } from './http';
import type { FeedResponse, FeedFilter } from '@fashub/types';

/** Matches GET /api/feed exactly (app/api/feed/route.ts): userId is required, not inferred from the auth token. */
export function getFeed(
  userId: string,
  opts: { cursor?: string; limit?: number; filter?: FeedFilter } = {}
): Promise<FeedResponse> {
  const params = new URLSearchParams({ userId });
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.filter) params.set('filter', opts.filter);
  return apiGet<FeedResponse>(`/api/feed?${params.toString()}`);
}
