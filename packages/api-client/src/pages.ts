import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from './http';
import { API_BASE_URL } from './config';
import { getCurrentToken, notifyUnauthorized } from './session';
import type { UploadableFile } from './upload';
import type {
  PageResponse, MyPagesResponse, PageStats, CreatePagePayload, PageDetail,
  PageAdminUser, PageAdminRole, PageFollowerSearchResult, ProfileViewAnalytics,
  PageRestrictedMember, PageFollowedPageSummary, PageInboxSettings, PagePerformanceStats,
  RatingStatsSummary,
} from '@fashub/types';

/** Matches app/api/pages/[handle]/route.ts GET — public, no auth required (viewer flags come back null-ish if unauthenticated). */
export function getPage(handle: string): Promise<PageResponse> {
  return apiGet<PageResponse>(`/api/pages/${encodeURIComponent(handle)}`);
}

/** Matches app/api/pages/route.ts POST — server re-checks the designer/tailor gate, this isn't just a client-side restriction. */
export function createPage(payload: CreatePagePayload): Promise<{ page: PageDetail }> {
  return apiPost<{ page: PageDetail }>('/api/pages', payload);
}

export function updatePage(handle: string, payload: Partial<CreatePagePayload>): Promise<{ page: PageDetail }> {
  return apiPatch<{ page: PageDetail }>(`/api/pages/${encodeURIComponent(handle)}`, payload);
}

/** Matches the Manage screen's "deactivate action" — soft delete, super-admin only, server-enforced. */
export function deactivatePage(handle: string): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/api/pages/${encodeURIComponent(handle)}`);
}

export function followPage(handle: string): Promise<{ following: boolean; followerCount: number }> {
  return apiPost<{ following: boolean; followerCount: number }>(`/api/pages/${encodeURIComponent(handle)}/follow`, {});
}

export function unfollowPage(handle: string): Promise<{ following: boolean; followerCount: number }> {
  return apiDelete<{ following: boolean; followerCount: number }>(`/api/pages/${encodeURIComponent(handle)}/follow`);
}

export function getPageStats(handle: string): Promise<PageStats> {
  return apiGet<PageStats>(`/api/pages/${encodeURIComponent(handle)}/stats`);
}

/** Settings-tab ticket: the Stats tab's visitor-analytics chart (same shape/backend web's PageStatsTab and the personal Profile Views screen both already use). Tier-gated server-side (creator_pro/business_pro). */
export function getPageViewAnalytics(handle: string): Promise<ProfileViewAnalytics> {
  return apiGet<ProfileViewAnalytics>(`/api/pages/${encodeURIComponent(handle)}/stats/analytics`);
}

/**
 * Pro-tier metrics ticket: the Stats tab's deeper performance section
 * (period KPIs, daily engagement/publishing series, top content) — Page-
 * scoped port of the individual Creator Pro analytics engine
 * (getCreatorAnalytics's backend, /api/analytics/creator). 403s below
 * creator_pro tier, same gate as getPageViewAnalytics above.
 */
export function getPagePerformanceStats(handle: string, from?: string, to?: string): Promise<PagePerformanceStats> {
  const qs = from && to ? `?from=${from}&to=${to}` : '';
  return apiGet<PagePerformanceStats>(`/api/pages/${encodeURIComponent(handle)}/stats/performance${qs}`);
}

/** Page reviews ticket — Page-scoped equivalent of getRatingStats (profileAccount.ts), reads PageRatingStats via GET /api/ratings/page/[pageId]. */
export function getPageRatingStats(pageId: string): Promise<RatingStatsSummary & { componentRatings?: Record<string, number>; distribution?: { stars: number; count: number; percentage: number }[] }> {
  return apiGet(`/api/ratings/page/${pageId}`);
}

/** Settings > Manage admins — the live admins table. */
export function getPageAdmins(handle: string): Promise<{ admins: PageAdminUser[] }> {
  return apiGet<{ admins: PageAdminUser[] }>(`/api/pages/${encodeURIComponent(handle)}/admins`);
}

/** Settings > Manage admins' "Add admin" search — real followers only, not a general user search. */
export function searchPageFollowers(handle: string, q: string): Promise<{ followers: PageFollowerSearchResult[] }> {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  return apiGet<{ followers: PageFollowerSearchResult[] }>(`/api/pages/${encodeURIComponent(handle)}/followers${query}`);
}

export function addPageAdmin(handle: string, userId: string, role: PageAdminRole, title?: string): Promise<{ admin: PageAdminUser }> {
  return apiPost<{ admin: PageAdminUser }>(`/api/pages/${encodeURIComponent(handle)}/admins`, { userId, role, title });
}

export function updatePageAdmin(handle: string, adminId: string, payload: { role?: PageAdminRole; title?: string }): Promise<{ admin: PageAdminUser }> {
  return apiPatch<{ admin: PageAdminUser }>(`/api/pages/${encodeURIComponent(handle)}/admins/${adminId}`, payload);
}

export function removePageAdmin(handle: string, adminId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/pages/${encodeURIComponent(handle)}/admins/${adminId}`);
}

/** Pages the current user administers and/or follows — feeds the drawer's Pages list and the drawer widget (one row per admined Page). */
export function getMyPages(): Promise<MyPagesResponse> {
  return apiGet<MyPagesResponse>('/api/pages/mine');
}

/** Settings > Restricted members — the live restrictions list. */
export function getPageRestrictions(handle: string): Promise<{ restrictions: PageRestrictedMember[] }> {
  return apiGet<{ restrictions: PageRestrictedMember[] }>(`/api/pages/${encodeURIComponent(handle)}/restrictions`);
}

