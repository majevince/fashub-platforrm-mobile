/** Matches GET /api/tracks, /api/tracks/favorites, /api/tracks/recent exactly. */
export interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  moods: string[]; // free-form: 'chill' | 'upbeat' | 'runway' | 'studio' | 'street-style' | ...
  audioUrl: string;
  coverArtUrl: string | null;
  durationSeconds: number;
  usageCount: number;
  licensingTier: string;
  artistUserId?: string | null;
  favorited?: boolean;
  /** LRC-lite lyric lines — only present on the track embedded in a Story response (GET /api/stories), not in the search catalog (GET /api/tracks), which omits it. */
  lyrics?: string | null;
  /** Required attribution backlink for Jamendo-sourced tracks (licensingTier === 'jamendo') — Jamendo's ToS requires crediting the artist, crediting Jamendo, and backlinking to this URL wherever the track plays. */
  externalUrl?: string | null;
}

/** Matches GET /api/tracks exactly when a search term is present — Jamendo results are merged into the same `tracks` array (id-prefixed `jamendo:<externalId>`, unpersisted until selected), so this only ever signals a Jamendo-side degradation, not a hard failure of the whole search. */
export type JamendoSearchError = 'not_configured' | 'rate_limited' | 'unavailable' | null;

/** Real Track.moods values with catalog usage — matches web's MusicPicker MOOD_TABS minus 'trending' (a sort key, not a mood). */
export const TRACK_MOODS = ['runway', 'studio', 'street-style', 'chill', 'upbeat'] as const;
export type TrackMood = (typeof TRACK_MOODS)[number];

/** The story music picker's mood/sort tab strip exactly — 'trending' maps to GET /api/tracks?sort=trending, the rest to ?mood=<key>. */
export const TRACK_MOOD_TABS = [
  { key: 'trending', label: 'Trending' },
  { key: 'runway', label: 'Runway' },
  { key: 'studio', label: 'Studio' },
  { key: 'street-style', label: 'Street Style' },
  { key: 'chill', label: 'Chill' },
  { key: 'upbeat', label: 'Upbeat' },
] as const;
export type TrackMoodTab = (typeof TRACK_MOOD_TABS)[number]['key'];

/** Matches GET /api/sound-packs — curated track collections surfaced in the Browse tab. */
export interface SoundPack {
  id: string;
  name: string;
  type: string;
  season?: string | null;
  trackIds: string[];
  community?: { id: string; name: string; avatar: string | null } | null;
}
