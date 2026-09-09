/**
 * Matches GET /api/analytics/creator?userId= exactly
 * (app/api/analytics/creator/route.ts) — real Prisma-backed data, no mock
 * fields. Server 403s if the user's subscriptionTier isn't 'pro' or
 * 'business'; callers should treat a 403 as "not eligible", not an error.
 */
export interface CreatorAnalyticsDaily {
  date: string;
  label: string;
  postsPublished: number;
  likes: number;
  interests: number;
}

export interface CreatorAnalyticsTopItem {
  id: string;
  title: string;
  thumbnail: string | null;
  likes: number;
  interests: number;
  contentType: 'post' | 'event';
  url: string;
}

export interface CreatorAnalytics {
  window: { from: string; to: string; days: number };
  dailySeries: CreatorAnalyticsDaily[];
  periodKPIs: {
    posts: { value: number; delta: number };
    likes: { value: number; delta: number };
    interests: { value: number; delta: number };
  };
  overview: {
    profileViews: number;
    portfolioSaves: number;
    inquiries: number;
    /** Real (post likes+interests)/profile-views for the current window — replaced a dead DesignerProfile/TailorProfile column that nothing ever wrote to. */
    engagementRate: number;
    /** Percentage-point change vs. the prior window, same length. */
    engagementRateDeltaPts: number;
    totalPosts: number;
    totalLikes: number;
    totalInterests: number;
    rating: number;
    reviewCount: number;
    followers: number;
  };
  topPosts: CreatorAnalyticsTopItem[];
  proUpgradedAt: string | null;
}
