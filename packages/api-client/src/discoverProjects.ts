import { apiGet } from './http';
import type { DiscoverProject, DiscoverSection, DiscoverSort } from '@fashub/types';

/** Matches GET /api/projects/discover exactly. */
export function discoverProjects(opts: {
  section?: DiscoverSection;
  category?: string;
  creatorType?: 'designer' | 'tailor';
  sort?: DiscoverSort;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ projects: DiscoverProject[]; total: number; limit: number; offset: number }> {
  const params = new URLSearchParams();
  if (opts.section) params.set('section', opts.section);
  if (opts.category) params.set('category', opts.category);
  if (opts.creatorType) params.set('creatorType', opts.creatorType);
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.search) params.set('search', opts.search);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.offset) params.set('offset', String(opts.offset));
  const qs = params.toString();
  return apiGet(`/api/projects/discover${qs ? `?${qs}` : ''}`);
}
