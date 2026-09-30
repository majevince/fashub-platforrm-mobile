import type { PageAdminRole } from './pagePermissions';
import type { CoverPhotoPosition } from './profileDetail';

export type PageTier = 'standard' | 'creator_pro' | 'business_pro';
// The role type itself now lives in pagePermissions.ts (the 5-role set,
// migrated from an earlier 3-value one) — re-exported here so existing
// `import type { PageAdminRole } from '@fashub/types'` call sites don't
// need to change their import path.
export type { PageAdminRole };

/**
 * Set on a Post/Event when it was made "posting as" a Page — the Page is
 * that content's displayed identity everywhere (avatar/name/verified),
 * taking over from the personal author/organizer fields on the same record.
 * Matches web's PAGE_AUTHOR_SELECT shape (app/api/posts/route.ts and
 * app/api/events/route.ts) exactly.
 */
export interface PagePostAuthor {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  tier: PageTier;
  verified: boolean;
}

export interface PageAdminUser {
  id: string;
  role: PageAdminRole;
  /** Public-facing job title (e.g. "Master Tailor") — falls back to a readable version of `role` server-side when unset, so this is never blank. */
  title: string;
  user: { id: string; displayName: string; avatar?: string | null };
}

export interface PageDetail {
  id: string;
  name: string;
  handle: string;
  category?: string | null;
  kind?: string | null;
  bio?: string | null;
  avatar?: string | null;
  coverImage?: string | null;
  /** Same {x,y} 0-100 focal point as a personal profile's cover — set via
   * Settings > Edit page info's cover photo picker (POST
   * /api/pages/[handle]/cover-photo). Was missing from this type even
   * though the API always returns it (app/api/pages/[handle]/route.ts GET) —
   * added for the Settings-tab ticket's Edit-page-info screen. */
  coverImagePosition?: CoverPhotoPosition | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  additionalLocationsCount: number;
  foundedYear?: number | null;
  website?: string | null;
  tags: string[];
  tier: PageTier;
  verified: boolean;
  postCount: number;
  followerCount: number;
  adminCount: number;
  admins: PageAdminUser[];
}

export interface PageViewerState {
  isFollowing: boolean;
  isAdmin: boolean;
  role: PageAdminRole | null;
}

export interface PageResponse {
  page: PageDetail;
  viewer: PageViewerState;
}

/** One row per Page the current user administers — drawer list + drawer widget both read this same shape. */
export interface MyPageSummary {
  id: string;
  name: string;
  handle: string;
  avatar?: string | null;
  tier: PageTier;
  verified: boolean;
  myRole: PageAdminRole;
  followerCount: number;
  visitorCount: number;
}

/** A page the user follows but doesn't administer — no admin-only fields (myRole, visitorCount). */
export interface FollowedPageSummary {
  id: string;
  name: string;
  handle: string;
  avatar?: string | null;
  tier: PageTier;
  verified: boolean;
  followerCount: number;
}

export interface MyPagesResponse {
  pages: MyPageSummary[];
  followedPages: FollowedPageSummary[];
}

export interface PageStats {
  /** Real now — distinct PageView rows in the last 7 days (see fashub's countVisitorsThisWeek). Was null pre-Settings-tab ticket, before Page view tracking existed. */
  profileViews: number | null;
  profileViewsChangePct: number | null;
  newFollowersThisWeek: number;
  followerCount: number;
  /** Real now (Pro-tier metrics ticket) — (likes+interests on this week's posts) / (Page views this week) as a percent, same formula individual Creator Pro analytics uses. Null only when there were zero Page views this week (not enough data to compute a rate), not a permanent placeholder. */
  engagementRate: number | null;
  /** Locked "coming soon" card, per the reviewed mock — no ranking logic exists behind this. `unlocked` mirrors the Page's own tier (creator_pro/business_pro), same gate as the rest of Stats. */
  competitorRank: { unlocked: boolean };
}

/**
 * The Stats tab's deeper performance section — Page-scoped port of
 * CreatorAnalytics (app/pro/analytics's backend, /api/analytics/creator),
 * available to Pages on creator_pro/business_pro tier. Same window/prior-
 * window shape, scoped to this Page's own posts and organized events
 * instead of a user's. `topContent` merges posts and events, ranked by
 * engagement, unlike the personal engine's separate concept — a Page's
 * "content" is both.
 */
export interface PagePerformanceStats {
  window: { from: string; to: string; days: number };
  dailySeries: { date: string; label: string; postsPublished: number; likes: number; interests: number }[];
  periodKPIs: {
    posts: { value: number; delta: number };
    likes: { value: number; delta: number };
    interests: { value: number; delta: number };
  };
  overview: {
    profileViews: number;
    engagementRate: number;
    engagementRateDeltaPts: number;
    totalPosts: number;
    totalLikes: number;
    totalInterests: number;
    followers: number;
    // Business Pro-relevant — real (Event.organizerPageId), unlike
    // bookings/revenue/team/storefront which have no Page equivalent.
    totalEvents: number;
    upcomingEvents: number;
  };
  topContent: {
    id: string; title: string; thumbnail: string | null;
    likes: number; interests: number; contentType: 'post' | 'event'; url: string;
  }[];
}

/** Settings > Manage admins — a real follower, matched while searching who to add. */
export interface PageFollowerSearchResult {
  id: string; // userId
  displayName: string;
  avatar: string | null;
  headline: string | null;
}

/** Settings > Restricted members — one restricted user. */
export interface PageRestrictedMember {
  id: string; // PageRestriction id
  user: { id: string; displayName: string; avatar: string | null };
  restrictedBy: { id: string; displayName: string };
  createdAt: string;
}

/** Settings > Manage following — one Page this Page follows. */
export interface PageFollowedPageSummary {
  id: string; // PageFollowsPage id
  page: { id: string; name: string; handle: string; avatar: string | null; verified: boolean };
  createdAt: string;
}

/** Settings > Page inbox settings. */
export interface PageInboxSettings {
  notifyAllAdmins: boolean;
  requireAssignment: boolean;
}

export interface CreatePagePayload {
  name: string;
  handle: string;
  // Nullable (not just optional) on the optional fields: PATCH
  // /api/pages/[handle] treats an explicit `null` as "clear this field"
  // and `undefined`/omitted as "leave it alone" (see the route's
  // `!== undefined` checks) — Settings > Edit page info needs both.
  category?: string | null;
  kind?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  foundedYear?: number | null;
  website?: string | null;
  tags?: string[];
}
