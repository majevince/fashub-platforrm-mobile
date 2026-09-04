/** Matches web's CommentReactionType (Prisma enum + lib/comments/shapeComments.ts). */
export type CommentReactionType = 'like' | 'love' | 'celebrate' | 'funny' | 'insightful';

/**
 * Matches the transformedPosts shape returned by GET /api/feed
 * (lib/feed/feedPipeline.ts) exactly — read directly from source, not
 * inferred. createdAt/updatedAt are ISO strings (JSON wire format).
 *
 * Replies are flattened to one level under their top-level parent by the
 * server (see web's app/api/posts/[postId]/comments/route.ts) — a reply's
 * `replies` array is always empty, never true recursive nesting.
 */
export interface PostComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  /** Professional title/subtitle line (designer/tailor specialty + business name). Null for individuals. */
  userHeadline?: string | null;
  userSubscriptionTier?: string;
  /** Real signal — RatingStats.verifiedReviews > 0, same as everywhere else in the app. */
  isVerified?: boolean;
  content: string;
  parentId: string | null;
  /** Who this reply is specifically addressed to — drives the "@username" prefix and the reply chip. */
  replyToUserId?: string | null;
  replyToUsername?: string | null;
  isPinned?: boolean;
  isEdited?: boolean;
  editedAt?: string | null;
  createdAt: string;
  reactionCounts?: Partial<Record<CommentReactionType, number>>;
  viewerReactionType?: CommentReactionType | null;
  replies: PostComment[];
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: string;
  authorSubscriptionTier: string;
  authorIsVerified: boolean;
  title: string;
  description: string;
  images: string[];
  videos: string[];
  category: string;
  price: number | null;
  priceRange: string | null;
  tags: string[];
  materials: string[];
  colors: string[];
  sizes: string[];
  location: string | null;
  likes: string[];
  interests: string[];
  comments: PostComment[];
  isRepost: boolean;
  originalPostId: string | null;
  originalPost?: {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar: string | null;
    authorRole: string;
    authorSubscriptionTier: string;
    authorIsVerified: boolean;
    title: string;
    description: string;
    images: string[];
    videos: string[];
    category: string;
    createdAt: string;
  };
  repostComment: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Matches GET /api/posts/[postId] exactly (app/api/posts/[postId]/route.ts,
 * read directly from source) — a genuinely different shape from FeedPost,
 * not a variant of it: author verification/rating/availability live under
 * a nested `authorProfile`, not flattened top-level fields.
 */
export interface PostDetail {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: string;
  authorSubscriptionTier: string;
  authorProfile: {
    id: string;
    businessName: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    specialties: string[];
    yearsOfExperience: number | null;
    rating: number;
    reviewCount: number;
    followerCount: number;
    availabilityStatus: string;
    completedOrders: number;
    isVerified: boolean;
    isOnline: boolean;
  };
  title: string;
  description: string;
  images: string[];
  videos: string[];
  category: string;
  price: number | null;
  priceRange: string | null;
  tags: string[];
  materials: string[];
  colors: string[];
  sizes: string[];
  location: string | null;
  likes: string[];
  interests: string[];
  isRepost: boolean;
  originalPostId: string | null;
  repostComment: string | null;
  createdAt: string;
  updatedAt: string;
  comments: PostComment[];
}

/**
 * Matches GET /api/posts?authorId= exactly (app/api/posts/route.ts) — used
 * for Dashboard's "Recent Posts". Distinct from FeedPost: this route's
 * transform spreads the raw Post row plus authorName/authorAvatar/authorRole
 * only, omitting authorSubscriptionTier/authorIsVerified that GET /api/feed
 * adds.
 */
export interface UserPost {
  id: string;
  authorId: string;
  title: string;
  description: string;
  images: string[];
  videos: string[];
  category: string;
  likes: string[];
  interests: string[];
  comments: PostComment[];
  createdAt: string;
}

export interface FeedResponse {
  posts: FeedPost[];
  nextCursor: string | null;
  total: number;
  filter: 'all' | 'following' | 'trending';
}

export type FeedFilter = 'all' | 'following' | 'trending';

/** Matches POST /api/posts's required + commonly-used optional fields (app/api/posts/route.ts). */
export type PostCategory = 'casual' | 'formal' | 'business' | 'traditional' | 'wedding' | 'accessories' | 'custom' | 'other';

export interface CreatePostPayload {
  authorId: string;
  title: string;
  description: string;
  category: PostCategory;
  images?: string[];
  videos?: string[];
  price?: number;
  tags?: string[];
}
