import { apiGet, apiPost } from './http';
import type { Track, SoundPack, JamendoSearchError } from '@fashub/types';

/**
 * Matches GET /api/tracks exactly — the story music picker's search/browse
 * catalog. When `search` is set, Jamendo results are merged into the same
 * `tracks` array (id-prefixed `jamendo:<externalId>`, unpersisted until
 * selected via `materializeJamendoTrack`); `jamendoError` signals only a
 * Jamendo-side degradation, never a failure of the whole search.
 */
export function searchTracks(opts: { search?: string; genre?: string; mood?: string; sort?: 'trending' | 'newest'; limit?: number } = {}): Promise<{ tracks: Track[]; jamendoError?: JamendoSearchError }> {
  const params = new URLSearchParams();
  if (opts.search) params.set('search', opts.search);
  if (opts.genre) params.set('genre', opts.genre);
  if (opts.mood) params.set('mood', opts.mood);
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return apiGet(`/api/tracks${qs ? `?${qs}` : ''}`);
}

/** Matches POST /api/tracks/from-jamendo exactly — turns a search-result-only Jamendo track into a real, persisted Track row (re-fetched from Jamendo server-side, not trusting client-held metadata) so it can flow through the same trim/persist/playback path as any library track. Call this on selection, before entering the trim step. */
export function materializeJamendoTrack(externalId: string): Promise<{ track: Track }> {
  return apiPost('/api/tracks/from-jamendo', { externalId });
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
