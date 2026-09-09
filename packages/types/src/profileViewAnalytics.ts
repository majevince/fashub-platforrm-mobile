/** Matches GET /api/users/[userId]/profile-views/analytics exactly. Creator
 * Pro only, server-gated — see that route's own comment. */
export interface ProfileViewAnalytics {
  totalViews: number;
  timeSeries: { date: string; count: number }[];
  locationBreakdown: { label: string; count: number }[];
  platformBreakdown: { platform: string; count: number }[];
  /** One vote per unique visitor (not per view) — see the route's own comment. */
  visitorTypeBreakdown: { role: string; count: number }[];
  /** "new" = exactly one view in the 90-day window, "returning" = 2+. */
  newVsReturning: { new: number; returning: number };
  /** 24 hourly buckets (UTC — viewers can be in any timezone, so this is a real but coarse "peak UTC hour", not a per-viewer-local-time figure). */
  peakActivity: { hour: number; count: number }[];
  visitors: {
    viewedAt: string;
    role: string;
    anonymized: boolean;
    displayName: string | null;
    avatar: string | null;
  }[];
}
