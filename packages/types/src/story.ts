import type { Track } from './track';

/** Matches GET /api/stories exactly (app/api/stories/route.ts) — grouped by author, unseen-first. */
export interface Story {
  id: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  seen: boolean;
  viewCount: number;
  reactionCount: number;
  reactedByMe: boolean;
  displayDurationMs: number | null;
  // ── Music (optional) — matches Story model's music fields exactly ──
  track: Track | null;
  trackTrimStart: number | null;
  trackTrimEnd: number | null;
  trackVolume: number | null;
  originalAudioVolume: number | null;
  stickerStyle: string | null; // 'pill' | 'card' | 'lyric'
  stickerTransform: { x: number; y: number; rotation?: number; scale?: number } | null;
}

export interface StoryGroup {
  author: {
    id: string;
    displayName: string;
    avatar: string | null;
    role: string;
    isFollowing: boolean;
    /** 'everyone' | 'followers' | 'off' — the author's privacy setting, gates reactions and replies (see lib/stories/permissions.ts's canInteractWithStory). */
    allowReplies: string;
  };
  hasUnseen: boolean;
  stories: Story[];
}

/**
 * Matches POST /api/stories's fields exactly (app/api/stories/route.ts)
 * — mediaUrl must already be a real, uploaded path (see uploadFiles with
 * type: 'stories'). Music fields are all optional; omit entirely for a
 * plain photo/video story.
 */
export interface CreateStoryPayload {
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  trackId?: string;
  trackTrimStart?: number;
  trackTrimEnd?: number;
  trackVolume?: number;
  originalAudioVolume?: number;
  stickerStyle?: 'pill' | 'card' | 'lyric';
  stickerTransform?: { x: number; y: number; rotation?: number; scale?: number };
  displayDurationMs?: number;
}

/** Matches GET /api/stories/settings exactly (app/api/stories/settings/route.ts). */
export interface StoryPrivacyPerson {
  id: string;
  name: string;
  avatar: string | null;
  isCloseFriend: boolean;
  isHidden: boolean;
}

export interface StoryPrivacySettings {
  allowReplies: 'everyone' | 'followers' | 'off';
  closeFriendsOnly: boolean;
  hiddenFromUserIds: string[];
  people: StoryPrivacyPerson[];
}

/** Matches GET /api/stories/[id]/viewers exactly — owner-only. */
export interface StoryViewerEntry {
  id: string;
  displayName: string;
  avatar: string | null;
  role: string;
  viewedAt: string;
  liked: boolean;
}
