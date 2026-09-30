import { apiGet } from './http';
import type { SearchAllResponse, SearchCategory } from '@fashub/types';

/**
 * Mobile search-parity ticket — matches GET /api/search exactly, the same
 * endpoint fashub web's header search bar (components/layout/
 * HeaderSearch.tsx) and full /search-results page both call. One data
 * source for both platforms, not a mobile-only reimplementation.
 *
 * `category: 'all'` (default) returns a 5-result preview + real total per
 * category — the type-ahead mode. A specific category returns a
 * cursor-paginated full list for that type alone (`cursor`/`limit`).
 */
export function searchAll(
  q: string,
  category: SearchCategory = 'all',
  opts: { cursor?: number; limit?: number } = {}
): Promise<SearchAllResponse> {
  const params = new URLSearchParams({ q, category });
  if (opts.cursor != null) params.set('cursor', String(opts.cursor));
  if (opts.limit != null) params.set('limit', String(opts.limit));
  return apiGet<SearchAllResponse>(`/api/search?${params.toString()}`);
}
