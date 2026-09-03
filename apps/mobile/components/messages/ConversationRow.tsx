import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { resolveMediaUrl } from '@fashub/api-client';
import type { Conversation } from '@fashub/types';
import { AvatarPresence } from './AvatarPresence';
import { VerifiedBadge, isVerified } from '../VerifiedBadge';
import { formatRelativeTime, getInquiryPreviewType } from '../../lib/chatFormat';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const INBOX_PRESENCE_INTERVAL_MS = 15000;

export function ConversationRow({ conversation, currentUserId, onPress }: { conversation: Conversation; currentUserId: string; onPress: () => void }) {
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
      <AvatarPresence
        uri={other.userAvatar}
        name={other.userName}
        size="md"
        subscriptionTier={other.subscriptionTier}
        onlineStatus={presence.isOnline ? 'online' : 'offline'}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontWeight: unread ? '700' : '600', fontSize: 13, color: V.ink, flexShrink: 1 }} numberOfLines={1}>
            {other.userName}
          </Text>
          {verified ? <VerifiedBadge size="sm" /> : null}
        </View>
        {conversation.lastMessageThumbnail ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <ImageIcon size={11} color={V.inkFaint} />
            <Text style={{ fontWeight: '400', fontSize: 11, color: V.inkFaint, flex: 1 }} numberOfLines={1}>
              {conversation.lastMessage || 'Photo'}
            </Text>
          </View>
        ) : (
          <Text style={{ fontWeight: '400', fontSize: 11, color: V.inkFaint, marginTop: 1 }} numberOfLines={1}>
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
