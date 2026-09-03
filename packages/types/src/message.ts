/**
 * Matches app/api/conversations/[conversationId]/messages/route.ts's
 * transformedMessage shape exactly (GET + POST), and the Prisma `Message`
 * model (prisma/schema.prisma) — read directly from both, not inferred.
 * `reactions`/`attachmentData` are raw JSON-string columns server-side;
 * the API always parses them before responding, so the client never
 * touches JSON.parse itself.
 */
export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface ReplyToPreview {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  attachmentType?: string | null;
  attachmentTitle?: string | null;
}

/** The full set of Message.attachmentType values actually produced by the backend. */
export type AttachmentType = 'project_inquiry' | 'fabric' | 'event' | 'project' | 'post' | 'story' | null;

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  recipientId: string;
  content: string;
  read: boolean;
  createdAt: string;
  attachedPostId?: string | null;
  attachmentType?: AttachmentType;
  attachmentData?: unknown;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMimeType?: string | null;
  replyToId?: string | null;
  replyTo?: ReplyToPreview | null;
  reactions: MessageReaction[];
  deleted: boolean;
  editedAt?: string | null;
  isForwarded: boolean;
  forwardedFromUserId?: string | null;
  forwardedFromUserName?: string | null;
  /** Client-only optimistic-UI field — not present on server responses. */
  status?: 'sending' | 'sent' | 'failed';
}

// ── Structured card payloads — each is an opaque JSON blob stored in
// Message.attachmentData, discriminated by the sibling attachmentType
// string. Field lists read directly from each card's component file on
// web (components/chat/*.tsx), not inferred. ──────────────────────────

/** components/chat/InquiryCard.tsx */
export interface InquiryData {
  inquiryType: 'message' | 'quote' | 'consultation';
  projectId?: string | null;
  projectTitle?: string | null;
  projectCoverImage?: string | null;
  creatorName?: string | null;
  creatorAvatar?: string | null;
  creatorRole?: string | null;
  creatorIsPro?: boolean;
  creatorIsVerified?: boolean;
  budget?: string | null;
  timeline?: string | null;
  category?: string | null;
  message: string;
}

/** components/chat/FabricMessageCard.tsx — the inventory / sample-request card. */
export interface ColorVariantSnapshot {
  id?: string;
  label?: string;
  hex?: string;
  photos?: string[];
}

export interface FabricCardData {
  id: string;
  name: string;
  rollNumber?: string | null;
  images: string[];
  colorVariants: ColorVariantSnapshot[];
  fabricType: string;
  composition?: string | null;
  color?: string | null;
  secondaryColor?: string | null;
  weight?: string | null;
  pattern?: string | null;
  unit?: string | null;
  sellingPricePerUnit?: number | null;
  costPerUnit?: number | null;
  available?: number;
  reserved?: number;
  reorderLevel?: number | null;
  inStock: boolean;
  usageCategories?: string[];
  supplier?: string | null;
  tags?: string[];
  deleted?: boolean;
  /** The only field distinguishing a "sample request" from a plain shared-fabric card. */
  isSampleRequest?: boolean;
  ownerInfo?: { userId: string; name: string; avatar?: string | null } | null;
  note?: string | null;
}

/** components/chat/EventMessageCard.tsx */
export interface EventCardData {
  id: string;
  title: string;
  startDate: string;
  location?: string;
  image?: string;
  isFree?: boolean;
  price?: number;
  currency?: string;
  link?: string;
}

/** components/chat/ProjectMessageCard.tsx */
export interface ProjectCardData {
  id: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  coverImage?: string | null;
  tags?: string[];
  link?: string;
  note?: string | null;
}

/** components/chat/PostMessageCard.tsx */
export interface PostCardData {
  id: string;
  title: string;
  description?: string | null;
  images?: string[];
  basePrice?: number | null;
  currency?: string | null;
  category?: string | null;
  authorName?: string | null;
  fabrics?: string[];
  colors?: string[];
  sizes?: string[];
}

/** components/chat/StoryMessageCard.tsx — permanent snapshot, same shape as the story-reply send payload. */
export type StoryCardData = import('./conversation').StoryReplyAttachmentData;
