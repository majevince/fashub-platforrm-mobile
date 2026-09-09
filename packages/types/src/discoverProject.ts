/** Matches GET /api/projects/discover exactly. */
export interface DiscoverProjectCreator {
  userId: string;
  displayName: string;
  avatar?: string | null;
  isPro: boolean;
  subscriptionTier?: string;
  /** Real signal — RatingStats.verifiedReviews > 0, same as Feed/Network/Public Profile/comments. Not the same thing as isPro. */
  isVerified: boolean;
  role: 'designer' | 'tailor';
  businessName?: string | null;
  city?: string | null;
  country?: string | null;
  rating?: number | null;
  projectCount: number;
}

export interface DiscoverProject {
  id: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  tags: string[];
  coverImage?: string | null;
  images: string[];
  isFeatured: boolean;
  isPinned: boolean;
  viewCount: number;
  createdAt: string;
  creator: DiscoverProjectCreator | null;
}

export type DiscoverSection = 'featured' | 'trending' | 'editors' | 'rising' | 'all';
export type DiscoverSort = 'popular' | 'recent' | 'featured';

/** Matches GET /api/recommendations/projects exactly — same shape as DiscoverProject plus the recommendation-specific fields. */
export interface RecommendedProject extends DiscoverProject {
  /** Human-readable context label, e.g. "Because you liked Bridal Design". */
  reason: string;
  /** Final blended ranking score (0–1) — absent on the anonymous fallback path. */
  score?: number;
}

export interface RecommendedProjectsResponse {
  recommendations: RecommendedProject[];
  total: number;
}

export const PROJECT_CATEGORIES = [
  'Fashion Design', 'Tailoring', 'Bridal', 'Custom Suits', 'Streetwear',
  'Formal Wear', 'Editorial', 'Traditional', 'Alterations', 'Casual',
] as const;
