/**
 * Matches GET /api/users?enriched=1 exactly — the Network page's one and
 * only data source (confirmed: no separate section endpoints, no server-
 * side role/search/sort params are actually sent by the page despite the
 * route supporting them). Read directly from app/api/users/route.ts.
 */
export interface NetworkProfile {
  id: string;
  displayName: string;
  avatar: string | null;
  coverPhoto: string | null;
  role: 'individual' | 'designer' | 'tailor' | 'admin';
  gender: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  specialties: string[];
  yearsOfExperience: number | null;
  rating: number;
  reviewCount: number;
  /** Real signal — RatingStats.verifiedReviews > 0, same as Feed/Messaging/account menu. Added to the enriched endpoint's response alongside this type; not present before. */
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  availabilityStatus: 'available' | 'busy' | 'unavailable';
  priceRange: string | null;
  allowMessages: boolean;
  stylePreferences: string[];
  subscriptionTier: 'free' | 'pro' | 'business';
  proTags: string[] | null;
  createdAt: string;
}

/**
 * Confirmed via app/network/page.tsx + components/social/FollowersModal.tsx
 * (identical, duplicated in both places on web) — the only 3 roles that get
 * a real color; anything else (admin) falls back to gray. "individual" is
 * labeled "Members" only in the filter chip, not on the badge itself.
 */
export const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  designer: { bg: '#EDE9FE', text: '#6D28D9' },
  tailor: { bg: '#FEF3C7', text: '#A16207' },
  individual: { bg: '#D1FAE5', text: '#047857' },
};
export const ROLE_COLOR_FALLBACK = { bg: '#F3F4F6', text: '#4B5563' };

export const ROLE_FILTER_LABELS: Record<string, string> = {
  all: 'All',
  designer: 'Designers',
  tailor: 'Tailors',
  individual: 'Members',
};

export const NETWORK_CATEGORIES = [
  'Ankara', 'Wedding', 'Suits', 'Embroidery', 'Streetwear', 'Traditional',
  'Couture', 'Modest', 'Bridal', "Children's", "Men's", 'Alterations',
] as const;

export const NETWORK_EVENTS = [
  'Wedding', 'Corporate', 'Cultural', 'Party', 'Graduation', 'Black Tie', 'Religious', 'Casual',
] as const;

export type NetworkSort = 'recommended' | 'nearest' | 'top-rated' | 'most-followed' | 'newest';
