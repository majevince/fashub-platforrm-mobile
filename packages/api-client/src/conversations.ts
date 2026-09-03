import { apiPost } from './http';
import type { StoryReplyAttachmentData } from '@fashub/types';

/**
 * Scoped narrowly to the story-reply flow (matches
 * components/stories/StoryViewer.tsx's handleReply exactly) — not a general
 * Messages/Inbox client, which is a separate, larger feature.
 */

/** Matches POST /api/conversations/user/[userId] exactly — finds or creates a DM with otherUserId. */
export function findOrCreateConversation(currentUserId: string, otherUserId: string): Promise<{ conversation: { id: string } }> {
  return apiPost(`/api/conversations/user/${currentUserId}`, { otherUserId });
}

/** Matches POST /api/conversations/[conversationId]/messages exactly, for a story-reply message specifically (attachmentType: 'story'). */
export function sendStoryReplyMessage(
  conversationId: string,
  payload: { senderId: string; recipientId: string; content: string; attachmentData: StoryReplyAttachmentData }
): Promise<{ message: unknown }> {
  return apiPost(`/api/conversations/${conversationId}/messages`, {
    senderId: payload.senderId,
    recipientId: payload.recipientId,
    content: payload.content,
    attachmentType: 'story',
    attachmentData: payload.attachmentData,
  });
}
