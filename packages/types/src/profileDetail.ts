/**
 * Matches GET /api/users/[userId]'s response shape — read directly from
 * app/api/users/[userId]/route.ts. The nested *Profile objects mirror the
 * Prisma models' commonly-meaningful fields (bio/contact/location/social/
 * portfolio/pricing/services/availability/certifications) — not every
 * single DB column, which would be excessive for a mobile "My Profile"
 * view; extend as later screens need more.
 */
export interface LocationFields {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  province?: string | null;
  district?: string | null;
  postalCode?: string | null;
  country?: string | null;
  countryCode?: string | null;
}

/** Matches the fixed boolean service-type flags on DesignerProfile/TailorProfile
 * exactly — web has no itemized services model (no name/category/description/
 * duration/images per service), just these role-specific toggles plus a
 * free-text tag list. Each role's screen only reads/writes its own subset. */
export interface ServiceFields {
  // Designer
  customDesign?: boolean;
  consulting?: boolean;
  onlineOrders?: boolean;
  inPersonConsultation?: boolean;
  // Tailor
  repairs?: boolean;
  customTailoring?: boolean;
  urgentService?: boolean;
  pickupDelivery?: boolean;
  // Shared
  alterations?: boolean;
  customServices?: string[];
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type WorkingHours = Partial<Record<DayOfWeek, { open: string; close: string } | null>>;

export interface SocialMediaFields {
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  website?: string | null;
}

export interface IndividualProfileDetail extends LocationFields, SocialMediaFields {
  bio?: string | null;
  phone?: string | null;
  stylePreferences?: string[];
  favoriteColors?: string[];
  preferredPriceRange?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** String[] of user IDs — real columns on the role-specific profile table, confirmed via prisma/schema.prisma (not on the base User model). */
  followers?: string[];
  following?: string[];
}

export interface ProfessionalProfileDetail extends LocationFields, SocialMediaFields, ServiceFields {
  bio?: string | null;
  phone?: string | null;
  businessName?: string | null;
  specialties?: string[];
  yearsOfExperience?: number | null;
  portfolioImages?: string[];
  featuredImages?: string[];
  priceRange?: string | null;
  minimumOrder?: number | null;
  currency?: string | null;
  /** Designer only. Renders on web's Pricing tab but is never actually
   * persisted there — mobile fixes that (see the settings_parity_fields
   * migration and app/api/users/[userId]/route.ts). */
  consultationFee?: number | null;
  /** Tailor only — same "editable but never saved on web" fix as consultationFee. */
  fittingFee?: number | null;
  rushOrderFee?: number | null;
  availabilityStatus?: 'available' | 'busy' | 'unavailable' | null;
  /** Designer's "time until delivery" field. Tailor's equivalent is turnaroundTime. */
  leadTime?: string | null;
  turnaroundTime?: string | null;
  workingHours?: WorkingHours | null;
  /** Designer only. Same "editable but never saved on web" fix as consultationFee. */
  maxActiveProjects?: number | null;
  certifications?: string[];
  /** Designer only — no `awards` column exists on TailorProfile. */
  awards?: string[];
  totalOrders?: number;
  completedOrders?: number;
  latitude?: number | null;
  longitude?: number | null;
  allowReviews?: boolean;
  allowMessages?: boolean;
  /** String[] of user IDs — real columns on the role-specific profile table, confirmed via prisma/schema.prisma (not on the base User model). */
  followers?: string[];
  following?: string[];
  /** Designer/Tailor only — real tracked counters (Prisma's own "Creator Pro
   * Fields"/"Stats" columns), not new counters invented for the mobile menu's
   * stats strip. Individual profiles have neither column. */
  profileViews?: number;
  followerCount?: number;
}

export interface RatingStatsSummary {
  averageRating: number;
  totalReviews: number;
  verifiedReviews?: number;
  componentRatings?: { quality: number; service: number; value: number; timeliness: number; communication: number };
  distribution?: { stars: number; count: number; percentage: number }[];
  recommendationRate?: number;
}

/** Matches the privacySettings object GET /api/users/[userId] injects into its response. */
export interface ProfilePrivacySettings {
  profileVisibility?: 'public' | 'private' | 'professionals' | 'connections';
  showEmail?: boolean;
  showPhone?: boolean;
  showLocation?: boolean;
  showSocialMedia?: boolean;
  allowMessages?: boolean;
  allowReviews?: boolean;
  showOnlineStatus?: boolean;
  showActivity?: boolean;
  showConnections?: boolean;
  showPortfolio?: boolean;
  showPricing?: boolean;
  showStats?: boolean;
  showProjects?: boolean;
  showBadges?: boolean;
}

export interface CoverPhotoPosition {
  x: number;
  y: number;
}

export interface ProfileDetail {
  id: string;
  email?: string;
  displayName: string;
  avatar?: string | null;
  coverPhoto?: string | null;
  /** Non-destructive focal point for the fixed-aspect cover crop, matching
   * web exactly (same shared User.coverPhotoPosition column) — percentages
   * 0-100, never a pixel crop, so the original upload is never discarded. */
  coverPhotoPosition?: CoverPhotoPosition | null;
  role: string;
  subscriptionTier?: string | null;
  createdAt: string;
  individualProfile?: IndividualProfileDetail | null;
  designerProfile?: ProfessionalProfileDetail | null;
  tailorProfile?: ProfessionalProfileDetail | null;
  ratingStats?: RatingStatsSummary | null;
  isVerified?: boolean;
  privacySettings?: ProfilePrivacySettings;
  /** Portfolio project count — Designer/Tailor only (0 for Individual, which
   * has no PortfolioProject relation). Top-level since which nested
   * *Profile object exists varies by role. */
  projectCount?: number;
  /** Real, deduplicated profile-view count — a Creator Pro analytics
   * feature. Server-gated (app/api/users/[userId]): only ever non-null
   * when this response is for the caller's OWN profile AND that account
   * is pro/business — null means "not visible to you", never "zero
   * views" (which is a real possible value too). */
  profileViewCount?: number | null;
}

export type UpdateProfilePayload = {
  displayName?: string;
  avatar?: string;
  coverPhoto?: string;
  coverPhotoPosition?: CoverPhotoPosition;
  role: string;
  profileData?: Record<string, unknown>;
};
