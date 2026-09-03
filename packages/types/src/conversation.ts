/**
 * Scoped narrowly to what the story-reply flow needs (find-or-create a DM +
 * send one message with a story attachment) — not a full Messages/Inbox
 * type set, which is a separate, much larger feature not covered here.
 */
export interface StoryReplyAttachmentData {
  storyId: string;
  authorId: string;
  authorName: string;
  mediaType: string;
  thumbnailUrl: string | null;
  caption: string | null;
  replyText: string;
  expiresAt: string;
}

/**
 * Matches app/api/conversations/user/[userId]/route.ts's transformed
 * shape exactly (both GET and POST responses) — read directly from the
 * route handler, not inferred. `isVerified` is computed server-side per
 * conversation fetch from RatingStats.verifiedReviews > 0 (same signal
 * used elsewhere in the app), not a stored user column.
 */
export interface ConversationParticipant {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  userRole: string;
  subscriptionTier?: 'free' | 'pro' | 'business';
  isVerified?: boolean;
}

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  lastMessage?: string | null;
  lastMessageThumbnail?: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}
