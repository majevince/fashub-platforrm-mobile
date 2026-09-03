import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Play, Pause, FileText, Check, CheckCheck, Clock, TriangleAlert, Link as LinkIcon } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { resolveMediaUrl } from '@fashub/api-client';
import type { ChatMessage } from '@fashub/types';
import { formatFileSize, formatMessageTime } from '../../lib/chatFormat';

const EMOJI_REGEX = /^(\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u;
function isEmojiOnly(content: string): boolean {
  const t = content.trim();
  return t.length > 0 && t.length <= 12 && EMOJI_REGEX.test(t);
}

function firstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/);
  return m ? m[0] : null;
}

const DOC_COLORS: Record<string, string> = {
  pdf: '#DC2626',
  doc: '#2563EB',
  docx: '#2563EB',
  xls: '#059669',
  xlsx: '#059669',
  ppt: '#EA580C',
  pptx: '#EA580C',
  zip: '#CA8A04',
  rar: '#CA8A04',
  txt: '#6B7280',
  csv: '#6B7280',
};

function FilePreview({ message }: { message: ChatMessage }) {
  const mime = message.fileMimeType || '';
  const url = resolveMediaUrl(message.fileUrl);
  if (!url) return null;

  if (mime.startsWith('image/')) {
    return <Image source={{ uri: url }} style={{ width: 220, height: 220, borderRadius: 10 }} contentFit="cover" />;
  }

  if (mime.startsWith('video/')) {
    return <VideoPreview url={url} />;
  }

  if (mime.startsWith('audio/')) {
    return <AudioPreview url={url} fileName={message.fileName} />;
  }

  const ext = (message.fileName?.split('.').pop() || '').toLowerCase();
  const color = DOC_COLORS[ext] ?? '#6B7280';
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: V.line, borderRadius: 10, padding: 10, width: 220 }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: `${color}1A`, alignItems: 'center', justifyContent: 'center' }}>
        <FileText size={16} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontWeight: '600', fontSize: 11.5, color: V.ink }} numberOfLines={1}>
          {message.fileName || 'File'}
        </Text>
        {message.fileSize ? (
          <Text style={{ fontWeight: '500', fontSize: 9.5, color: V.inkFaint }}>{formatFileSize(message.fileSize)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function VideoPreview({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  return (
    <View style={{ width: 220, height: 220, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000' }}>
      <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls />
    </View>
  );
}

function AudioPreview({ url, fileName }: { url: string; fileName?: string | null }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  return (
    <Pressable
      onPress={() => (status.playing ? player.pause() : player.play())}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: V.line, borderRadius: 10, padding: 10, width: 220 }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: V.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        {status.playing ? <Pause size={14} color={V.primary} /> : <Play size={14} color={V.primary} style={{ marginLeft: 1 }} />}
      </View>
      <Text style={{ fontWeight: '400', fontSize: 11.5, color: V.ink, flex: 1 }} numberOfLines={1}>
        {fileName || 'Audio'}
      </Text>
    </Pressable>
  );
}

/**
 * Simplified vs. web's LinkPreviewCard: web fetches /api/link-preview for a
 * real OG title/image; this renders a plain URL chip instead — a full async
 * metadata-fetch preview was judged disproportionate scope for this pass.
 * Flagged, not silently dropped.
 */
function LinkChip({ url }: { url: string }) {
  return (
    <Pressable onPress={() => Linking.openURL(url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: V.line, borderRadius: 10, padding: 9, marginTop: 4, maxWidth: 240 }}>
      <LinkIcon size={13} color={V.primary} />
      <Text style={{ fontWeight: '500', fontSize: 10.5, color: V.primary, flex: 1 }} numberOfLines={1}>
        {url}
      </Text>
    </Pressable>
  );
}

export function ReplyPreview({ replyTo, onPress }: { replyTo: NonNullable<ChatMessage['replyTo']>; onPress: () => void }) {
  const icon =
    replyTo.attachmentType === 'event' ? '📅 '
    : replyTo.attachmentType === 'project' ? '🗂️ '
    : replyTo.attachmentType === 'project_inquiry' ? '📋 '
    : '';
  const label = replyTo.attachmentTitle ? `${icon}${replyTo.attachmentTitle}` : replyTo.content || '📎 Attachment';

  return (
    <Pressable onPress={onPress} style={{ borderLeftWidth: 2, borderLeftColor: V.primary, backgroundColor: 'rgba(109,40,217,0.06)', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 4, maxWidth: 260 }}>
      <Text style={{ fontWeight: '600', fontSize: 9.5, color: V.primary }} numberOfLines={1}>
        {replyTo.senderName}
      </Text>
      <Text style={{ fontWeight: '400', fontSize: 10.5, color: V.inkSoft }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ReactionsBar({
  reactions,
  currentUserId,
  onToggle,
}: {
  reactions: ChatMessage['reactions'];
  currentUserId: string;
  onToggle: (emoji: string) => void;
}) {
  if (!reactions || reactions.length === 0) return null;

  const grouped = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const g = grouped.get(r.emoji) ?? { count: 0, mine: false };
    g.count += 1;
    if (r.userId === currentUserId) g.mine = true;
    grouped.set(r.emoji, g);
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {Array.from(grouped.entries()).map(([emoji, g]) => (
        <Pressable
          key={emoji}
          onPress={() => onToggle(emoji)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            borderRadius: 999,
            paddingHorizontal: 7,
            paddingVertical: 2.5,
            backgroundColor: g.mine ? V.primarySoft : '#F3F4F6',
            borderWidth: 1,
            borderColor: g.mine ? '#DDD6FE' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 12 }}>{emoji}</Text>
          <Text style={{ fontWeight: '700', fontSize: 10, color: g.mine ? V.primaryDeep : V.inkSoft }}>{g.count}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ReadReceipt({ status, read }: { status?: ChatMessage['status']; read: boolean }) {
  if (status === 'sending') return <Clock size={10} color="rgba(255,255,255,0.7)" />;
  if (status === 'failed') return <TriangleAlert size={10} color="#FCA5A5" />;
  if (read) return <CheckCheck size={12} color="#DDD6FE" />;
  return <Check size={12} color="rgba(255,255,255,0.6)" />;
}

type Props = {
  message: ChatMessage;
  isOwn: boolean;
  showSenderName: boolean;
  currentUserId: string;
  onLongPress: () => void;
  onToggleReaction: (emoji: string) => void;
  onScrollToReply: (id: string) => void;
};

/**
 * Plain text / file-attachment bubble — 1:1 port of web's MessageBubble.tsx.
 * Structured card types (inquiry/fabric/event/project/post/story) render via
 * MessageCards.tsx instead, from the thread screen's dispatch, not here.
 */
export function MessageBubble({ message, isOwn, showSenderName, currentUserId, onLongPress, onToggleReaction, onScrollToReply }: Props) {
  const emojiOnly = !message.fileUrl && isEmojiOnly(message.content);
  const url = !message.fileUrl && !emojiOnly ? firstUrl(message.content) : null;

  if (message.deleted) {
    return (
      <View style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ fontWeight: '400', fontSize: 11, fontStyle: 'italic', color: V.inkFaint }}>This message was deleted</Text>
      </View>
    );
  }

  return (
    <Pressable onLongPress={onLongPress} delayLongPress={400} style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
      {message.isForwarded ? (
        <Text style={{ fontWeight: '400', fontSize: 10, fontStyle: 'italic', color: V.inkFaint, marginBottom: 2 }}>
          Forwarded{message.forwardedFromUserName ? ` from ${message.forwardedFromUserName}` : ''}
        </Text>
      ) : null}

      {showSenderName && !isOwn && !emojiOnly ? (
        <Text style={{ fontWeight: '600', fontSize: 10, color: V.primary, marginBottom: 2 }}>{message.senderName}</Text>
      ) : null}

      {message.replyTo ? <ReplyPreview replyTo={message.replyTo} onPress={() => onScrollToReply(message.replyTo!.id)} /> : null}

      {emojiOnly ? (
        <Text style={{ fontSize: 40, lineHeight: 46 }}>{message.content}</Text>
      ) : message.fileUrl ? (
        <View style={{ gap: 4 }}>
          <FilePreview message={message} />
          {message.content ? (
            <View
              style={{
                backgroundColor: isOwn ? V.primary : '#F3F4F6',
                borderRadius: 14,
                borderBottomRightRadius: isOwn ? 4 : 14,
                borderBottomLeftRadius: isOwn ? 14 : 4,
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <Text style={{ fontWeight: '400', fontSize: 12.5, color: isOwn ? '#fff' : V.ink }}>{message.content}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View
          style={{
            backgroundColor: isOwn ? V.primary : '#F3F4F6',
            borderRadius: 14,
            borderBottomRightRadius: isOwn ? 4 : 14,
            borderBottomLeftRadius: isOwn ? 14 : 4,
            paddingHorizontal: 11,
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontWeight: '400', fontSize: 13, color: isOwn ? '#fff' : V.ink }}>{message.content}</Text>
        </View>
      )}
      {url ? <LinkChip url={url} /> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: isOwn ? 'flex-end' : 'flex-start', marginTop: 3 }}>
        <Text style={{ fontWeight: '500', fontSize: 9, color: V.inkFaint }}>{formatMessageTime(message.createdAt)}</Text>
        {isOwn ? <ReadReceipt status={message.status} read={message.read} /> : null}
      </View>

      <ReactionsBar reactions={message.reactions} currentUserId={currentUserId} onToggle={onToggleReaction} />
    </Pressable>
  );
}

