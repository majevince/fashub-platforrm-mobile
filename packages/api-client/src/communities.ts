import { apiGet, apiPost, apiPatch, apiDelete } from './http';
import type {
  Community,
  CommunitiesListResponse,
  CommunityMembersResponse,
  CommunityPostsResponse,
  CommunityPost,
  CommunityComment,
  CommunityDashboardStats,
  CommunityTrendingTagsResponse,
  CommunityMemberAction,
  CommunityMemberRoleType,
  CreateCommunityPayload,
  UpdateCommunityPayload,
  CreateCommunityPostPayload,
  CommunityPostSort,
} from '@fashub/types';

/** Matches GET /api/communities exactly — flat response, no wrapper. `tab` forces server-side sort to 'popular' when 'my' (mirrors web's own client behavior, not duplicated here). */
export function getCommunities(opts: {
  tab?: 'discover' | 'my';
  userId?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  category?: string;
  stats?: boolean;
}): Promise<CommunitiesListResponse> {
  const params = new URLSearchParams();
  if (opts.tab) params.set('tab', opts.tab);
  if (opts.userId) params.set('userId', opts.userId);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.offset) params.set('offset', String(opts.offset));
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.search) params.set('search', opts.search);
  if (opts.category) params.set('category', opts.category);
  if (opts.stats) params.set('stats', '1');
  return apiGet(`/api/communities?${params.toString()}`);
}

/** Matches GET /api/communities/[slug] — wrapped as { community }, unlike the list route. */
export async function getCommunity(slug: string, userId?: string): Promise<Community> {
  const res = await apiGet<{ community: Community }>(`/api/communities/${slug}${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`);
  return res.community;
}

/** Matches POST /api/communities exactly — creates the community + an owner CommunityMember row server-side. Wrapped as { community }. */
export async function createCommunity(payload: CreateCommunityPayload): Promise<Community> {
  const res = await apiPost<{ community: Community }>('/api/communities', payload);
  return res.community;
}

/** Matches PATCH /api/communities/[slug] — general fields need owner/admin; joinMode/postPermission/allowMemberInvites need owner (server-enforced, not just client-side). Wrapped as { community }. */
export async function updateCommunity(slug: string, payload: UpdateCommunityPayload): Promise<Community> {
  const res = await apiPatch<{ community: Community }>(`/api/communities/${slug}`, payload);
  return res.community;
}

/** Matches DELETE /api/communities/[slug]?userId= — owner only. */
export function deleteCommunity(slug: string, userId: string): Promise<{ success: boolean }> {
  return apiDelete(`/api/communities/${slug}?userId=${encodeURIComponent(userId)}`);
}

/** Matches GET /api/communities/[slug]/members exactly — flat. `status` defaults server-side to 'approved'; pass 'pending' for the Requests tab or 'all' to bypass. */
export function getCommunityMembers(slug: string, opts: { status?: 'approved' | 'pending' | 'all'; limit?: number; offset?: number } = {}): Promise<CommunityMembersResponse> {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.offset) params.set('offset', String(opts.offset));
  const qs = params.toString();
  return apiGet(`/api/communities/${slug}/members${qs ? `?${qs}` : ''}`);
}

/** Matches POST /api/communities/[slug]/members exactly — private communities 403 (invite-only, no public request flow); public communities resolve to 'approved' or 'pending' server-side based on joinMode. */
export function joinCommunity(slug: string, userId: string): Promise<{ joinStatus: 'approved' | 'pending' }> {
  return apiPost(`/api/communities/${slug}/members`, { userId });
}

/** Matches DELETE /api/communities/[slug]/members?userId= — server blocks owners and sole admins with a 400 (message surfaces via ApiError). */
export function leaveCommunity(slug: string, userId: string): Promise<{ success: boolean }> {
  return apiDelete(`/api/communities/${slug}/members?userId=${encodeURIComponent(userId)}`);
}

/** Matches PATCH /api/communities/[slug]/members exactly — one endpoint for approve/reject/change_role/remove/add_user/transfer_ownership, role-hierarchy enforced server-side. */
export function updateCommunityMember(
  slug: string,
  payload: { userId: string; targetUserId: string; action: CommunityMemberAction; newRole?: CommunityMemberRoleType }
): Promise<{ success: boolean }> {
  return apiPatch(`/api/communities/${slug}/members`, payload);
}

