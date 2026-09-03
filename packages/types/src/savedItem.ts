/** Matches app/api/saved-items/route.ts exactly. */
export type SaveContentType = 'EVENT' | 'POST' | 'PROJECT' | 'COMMUNITY';

export interface SavedEventContent {
  id: string;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  category: string;
  startDate: string;
  endDate?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  venueName?: string | null;
  image?: string | null;
  isFree: boolean;
  price?: number | null;
  currency?: string | null;
  isAttending?: boolean;
  organizer?: { id: string; displayName: string; avatar?: string | null; subscriptionTier?: string | null };
}

export interface SavedPostContent {
  id: string;
  title: string;
  description?: string | null;
  images: string[];
  category: string;
  price?: number | null;
  currency?: string | null;
  tags: string[];
  likes: string[];
  interests: string[];
  author?: { id: string; displayName: string; avatar?: string | null; role: string; subscriptionTier?: string | null };
  createdAt: string;
}

export interface SavedProjectContent {
  id: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  coverImage?: string | null;
  images: string[];
  tags: string[];
  viewCount: number;
  isFeatured: boolean;
  isPinned: boolean;
  createdAt: string;
  designer?: { userId: string; city?: string | null; country?: string | null; rating?: number | null; reviewCount?: number | null; user: { displayName: string; avatar?: string | null; subscriptionTier?: string | null } } | null;
  tailor?: { userId: string; city?: string | null; country?: string | null; rating?: number | null; reviewCount?: number | null; user: { displayName: string; avatar?: string | null; subscriptionTier?: string | null } } | null;
}

export interface SavedItem<T = SavedEventContent | SavedPostContent | SavedProjectContent> {
  id: string;
  userId: string;
  contentId: string;
  contentType: SaveContentType;
  createdAt: string;
  content: T | null;
}
