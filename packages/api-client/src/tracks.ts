import { apiGet, apiPost } from './http';
import type { Track, SoundPack } from '@fashub/types';

/** Matches GET /api/tracks exactly — the story music picker's search/browse catalog. */
export function searchTracks(opts: { search?: string; genre?: string; mood?: string; sort?: 'trending' | 'newest'; limit?: number } = {}): Promise<{ tracks: Track[] }> {
  const params = new URLSearchParams();
  if (opts.search) params.set('search', opts.search);
  if (opts.genre) params.set('genre', opts.genre);
  if (opts.mood) params.set('mood', opts.mood);
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return apiGet(`/api/tracks${qs ? `?${qs}` : ''}`);
}

/** Matches GET /api/tracks/favorites exactly. */
export function getFavoriteTracks(): Promise<{ tracks: Track[] }> {
  return apiGet('/api/tracks/favorites');
}

/** Matches GET /api/tracks/recent exactly — tracks used in the caller's own past stories. */
export function getRecentTracks(): Promise<{ tracks: Track[] }> {
  return apiGet('/api/tracks/recent');
}

/** Matches POST /api/tracks/[id]/favorite exactly — toggle. */
export function toggleTrackFavorite(id: string): Promise<{ favorited: boolean }> {
  return apiPost(`/api/tracks/${id}/favorite`, {});
}

/** Matches GET /api/sound-packs?type= exactly — curated Runway/brand sound packs shown in Browse. */
export function getSoundPacks(type: 'runway' | 'brand'): Promise<{ packs: SoundPack[] }> {
  return apiGet(`/api/sound-packs?type=${type}`);
}
