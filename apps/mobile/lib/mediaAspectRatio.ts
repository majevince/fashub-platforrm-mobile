/**
 * Instagram/Facebook-style bounds — a single ultra-tall portrait or
 * ultra-wide landscape photo gets clamped rather than rendered edge-to-edge,
 * so one outlier post can't break feed/detail-screen rhythm. Shared between
 * the feed card (components/feed/PostCard.tsx) and the full-screen post
 * detail (app/post/[id].tsx), which has its own separate gallery
 * implementation rather than reusing the card's.
 */
export const MIN_ASPECT_RATIO = 0.8; // 4:5 portrait ceiling
export const MAX_ASPECT_RATIO = 1.91; // landscape ceiling
export const DEFAULT_ASPECT_RATIO = 1.2; // pre-measurement fallback

export function clampAspectRatio(ratio: number): number {
  return Math.min(MAX_ASPECT_RATIO, Math.max(MIN_ASPECT_RATIO, ratio));
}
