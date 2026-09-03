import { apiGet } from './http';
import type { TrendingTag } from '@fashub/types';

/** Matches GET /api/trending — live aggregation off real Post.tags, no separate table involved. */
export function getTrending(opts: { limit?: number; countryCode?: string } = {}): Promise<{ data: TrendingTag[] }> {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.countryCode) params.set('countryCode', opts.countryCode);
  const qs = params.toString();
  return apiGet(`/api/trending${qs ? `?${qs}` : ''}`);
}