/** Matches GET /api/communities/[slug]/posts exactly — flat. `tag` does a real server-side content-contains-#tag filter; `filter` (by postType) exists server-side but web's own UI never sends it either. */
export function getCommunityPosts(slug: string, opts: { userId?: string; sort?: CommunityPostSort; tag?: string; limit?: number; offset?: number } = {}): Promise<CommunityPostsResponse> {
  const params = new URLSearchParams();
  if (opts.userId) params.set('userId', opts.userId);
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.tag) params.set('tag', opts.tag);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.offset) params.set('offset', String(opts.offset));
  const qs = params.toString();
  return apiGet(`/api/communities/${slug}/posts${qs ? `?${qs}` : ''}`);
}

/** Matches POST /api/communities/[slug]/posts exactly — server requires non-empty `content` for every postType (including photo/video/poll), enforces membership + postPermission. Wrapped as { post }. */
export async function createCommunityPost(slug: string, payload: CreateCommunityPostPayload): Promise<CommunityPost> {
  const res = await apiPost<{ post: CommunityPost }>(`/api/communities/${slug}/posts`, payload);
  return res.post;
}

/** Matches POST /api/communities/[slug]/posts/[postId]/like exactly — toggle, flat `{ liked }`. No membership check server-side (matches web's own real behavior). */
export function toggleCommunityPostLike(slug: string, postId: string, userId: string): Promise<{ liked: boolean }> {
  return apiPost(`/api/communities/${slug}/posts/${postId}/like`, { userId });
}

/** Matches POST /api/communities/[slug]/posts/[postId]/vote exactly — casts OR changes an existing vote (upsert), flat response with live tallies. */
export function voteCommunityPoll(slug: string, postId: string, userId: string, optionId: string): Promise<{ myVote: string; voteCounts: Record<string, number>; totalVotes: number }> {
  return apiPost(`/api/communities/${slug}/posts/${postId}/vote`, { userId, optionId });
}

/** Matches POST /api/communities/[slug]/posts/[postId]/comments exactly — omit parentId for a top-level comment. Wrapped as { comment }. */
export async function addCommunityComment(slug: string, postId: string, userId: string, content: string, parentId?: string): Promise<CommunityComment> {
  const res = await apiPost<{ comment: CommunityComment }>(`/api/communities/${slug}/posts/${postId}/comments`, { userId, content, parentId });
  return res.comment;
}

/** Matches DELETE /api/communities/[slug]/posts/[postId]/comments?commentId=&userId= exactly — author, or admin/moderator (server's literal role check excludes plain 'owner' — matches that gap as-is, not "fixed"). */
export function deleteCommunityComment(slug: string, postId: string, commentId: string, userId: string): Promise<{ success: boolean }> {
  return apiDelete(`/api/communities/${slug}/posts/${postId}/comments?commentId=${encodeURIComponent(commentId)}&userId=${encodeURIComponent(userId)}`);
}

/** Matches POST /api/communities/[slug]/posts/[postId]/pin exactly — toggle, owner/admin/moderator only (403 otherwise). Flat `{ isPinned }`. */
export function toggleCommunityPostPin(slug: string, postId: string, userId: string): Promise<{ isPinned: boolean }> {
  return apiPost(`/api/communities/${slug}/posts/${postId}/pin`, { userId });
}

/** Matches GET /api/communities/dashboard-stats?userId= exactly — scoped to the user's approved memberships. */
export function getCommunityDashboardStats(userId: string): Promise<CommunityDashboardStats> {
  return apiGet(`/api/communities/dashboard-stats?userId=${encodeURIComponent(userId)}`);
}

/** Matches GET /api/communities/trending-tags?limit= exactly — global, public communities only, live-aggregated off Community.tags. */
export function getCommunityTrendingTags(limit: number = 8): Promise<CommunityTrendingTagsResponse> {
  return apiGet(`/api/communities/trending-tags?limit=${limit}`);
}
