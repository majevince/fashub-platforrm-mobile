import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ImageIcon } from 'lucide-react-native';
import { violetColors as V, fontFamilies } from '@fashub/design-tokens';
import { resolveMediaUrl } from '@fashub/api-client';
import type { Conversation } from '@fashub/types';
import { AvatarPresence } from './AvatarPresence';
import { VerifiedBadge, isVerified } from '../VerifiedBadge';
import { formatRelativeTime, getInquiryPreviewType } from '../../lib/chatFormat';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const INBOX_PRESENCE_INTERVAL_MS = 15000;

/**
 * Matches the nearest existing larger row type-scale already proven
 * elsewhere (notifications.tsx's name/message rows, 13.5/12.5) — no exact
 * @fashub/design-tokens typeScale step matches these sizes, so we reuse the
 * proven values directly rather than inventing a new arbitrary size.
 * Font family is routed through the real Inter tokens here (the row
 * previously set no fontFamily at all, silently falling back to the OS
 * default instead of Inter).
 */
const CONVERSATION_ROW_NAME_SIZE = 13.5;
const CONVERSATION_ROW_PREVIEW_SIZE = 12.5;

export function ConversationRow({ conversation, currentUserId, onPress }: { conversation: Conversation; currentUserId: string; onPress: () => void }) {
  const router = useRouter();
  const other = conversation.participants.find((p) => p.userId !== currentUserId);
  const presence = useOnlineStatus(other?.userId, INBOX_PRESENCE_INTERVAL_MS);
  if (!other) return null;

  const unread = conversation.unreadCount > 0;
  const inquiryLabel = getInquiryPreviewType(conversation.lastMessage);
  const verified = isVerified({ subscriptionTier: other.subscriptionTier, verified: other.isVerified });
  const isPro = other.subscriptionTier === 'pro' || other.subscriptionTier === 'business';

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: unread ? V.primarySoft : 'transparent',
        borderLeftWidth: unread ? 3 : 0,
        borderLeftColor: V.primary,
      }}
    >
      {/* Nested Pressable — RN targets the innermost interactive element on
          tap, so this overrides the row's own onPress for just this
          sub-region without needing stopPropagation. */}
      <Pressable onPress={() => router.push(`/profile/${other.userId}`)} hitSlop={4}>
        <AvatarPresence
          uri={other.userAvatar}
          name={other.userName}
          size="md"
          subscriptionTier={other.subscriptionTier}
          onlineStatus={presence.isOnline ? 'online' : 'offline'}
        />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text
            style={{
              fontFamily: unread ? fontFamilies.sansBold : fontFamilies.sansSemiBold,
              fontSize: CONVERSATION_ROW_NAME_SIZE,
              lineHeight: 18,
              color: V.ink,
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {other.userName}
          </Text>
          {verified ? <VerifiedBadge size="sm" /> : null}
        </View>
        {conversation.lastMessageThumbnail ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <ImageIcon size={11} color={V.inkFaint} />
            <Text
              style={{ fontFamily: fontFamilies.sans, fontSize: CONVERSATION_ROW_PREVIEW_SIZE, lineHeight: 17, color: V.inkFaint, flex: 1 }}
              numberOfLines={1}
            >
              {conversation.lastMessage || 'Photo'}
            </Text>
          </View>
        ) : (
          <Text
            style={{ fontFamily: fontFamilies.sans, fontSize: CONVERSATION_ROW_PREVIEW_SIZE, lineHeight: 17, color: V.inkFaint, marginTop: 1 }}
            numberOfLines={1}
          >
            {conversation.lastMessage || (isPro ? other.userRole : `${other.userRole.charAt(0).toUpperCase()}${other.userRole.slice(1)}`)}
          </Text>
        )}
        {inquiryLabel ? (
          <View style={{ alignSelf: 'flex-start', backgroundColor: V.primarySoft, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 }}>
            <Text style={{ fontWeight: '700', fontSize: 8.5, color: V.primaryDeep }}>{inquiryLabel}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontWeight: '500', fontSize: 9.5, color: V.inkFaint }}>{formatRelativeTime(conversation.updatedAt)}</Text>
        {unread ? (
          <View style={{ minWidth: 16, height: 16, borderRadius: 8, backgroundColor: V.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text style={{ fontWeight: '700', fontSize: 9, color: '#fff' }}>{conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
