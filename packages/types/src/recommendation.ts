/** Matches GET /api/recommendations/designers exactly. */
export interface SuggestedCreator {
  userId: string;
  displayName: string;
  avatar: string | null;
  subscriptionTier?: string;
  /** Real signal — RatingStats.verifiedReviews > 0, same as Feed/Network/Public Profile/comments/Project. */
  isVerified?: boolean;
  role: string;
  specialties: string[];
  country?: string;
  city?: string;
  rating: number;
  followerCount: number;
  reviewCount: number;
  bio?: string;
  priceRange?: string;
  coverImage: string | null;
  reason: string;
}
