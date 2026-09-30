/**
 * Mobile search-parity ticket — mirrors fashub web's GET /api/search
 * response shape exactly (app/api/search/route.ts). Four real categories;
 * no fifth "posts"/"services"/"communities" category exists on web despite
 * being floated as an example in the ticket — confirmed against the actual
 * backend rather than assumed.
 */

export interface SearchPersonResult {
  id: string;
  displayName: string;
  avatar: string | null;
  role: string;
  title: string | null;
  location: string | null;
  // Feeds components/VerifiedBadge.tsx's isVerified() — same shared signal
  // web's post/comment/profile badges already use, previously just never
  // fetched by the search endpoint (see fashub's app/api/search/route.ts).
  subscriptionTier?: string | null;
  verified?: boolean;
}

export interface SearchPageResult {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  category: string | null;
  kind: string | null;
  tier: string;
  verified: boolean;
  location: string | null;
  followerCount: number;
}

export interface SearchEventResult {
  id: string;
  title: string;
  image: string | null;
  category: string;
  startDate: string;
  location: string | null;
  organizer: { id: string; displayName: string; avatar: string | null } | null;
  organizerPage: { id: string; name: string; handle: string; avatar: string | null } | null;
}

export interface SearchProjectResult {
  id: string;
  title: string;
  summary: string | null;
  coverImage: string | null;
  category: string | null;
  location: string | null;
  ownerId: string | null;
  ownerName: string;
  ownerAvatar: string | null;
}

export interface SearchBucket<T> {
  results: T[];
  total: number;
}

export interface SearchAllResponse {
  people: SearchBucket<SearchPersonResult>;
  pages: SearchBucket<SearchPageResult>;
  events: SearchBucket<SearchEventResult>;
  projects: SearchBucket<SearchProjectResult>;
  cursor?: number;
  limit?: number;
}

export type SearchCategory = 'all' | 'people' | 'pages' | 'events' | 'projects';
