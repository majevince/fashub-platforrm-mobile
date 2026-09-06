/**
 * Ported directly from web's types/communities.ts (read verbatim from
 * source, not re-derived) — same field names/shapes, since GET
 * /api/communities and friends return exactly this. Response envelopes
 * confirmed by reading each route.ts directly: some wrap in a named key
 * (`{ community }`, `{ post }`, `{ comment }`), others are flat
 * (`{ communities, total, limit, offset }`, `{ posts, ... }`,
 * `{ members, ... }`) — inconsistent across routes, not a mistake to
 * "fix," just matched exactly as-is (see events.ts's getEvent() for the
 * same kind of wrapper mismatch that caused a real crash there).
 */
export type CommunityVisibility = 'public' | 'private';
export type CommunityMemberRoleType = 'owner' | 'admin' | 'moderator' | 'member';
export type CommunityJoinStatusType = 'pending' | 'approved' | 'rejected';
export type CommunityPostType = 'text' | 'photo' | 'video' | 'poll';
export type CommunityPostSort = 'recent' | 'popular' | 'active' | 'announcements';
export type CommunityDiscoveryTab = 'trending' | 'recommended' | 'new' | 'active' | 'editors';
export type CommunityScope = 'discover' | 'my';

export const COMMUNITY_CATEGORIES = [
  'Fashion Design',
  'Tailoring & Alterations',
  'Streetwear',
  'Traditional Wear',
  'Sustainable Fashion',
  'Fabric & Textiles',
  'Fashion Photography',
  'Fashion Business',
  'Pattern Making',
  'Accessories',
  'Bridal & Wedding',
  'Menswear',
  'Womenswear',
  'Fashion Technology',
  'General',
] as const;

export interface CommunityUser {
  id: string;
  displayName: string;
  avatar: string | null;
  role: string;
  subscriptionTier?: string | null;
}

export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  user?: CommunityUser;
  role: CommunityMemberRoleType;
  joinStatus: CommunityJoinStatusType;
  notifyPosts: boolean;
  joinedAt: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  rules: string | null;
  avatar: string | null;
  coverPhoto: string | null;
  visibility: CommunityVisibility;
  category: string | null;
  tags: string[];
  createdById: string;
  createdBy?: CommunityUser;
  joinMode: string;
  postPermission: string;
  allowMemberInvites: boolean;
  memberCount: number;
  postCount: number;
  isEditorsPick: boolean;
  createdAt: string;
  updatedAt: string;
  myMembership?: CommunityMember | null;
  verified: boolean;
  onlineCount: number;
  weeklyGrowth: number;
  activityScore: number;
  postsLast24h: number;
  topDiscussion: {
    id: string;
    content: string;
    likeCount: number;
    commentCount: number;
    author: CommunityUser;
  } | null;
  memberAvatars: CommunityUser[];
  isSaved?: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  author?: CommunityUser;
  parentId: string | null;
  content: string;
  likeCount: number;
  replies?: CommunityComment[];
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  authorId: string;
  author?: CommunityUser;
  postType: CommunityPostType;
  content: string;
  images: string[];
  videoUrl: string | null;
  linkUrl: string | null;
  isPinned: boolean;
  pollQuestion: string | null;
  pollOptions: { id: string; text: string }[] | null;
  pollEndsAt: string | null;
  likeCount: number;
  commentCount: number;
  comments?: CommunityComment[];
  hasLiked?: boolean;
  myPollVote?: string | null;
  pollVoteCounts?: Record<string, number> | null;
  pollTotalVotes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunitiesListResponse {
  communities: Community[];
  total: number;
  limit: number;
  offset: number;
  stats?: { liveCommunities: number; membersGuildWide: number; postsThisWeek: number };
}

export interface CommunityMembersResponse {
  members: CommunityMember[];
  total: number;
  limit: number;
  offset: number;
}

export interface CommunityPostsResponse {
  posts: CommunityPost[];
  total: number;
  limit: number;
  offset: number;
}

export interface CommunityDashboardStats {
  communitiesJoined: number;
  newDiscussionsToday: number;
  activeMembersNow: number;
  topTrendingTag: string | null;
  communitiesBuzzingToday: number;
}

export interface CommunityTrendingTagsResponse {
  tags: { tag: string; communityCount: number }[];
}

export type CommunityMemberAction = 'approve' | 'reject' | 'change_role' | 'remove' | 'add_user' | 'transfer_ownership';

export interface CreateCommunityPayload {
  userId: string;
  name: string;
  description?: string | null;
  rules?: string | null;
  category?: string | null;
  tags?: string[];
  visibility: CommunityVisibility;
  coverPhoto?: string | null;
}

export interface UpdateCommunityPayload {
  userId: string;
  name?: string;
  description?: string | null;
  rules?: string | null;
  category?: string | null;
  tags?: string[];
  visibility?: CommunityVisibility;
  joinMode?: string;
  postPermission?: string;
  allowMemberInvites?: boolean;
}

export interface CreateCommunityPostPayload {
  userId: string;
  content: string;
  postType: CommunityPostType;
  images?: string[];
  videoUrl?: string;
  pollQuestion?: string;
  pollOptions?: string[];
}
