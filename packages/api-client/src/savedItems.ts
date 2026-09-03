import { apiGet, apiPost } from './http';
import type { SaveContentType, SavedItem } from '@fashub/types';

/** Matches GET /api/saved-items?userId=&type= exactly. */
export function getSavedItems(userId: string, type?: SaveContentType, opts: { page?: number; limit?: number } = {}): Promise<{ items: SavedItem[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams({ userId });
  if (type) params.set('type', type);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  return apiGet(`/api/saved-items?${params.toString()}`);
}

/** Matches POST /api/saved-items exactly — toggles save state, works for all 4 content types. */
export function toggleSavedItem(userId: string, contentId: string, contentType: SaveContentType): Promise<{ saved: boolean }> {
  return apiPost('/api/saved-items', { userId, contentId, contentType });
}
