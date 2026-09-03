import { apiGet, apiPost, apiPatch } from './http';
import type { Conversation, ChatMessage, MessageReaction, AttachmentType } from '@fashub/types';

/** Matches GET /api/conversations/user/[userId] exactly — returns a bare array, all conversations, no pagination. */
export function getConversations(userId: string): Promise<Conversation[]> {
  return apiGet(`/api/conversations/user/${userId}`);
}

/** Matches GET /api/conversations/[conversationId] exactly — single conversation fetch. */
export function getConversation(conversationId: string): Promise<{ conversation: Conversation }> {
  return apiGet(`/api/conversations/${conversationId}`);
}

/** Matches GET /api/conversations/[conversationId]/messages exactly — returns a bare array, most-recent `limit` (default 100, capped 500), oldest-first. No cursor param exists on web; full replace every call. */
export function getMessages(conversationId: string, limit?: number): Promise<ChatMessage[]> {
  return apiGet(`/api/conversations/${conversationId}/messages${limit ? `?limit=${limit}` : ''}`);
}

export type SendMessagePayload = {
  senderId: string;
  recipientId: string;
  content: string;
  attachedPostId?: string | null;
  attachmentType?: AttachmentType;
  attachmentData?: unknown;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMimeType?: string | null;
  replyToId?: string | null;
  isForwarded?: boolean;
  forwardedFromUserId?: string | null;
  forwardedFromUserName?: string | null;
};

/** Matches POST /api/conversations/[conversationId]/messages exactly. */
export function sendMessage(conversationId: string, payload: SendMessagePayload): Promise<{ message: string; data: ChatMessage }> {
  return apiPost(`/api/conversations/${conversationId}/messages`, payload);
}

/** Matches PATCH .../messages with action:'react' exactly — toggles the caller's own reaction for that emoji. */
export function toggleReaction(
  conversationId: string,
  payload: { messageId: string; userId: string; userName: string; emoji: string }
): Promise<{ message: string; reactions: MessageReaction[] }> {
  return apiPatch(`/api/conversations/${conversationId}/messages`, { ...payload, action: 'react' });
}

/** Matches PATCH .../messages with action:'delete' exactly — sender-only soft delete. */
export function deleteMessage(conversationId: string, payload: { messageId: string; userId: string }): Promise<{ message: string }> {
  return apiPatch(`/api/conversations/${conversationId}/messages`, { ...payload, action: 'delete' });
}

/** Matches POST /api/conversations/[conversationId]/read exactly. */
export function markConversationRead(conversationId: string, userId: string): Promise<{ message: string }> {
  return apiPost(`/api/conversations/${conversationId}/read`, { userId });
}

/** Matches GET /api/online-status?userId= exactly. isOnline requires isOnline===true AND lastActive within the last 15s (server-enforced). */
export function getOnlineStatus(userId: string): Promise<{ isOnline: boolean; lastActive: string | null }> {
  return apiGet(`/api/online-status?userId=${userId}`);
}

/** Matches POST /api/online-status exactly — the presence heartbeat. */
export function sendHeartbeat(userId: string, isOnline: boolean): Promise<{ success: boolean }> {
  return apiPost('/api/online-status', { userId, isOnline });
}

export type CreateInquiryPayload = {
  senderId: string;
  creatorUserId: string;
  projectId?: string | null;
  projectTitle?: string | null;
  inquiryType: 'message' | 'quote' | 'consultation';
  message: string;
  budget?: string | null;
  timeline?: string | null;
  category?: string | null;
  projectCoverImage?: string | null;
  creatorName?: string | null;
  creatorAvatar?: string | null;
  creatorRole?: string | null;
  creatorIsPro?: boolean;
  creatorIsVerified?: boolean;
};

/** Matches POST /api/inquiries exactly — creates (or reuses) the conversation and inserts the project_inquiry message. */
export function createInquiry(payload: CreateInquiryPayload): Promise<{ conversationId: string; messageId: string; message: string }> {
  return apiPost('/api/inquiries', payload);
}

/**
 * Matches web's lib/chat/chatUtils.ts `forwardMessage` exactly — there is no
 * dedicated backend "forward" endpoint; forwarding is client-orchestrated:
 * fetch each target conversation to resolve its recipient, POST the message
 * with isForwarded:true, then optionally POST a follow-up comment message.
 * Best-effort per recipient — one failure doesn't abort the rest.
 */
export async function forwardMessage(
  original: {
    content: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    fileMimeType?: string | null;
    senderId: string;
    senderName: string;
    attachmentType?: AttachmentType;
    attachmentData?: unknown;
  },
  targetConversationIds: string[],
  forwarderId: string,
  comment?: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const convId of targetConversationIds) {
    try {
      const { conversation } = await getConversation(convId);
      const recipient = conversation.participants.find((p) => p.userId !== forwarderId);
      if (!recipient) {
        failed++;
        continue;
      }

      await sendMessage(convId, {
        senderId: forwarderId,
        recipientId: recipient.userId,
        content: original.content || '',
        fileUrl: original.fileUrl ?? null,
        fileName: original.fileName ?? null,
        fileSize: original.fileSize ?? null,
        fileMimeType: original.fileMimeType ?? null,
        isForwarded: true,
        forwardedFromUserId: original.senderId,
        forwardedFromUserName: original.senderName,
        attachmentType: original.attachmentType ?? null,
        attachmentData: original.attachmentData ?? null,
      });

      if (comment?.trim()) {
        await sendMessage(convId, {
          senderId: forwarderId,
          recipientId: recipient.userId,
          content: comment.trim(),
        });
      }

      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}
