/**
 * Matches POST /api/search/match exactly (app/api/search/match/route.ts,
 * read directly from source) — the "Professionals" matching/discovery
 * feature. Match percentage, badges, and "why this match" reasons are all
 * computed server-side in that route's scoreProfile() function and returned
 * as-is; nothing here is recomputed client-side.
 */

export type ProfessionalType = 'designer' | 'tailor' | 'all';
export type GenderFocusFilter = 'men' | 'women' | 'unisex' | 'children' | 'all';
export type SkillLevel = 'any' | 'alterations' | 'skilled' | 'couture';
export type DeliveryModeFilter = 'in-person' | 'remote' | 'both' | 'any';
export type Timeline = 'asap' | '2-weeks' | '1-month' | '1-3-months' | '3-months-plus';
export type SortBy = 'best-match' | 'highest-rated' | 'most-experienced' | 'closest' | 'budget-friendly';

export type Badge =
  | 'best-match'
  | 'top-rated'
  | 'trending'
  | 'fast-delivery'
  | 'verified'
  | 'budget-friendly'
  | 'highly-experienced'
  | 'high-satisfaction'
  | 'studio-pro'
  | 'creator-pro';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
}

/** The base profile shape scoreProfile() enriches — matches types/location.ts's DesignerTailorProfile. */
export interface DesignerTailorProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'designer' | 'tailor';
  location: GeoLocation;
  avatar?: string | null;
  bio?: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  priceRange: 'budget' | 'moderate' | 'premium' | 'luxury';
  availability: boolean;
  portfolioImages?: string[];
  distance?: number;
  verified?: boolean;
  subscriptionTier?: string;
  yearsExperience?: number;
  completedJobs?: number;
  responseTime?: string;
  languages?: string[];
  genderFocus?: ('men' | 'women' | 'unisex' | 'children')[];
  occasions?: string[];
  fabricTypes?: string[];
  deliveryMode?: ('in-person' | 'remote' | 'both')[];
  currency?: string;
  priceMin?: number;
  priceMax?: number;
  satisfactionRate?: number;
  repeatClientRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MatchedProfessional extends DesignerTailorProfile {
  matchScore: number;
  matchReasons: string[];
  badges: Badge[];
  estimatedTimeline: string;
  convertedPriceMin?: number;
  convertedPriceMax?: number;
  displayCurrency?: string;
}

export interface MatchRequest {
  query?: string;
  description?: string;
  categories: string[];
  gender?: GenderFocusFilter;
  occasion?: string;
  fabricType?: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  professionalType: ProfessionalType;
  skillLevel: SkillLevel;
  minRating: number;
  minExperience: number;
  deliveryMode: DeliveryModeFilter;
  timeline: Timeline;
  latitude: number;
  longitude: number;
  radius: number;
  country?: string;
  sortBy: SortBy;
  page: number;
  limit: number;
}

// ── Filter option lists — matches app/search/page.tsx's real, hardcoded
// arrays exactly (confirmed not a dynamic taxonomy on web either — pulling
// from a "real API" would be inventing a data source web itself doesn't
// have). Category dot colors are a decorative, pre-existing multi-color
// cycle (not the primary-CTA gradient), kept as-is per that distinction.
export const MATCH_CATEGORIES: { id: string; label: string }[] = [
  { id: 'wedding-gown', label: 'Wedding Gown' },
  { id: 'ankara', label: 'Ankara / African' },
  { id: 'agbada', label: 'Agbada / Native' },
  { id: 'mens-suit', label: "Men's Suit" },
  { id: 'embroidery', label: 'Embroidery' },
  { id: 'streetwear', label: 'Streetwear' },
  { id: 'traditional', label: 'Traditional' },
  { id: 'formal', label: 'Formal / Evening' },
  { id: 'bridal-party', label: 'Bridal Party' },
  { id: 'childrens-wear', label: "Children's Wear" },
  { id: 'alterations', label: 'Alterations' },
  { id: 'custom-design', label: 'Custom Design' },
  { id: 'modest-fashion', label: 'Modest Fashion' },
  { id: 'sustainable', label: 'Sustainable' },
  { id: 'couture', label: 'Haute Couture' },
];

export const CATEGORY_DOT_COLORS = ['#6D28D9', '#DB2777', '#B45309', '#15803D', '#7A2E4D', '#9C8A8E'] as const;

export const MATCH_GENDERS: { id: GenderFocusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'women', label: 'Women' },
  { id: 'men', label: 'Men' },
  { id: 'unisex', label: 'Unisex' },
  { id: 'children', label: 'Children' },
];

export const MATCH_OCCASIONS: { id: string; label: string }[] = [
  { id: '', label: 'Any Occasion' },
  { id: 'wedding', label: 'Wedding' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'casual', label: 'Casual' },
  { id: 'traditional', label: 'Traditional / Cultural' },
  { id: 'party', label: 'Party / Festival' },
  { id: 'formal', label: 'Formal / Black Tie' },
  { id: 'religious', label: 'Religious' },
];

