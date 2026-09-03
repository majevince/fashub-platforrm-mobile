/** Matches GET /api/portfolio/projects exactly (app/api/portfolio/projects/route.ts). */
export interface PortfolioProject {
  id: string;
  designerId?: string | null;
  tailorId?: string | null;
  title: string;
  summary?: string | null;
  description?: string | null;
  category?: string | null;
  tags: string[];
  clientType?: string | null;
  coverImage?: string | null;
  images: string[];
  videos?: string[];
  visibility: 'public' | 'private';
  isFeatured: boolean;
  isPinned: boolean;
  sortOrder: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Matches GET /api/portfolio/projects/[projectId] exactly. Same base fields
 * as PortfolioProject, plus the owner join (added specifically so mobile's
 * Project Detail screen can render the owner-contact panel from a single
 * fetch — the discover/list endpoint already returned this exact `creator`
 * shape, this one previously didn't).
 */
export interface PortfolioProjectDetail extends PortfolioProject {
  creator: {
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
  } | null;
}
