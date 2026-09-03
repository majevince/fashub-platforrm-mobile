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
}

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