/**
 * Settings > Restricted members' search-and-restrict flow — this Page's
 * real followers only (same shape as searchPageFollowers, but excluding
 * already-restricted followers instead of already-admin ones, and gated on
 * canManageRestrictions rather than canManageAdmins).
 */
export function searchRestrictionCandidates(handle: string, q: string): Promise<{ followers: PageFollowerSearchResult[] }> {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  return apiGet<{ followers: PageFollowerSearchResult[] }>(`/api/pages/${encodeURIComponent(handle)}/restrictions/candidates${query}`);
}

export function addPageRestriction(handle: string, userId: string): Promise<{ restriction: PageRestrictedMember }> {
  return apiPost<{ restriction: PageRestrictedMember }>(`/api/pages/${encodeURIComponent(handle)}/restrictions`, { userId });
}

export function removePageRestriction(handle: string, restrictionId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/pages/${encodeURIComponent(handle)}/restrictions/${restrictionId}`);
}

/** Settings > Manage following — Pages this Page follows (PageFollowsPage), distinct from followPage/unfollowPage above (a user following a Page). */
export function getPageFollowing(handle: string): Promise<{ following: PageFollowedPageSummary[] }> {
  return apiGet<{ following: PageFollowedPageSummary[] }>(`/api/pages/${encodeURIComponent(handle)}/following`);
}

/** Body resolves the target Page by HANDLE, not id — simpler UX, single direct lookup server-side. */
export function addPageFollowing(handle: string, followedHandle: string): Promise<{ following: PageFollowedPageSummary }> {
  return apiPost<{ following: PageFollowedPageSummary }>(`/api/pages/${encodeURIComponent(handle)}/following`, { followedHandle });
}

export function removePageFollowing(handle: string, followId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/pages/${encodeURIComponent(handle)}/following/${followId}`);
}

/**
 * Settings > Page inbox settings. Its own small endpoint, deliberately not
 * folded into updatePage()/PATCH /api/pages/[handle] — that route is gated
 * canEditPageInfo, a different permission from canManageInboxSettings (an
 * Editor holds the former but not the latter). See
 * app/api/pages/[handle]/inbox-settings/route.ts on the web side.
 */
export function getPageInboxSettings(handle: string): Promise<PageInboxSettings> {
  return apiGet<PageInboxSettings>(`/api/pages/${encodeURIComponent(handle)}/inbox-settings`);
}

export function updatePageInboxSettings(handle: string, payload: Partial<PageInboxSettings>): Promise<PageInboxSettings> {
  return apiPatch<PageInboxSettings>(`/api/pages/${encodeURIComponent(handle)}/inbox-settings`, payload);
}

/**
 * Low-level multipart POST for the two Page media endpoints below. Can't go
 * through http.ts's `request()` — that helper always sets a JSON
 * Content-Type header, which stomps the multipart boundary fetch needs to
 * set itself for a FormData body. Mirrors `request()`'s behavior otherwise
 * (ApiError, 401 -> notifyUnauthorized only when a token was actually
 * sent), matching upload.ts's `uploadFiles` precedent of hand-rolling its
 * own fetch for the same reason.
 */
async function postPageMedia<T>(path: string, form: FormData): Promise<T> {
  const token = await getCurrentToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
  } catch (err) {
    throw new ApiError(err instanceof Error ? `Network error: ${err.message}` : 'Network error', 0);
  }

  const rawText = await response.text();
  let data: { error?: string } = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    // Non-JSON body (e.g. an HTML error page from a proxy) — fall through,
    // the status-based message below still fires.
  }

  if (!response.ok) {
    if (response.status === 401 && token) notifyUnauthorized();
    throw new ApiError(typeof data?.error === 'string' ? data.error : `Upload failed (${response.status})`, response.status);
  }
  return data as T;
}

/**
 * Settings > Edit page info's avatar picker. Matches POST
 * /api/pages/[handle]/avatar exactly — multipart with a single `file` field
 * (not `files`/`type` like the generic /api/upload route uploadFiles()
 * hits), gated canEditPageInfo server-side.
 */
export function uploadPageAvatar(handle: string, file: UploadableFile): Promise<{ success: boolean; url: string; filename: string }> {
  const form = new FormData();
  form.append('file', file);
  return postPageMedia(`/api/pages/${encodeURIComponent(handle)}/avatar`, form);
}

/**
 * Settings > Edit page info's cover photo picker. Matches POST
 * /api/pages/[handle]/cover-photo exactly — same request shape web's
 * ProfileCover component sends (components/profile/ProfileCover.tsx):
 * multipart field named `coverPhoto` (NOT `file`) plus `positionX`/
 * `positionY`, the non-destructive {0-100} focal point chosen in
 * CoverPositionPicker.
 */
export function uploadPageCoverPhoto(
  handle: string,
  file: UploadableFile,
  position: { x: number; y: number }
): Promise<{ success: boolean; coverPhoto: string; coverPhotoPosition: { x: number; y: number } | null; filename: string }> {
  const form = new FormData();
  form.append('coverPhoto', file);
  form.append('positionX', String(position.x));
  form.append('positionY', String(position.y));
  return postPageMedia(`/api/pages/${encodeURIComponent(handle)}/cover-photo`, form);
}

/**
 * Page inbox/messaging investigation: the Page profile's "Message" button
 * — finds or creates the caller's own conversation with this Page (POST
 * /api/conversations/page/[pageId] with no otherUserId, the visitor-
 * initiated case that route didn't support until this same investigation
 * fixed its authorization). Same conversation system the Page's own inbox
 * already uses, not a parallel one.
 */
export function startPageConversation(pageId: string): Promise<{ conversation: { id: string } }> {
  return apiPost(`/api/conversations/page/${encodeURIComponent(pageId)}`, {});
}