export const MATCH_FABRICS: { id: string; label: string }[] = [
  { id: '', label: 'Any Fabric' },
  { id: 'ankara', label: 'Ankara / Wax Print' },
  { id: 'silk', label: 'Silk' },
  { id: 'lace', label: 'Lace' },
  { id: 'cotton', label: 'Cotton' },
  { id: 'linen', label: 'Linen' },
  { id: 'satin', label: 'Satin' },
  { id: 'velvet', label: 'Velvet' },
  { id: 'chiffon', label: 'Chiffon' },
  { id: 'denim', label: 'Denim' },
  { id: 'wool', label: 'Wool' },
  { id: 'kente', label: 'Kente' },
  { id: 'aso-oke', label: 'Aso-Oke' },
];

export const MATCH_DELIVERY_MODES: { id: DeliveryModeFilter; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 'in-person', label: 'In-Person' },
  { id: 'remote', label: 'Remote' },
  { id: 'both', label: 'Both' },
];

export const MATCH_COUNTRIES: { id: string; label: string }[] = [
  { id: '', label: 'Worldwide' },
  { id: 'NG', label: 'Nigeria' },
  { id: 'US', label: 'United States' },
  { id: 'GB', label: 'United Kingdom' },
  { id: 'GH', label: 'Ghana' },
  { id: 'IN', label: 'India' },
  { id: 'AE', label: 'United Arab Emirates' },
  { id: 'JP', label: 'Japan' },
  { id: 'KR', label: 'South Korea' },
  { id: 'KE', label: 'Kenya' },
  { id: 'ZA', label: 'South Africa' },
  { id: 'FR', label: 'France' },
  { id: 'IT', label: 'Italy' },
];

export const MATCH_TIMELINES: { id: Timeline; label: string }[] = [
  { id: 'asap', label: 'ASAP (under 1 week)' },
  { id: '2-weeks', label: '1–2 weeks' },
  { id: '1-month', label: 'About 1 month' },
  { id: '1-3-months', label: '1–3 months' },
  { id: '3-months-plus', label: '3 months or more' },
];

export const MATCH_MIN_EXPERIENCE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Any experience' },
  { value: 2, label: '2+ years' },
  { value: 5, label: '5+ years' },
  { value: 10, label: '10+ years' },
  { value: 15, label: '15+ years' },
];

export const MATCH_MIN_RATING_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Any' },
  { value: 3, label: '3+' },
  { value: 3.5, label: '3.5+' },
  { value: 4, label: '4+' },
  { value: 4.5, label: '4.5+' },
];

export const MATCH_SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: 'best-match', label: 'Best Match' },
  { id: 'highest-rated', label: 'Highest Rated' },
  { id: 'most-experienced', label: 'Most Experienced' },
  { id: 'closest', label: 'Nearest to You' },
  { id: 'budget-friendly', label: 'Budget Friendly' },
];

/**
 * Matches web's BADGE_CONFIG exactly (MatchResultCard.tsx) — label + bg/fg
 * color pair per badge. `bg`/`fg` are violetColors token key names (plain
 * strings here to avoid this package depending on @fashub/design-tokens —
 * the consuming component looks them up), except the two literal exceptions
 * noted, matching web's own two non-token-pair badges exactly.
 */
export const BADGE_DISPLAY: Record<Badge, { label: string; bg: string; fg: string }> = {
  'best-match': { label: 'Best Match', bg: 'primarySoft', fg: 'primaryDeep' },
  'top-rated': { label: 'Top Rated', bg: 'amberSoft', fg: 'amber' },
  trending: { label: 'Trending', bg: 'pinkSoft', fg: 'pink' },
  'fast-delivery': { label: 'Available Now', bg: 'greenSoft', fg: 'green' },
  verified: { label: 'Verified', bg: 'primarySoft', fg: 'primaryDeep' },
  'budget-friendly': { label: 'Budget Friendly', bg: 'amberSoft', fg: 'amber' },
  'highly-experienced': { label: 'Highly Experienced', bg: 'primarySoft', fg: 'primary' },
  'high-satisfaction': { label: 'High Satisfaction', bg: 'greenSoft', fg: 'green' },
  'studio-pro': { label: 'Studio Pro', bg: 'ink', fg: 'amberSoft' }, // web: bg T.ink (not a *Soft token) — literal exception, matches source
  'creator-pro': { label: 'Creator Pro', bg: 'primaryDeep', fg: '#fff' }, // web: fg #fff literal — matches source
};

export const BADGE_PRIORITY: Badge[] = [
  'best-match',
  'studio-pro',
  'creator-pro',
  'verified',
  'top-rated',
  'high-satisfaction',
  'highly-experienced',
  'trending',
  'fast-delivery',
  'budget-friendly',
];

export interface MatchResponse {
  professionals: MatchedProfessional[];
  total: number;
  page: number;
  totalPages: number;
  topPick: MatchedProfessional | null;
  query: {
    categories: string[];
    description: string;
    location: { latitude: number; longitude: number };
    radius: number;
    country?: string;
  };
  filters: {
    availableCountries: string[];
    availableSpecialties: string[];
    priceRange: { min: number; max: number; currency: string };
  };
}
