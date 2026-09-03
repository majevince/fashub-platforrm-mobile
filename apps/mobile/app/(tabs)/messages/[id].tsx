import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, KeyboardAvoidingView, Keyboard, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ChevronLeft, Info } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { useAuth } from '../../../context/AuthContext';
import {
  getConversation,
  getMessages,
  sendMessage,
  toggleReaction,
  deleteMessage,
  markConversationRead,
  getStory,
} from '@fashub/api-client';
import type { Conversation, ChatMessage, StoryGroup } from '@fashub/types';
import { AvatarPresence } from '../../../components/messages/AvatarPresence';
import { VerifiedBadge, isVerified } from '../../../components/VerifiedBadge';
import { MessageBubble } from '../../../components/messages/MessageBubble';
import { MessageActionSheet } from '../../../components/messages/MessageActionSheet';
import { ForwardModal } from '../../../components/messages/ForwardModal';
import { Composer, uploadStagedFile } from '../../../components/messages/Composer';
import { StoryViewer } from '../../../components/feed/StoryViewer';
import {
  InquiryCard,
  FabricMessageCard,
  EventMessageCard,
  ProjectMessageCard,
  PostMessageCard,
  StoryMessageCard,
  parseInquiryData,
  parseFabricData,
  parseEventData,
  parseProjectData,
  parsePostData,
  parseStoryData,
} from '../../../components/messages/MessageCards';
import { LoadingState } from '../../../components/LoadingState';
import { Divider } from '../../../components/Divider';
import { useOnlineStatus } from '../../../hooks/useOnlineStatus';
import { formatDayLabel, formatLastSeen, isSameDay } from '../../../lib/chatFormat';
import { TAB_BAR_STYLE } from '../_layout';

const MESSAGE_POLL_MS = 500;
const HEADER_PRESENCE_MS = 10000;
const GROUP_WINDOW_MS = 5 * 60 * 1000;

/**
 * Sample-request Approve/Decline pre-fills the composer with canned text and
 * focuses it — matches web exactly (app/chat/page.tsx lines ~1233-1240).
 * There is no real approve/decline backend action on web today; reproducing
 * that here for true parity rather than inventing one that doesn't exist.
 */
const SAMPLE_APPROVE_TEXT = "Sample request approved — I'll prepare your swatch shortly!";
const SAMPLE_DECLINE_TEXT = "Sorry, I'm unable to approve this sample request at this time.";

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // The (tabs) Tabs navigator renders a persistent bottom tab bar under
  // every screen in every tab, including this pushed thread screen (it's a
  // Stack nested inside the "messages" tab) — with nothing to hide it, that
  // ~64px bar sat between the Composer and the keyboard at all times,
  // which is the actual cause of the gap this screen was built to fix.
  // Standard React Navigation pattern: hide the parent tab bar on focus,
  // restore it on blur — matches every reference app named in the ticket
  // (LinkedIn/Instagram/WhatsApp/iMessage all hide their tab/nav bar inside
  // an open conversation).
  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => parent?.setOptions({ tabBarStyle: TAB_BAR_STYLE });
    }, [navigation])
  );

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [prefillComposer, setPrefillComposer] = useState<string | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<ChatMessage | null>(null);
  const [forwardMessage_, setForwardMessage] = useState<ChatMessage | null>(null);
  const [toast, setToast] = useState('');
  // Reopen-a-live-story state — set by a StoryMessageCard tap. Mirrors web's
  // app/chat/page.tsx exactly: GET /api/stories/[id] is the live check
  // (catches early author-deletion the card's own expiresAt snapshot can't
  // see), 404 marks that storyId unavailable rather than silently no-op.
  const [storyViewerGroup, setStoryViewerGroup] = useState<StoryGroup | null>(null);
  const [unavailableStoryIds, setUnavailableStoryIds] = useState<Set<string>>(new Set());

  const handleOpenStory = useCallback((storyId: string) => {
    getStory(storyId)
      .then((res) => setStoryViewerGroup(res.group))
      .catch(() => {
        setUnavailableStoryIds((prev) => new Set(prev).add(storyId));
        setToast('This story is no longer available');
      });
  }, []);

  const other = useMemo(() => conversation?.participants.find((p) => p.userId !== user?.id) ?? null, [conversation, user?.id]);
  const presence = useOnlineStatus(other?.userId, HEADER_PRESENCE_MS);

  useEffect(() => {
    if (!id) return;
    getConversation(id).then((res) => setConversation(res.conversation)).catch(() => {});
  }, [id]);

  const loadMessages = useCallback(() => {
    if (!id) return;
    getMessages(id).then((msgs) => {
      setMessages((prev) => (prev === null || msgs.length > prev.length ? msgs : prev));
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    loadMessages();
    const pollId = setInterval(loadMessages, MESSAGE_POLL_MS);
    return () => clearInterval(pollId);
  }, [loadMessages]);

  useEffect(() => {
    if (id && user) markConversationRead(id, user.id).catch(() => {});
  }, [id, user, messages?.length]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages?.length]);

  // Keeps the newest message visible alongside the composer once the
  // keyboard finishes animating in — scrollToEnd on its own (the effect
  // above) fires before the keyboard has resized the screen, so the last
  // message can still end up hidden behind it without this.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!user || !id) return null;

  const handleSend = async ({ content, file }: { content: string; file?: { uri: string; name: string; size: number; mimeType: string } }) => {
    if (!other) return;
    let fileFields: Partial<{ fileUrl: string; fileName: string; fileSize: number; fileMimeType: string }> = {};
    if (file) {
      try {
        const uploaded = await uploadStagedFile(file);
        fileFields = uploaded;
      } catch {
        Alert.alert("Couldn't attach file", 'Please try again.');
        return;
      }
    }
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: id,
      senderId: user.id,
      senderName: user.displayName,
      senderAvatar: user.avatar,
      recipientId: other.userId,
      content,
      read: false,
      createdAt: new Date().toISOString(),
      attachmentType: null,
      attachmentData: null,
      fileUrl: fileFields.fileUrl ?? null,
      fileName: fileFields.fileName ?? null,
      fileSize: fileFields.fileSize ?? null,
      fileMimeType: fileFields.fileMimeType ?? null,
      replyToId: replyingTo?.id ?? null,
      replyTo: replyingTo
        ? { id: replyingTo.id, senderId: replyingTo.senderId, senderName: replyingTo.senderName, content: replyingTo.content, attachmentType: replyingTo.attachmentType }
        : null,
      reactions: [],
      deleted: false,
      isForwarded: false,
      status: 'sending',
    };
    setMessages((prev) => [...(prev ?? []), optimistic]);
    setReplyingTo(null);

    try {
      const res = await sendMessage(id, {
        senderId: user.id,
        recipientId: other.userId,
        content,
        replyToId: optimistic.replyToId,
        ...fileFields,
      });
      setMessages((prev) => (prev ?? []).map((m) => (m.id === optimistic.id ? res.data : m)));
    } catch {
      setMessages((prev) => (prev ?? []).map((m) => (m.id === optimistic.id ? { ...m, status: 'failed' } : m)));
    }
  };

  const handleToggleReaction = async (message: ChatMessage, emoji: string) => {
    setMessages((prev) =>
      (prev ?? []).map((m) => {
        if (m.id !== message.id) return m;
        const mine = m.reactions.find((r) => r.userId === user.id && r.emoji === emoji);
        const next = mine ? m.reactions.filter((r) => !(r.userId === user.id && r.emoji === emoji)) : [...m.reactions, { emoji, userId: user.id, userName: user.displayName }];
        return { ...m, reactions: next };
      })
    );
    try {
      const res = await toggleReaction(id, { messageId: message.id, userId: user.id, userName: user.displayName, emoji });
      setMessages((prev) => (prev ?? []).map((m) => (m.id === message.id ? { ...m, reactions: res.reactions } : m)));
    } catch {
      loadMessages();
    }
  };

  const handleDelete = async (message: ChatMessage) => {
    try {
      await deleteMessage(id, { messageId: message.id, userId: user.id });
      setMessages((prev) => (prev ?? []).map((m) => (m.id === message.id ? { ...m, deleted: true, content: '', attachmentData: null, fileUrl: null } : m)));
    } catch {
      setToast("Couldn't delete message");
    }
  };

  const handleCopy = async (message: ChatMessage) => {
    if (message.content) {
      await Clipboard.setStringAsync(message.content);
      setToast('Copied');
    }
  };

  const scrollToMessage = (msgId: string) => {
    const idx = (messages ?? []).findIndex((m) => m.id === msgId);
    if (idx >= 0) listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.4 });
  };

  const replyPlaceholderName = other?.userName ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: V.surface }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: V.line }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={V.ink} />
          </Pressable>
          {other ? (
            <>
              <AvatarPresence uri={other.userAvatar} name={other.userName} size="sm" subscriptionTier={other.subscriptionTier} onlineStatus={presence.isOnline ? 'online' : 'offline'} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: V.ink }} numberOfLines={1}>
                    {other.userName}
                  </Text>
                  {isVerified({ subscriptionTier: other.subscriptionTier, verified: other.isVerified }) ? <VerifiedBadge size="sm" /> : null}
                </View>
                <Text style={{ fontWeight: '400', fontSize: 10, color: presence.isOnline ? '#16A34A' : V.inkFaint }}>
                  {presence.isOnline ? 'Active now' : formatLastSeen(presence.lastActive)}
                </Text>
              </View>
            </>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {/* Web's info button opens a desktop Project-Workflows context panel —
              a separate, larger feature area, out of scope here (see final report). */}
          <Info size={17} color={V.primary} />
        </View>

        {/* Messages */}
        {messages === null ? (
          <LoadingState tint={{ accent: V.primary, text: V.inkSoft }} />
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 32 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: V.ink }}>Start a conversation</Text>
            <Text style={{ fontWeight: '400', fontSize: 12, color: V.inkFaint, textAlign: 'center' }}>Say hello to {replyPlaceholderName}!</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={{ flex: 1 }}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 12, gap: 6 }}
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={() => {}}
            renderItem={({ item, index }) => {
              const isOwn = item.senderId === user.id;
              const prev = index > 0 ? messages[index - 1] : null;
              const showDaySeparator = !prev || !isSameDay(prev.createdAt, item.createdAt);
              const isGrouped = !!prev && !showDaySeparator && prev.senderId === item.senderId && new Date(item.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;

              const inquiry = parseInquiryData(item.attachmentType, item.attachmentData);
              const fabric = parseFabricData(item.attachmentType, item.attachmentData);
              const event = parseEventData(item.attachmentType, item.attachmentData);
              const project = parseProjectData(item.attachmentType, item.attachmentData);
              const post = parsePostData(item.attachmentType, item.attachmentData);
              const story = parseStoryData(item.attachmentType, item.attachmentData);

              const openActions = () => setActionSheetMessage(item);

              let body: React.ReactNode;
              if (inquiry) {
                body = <InquiryCard data={inquiry} isOwn={isOwn} senderName={item.senderName} />;
              } else if (fabric) {
                body = (
                  <FabricMessageCard
                    data={fabric}
                    isOwn={isOwn}
                    senderName={item.senderName}
                    timestamp={item.createdAt}
                    onApprove={fabric.isSampleRequest && !isOwn ? () => setPrefillComposer(SAMPLE_APPROVE_TEXT) : undefined}
                    onDecline={fabric.isSampleRequest && !isOwn ? () => setPrefillComposer(SAMPLE_DECLINE_TEXT) : undefined}
                  />
                );
              } else if (event) {
                body = <EventMessageCard data={event} senderName={item.senderName} />;
              } else if (project) {
                body = <ProjectMessageCard data={project} senderName={item.senderName} />;
              } else if (post) {
                body = <PostMessageCard data={post} />;
              } else if (story) {
                body = (
                  <StoryMessageCard
                    data={story}
                    onOpen={() => handleOpenStory(story.storyId)}
                    unavailable={unavailableStoryIds.has(story.storyId)}
                  />
                );
              } else {
                body = (
                  <MessageBubble
                    message={item}
                    isOwn={isOwn}
                    showSenderName={!isGrouped}
                    currentUserId={user.id}
                    onLongPress={openActions}
                    onToggleReaction={(emoji) => handleToggleReaction(item, emoji)}
                    onScrollToReply={scrollToMessage}
                  />
                );
              }

              return (
                <View>
                  {showDaySeparator ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Divider color={V.line} />
                      </View>
                      <Text style={{ fontWeight: '500', fontSize: 9.5, color: V.inkFaint }}>{formatDayLabel(item.createdAt)}</Text>
                      <View style={{ flex: 1 }}>
                        <Divider color={V.line} />
                      </View>
                    </View>
                  ) : null}
                  {inquiry || fabric || event || project || post || story ? (
                    <Pressable onLongPress={openActions} delayLongPress={400} style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', marginTop: isGrouped ? 2 : 8 }}>
                      {body}
                    </Pressable>
                  ) : (
                    <View style={{ marginTop: isGrouped ? 2 : 8 }}>{body}</View>
                  )}
                </View>
              );
            }}
          />
        )}

        {toast ? (
          <View style={{ position: 'absolute', bottom: 90, alignSelf: 'center', backgroundColor: 'rgba(20,18,16,0.85)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ fontWeight: '600', fontSize: 12, color: '#fff' }}>{toast}</Text>
          </View>
        ) : null}

        <Composer
          key={prefillComposer ?? 'default'}
          otherUserName={other?.userName ?? ''}
          replyingTo={replyingTo}
          onDismissReply={() => setReplyingTo(null)}
          onSend={handleSend}
          initialText={prefillComposer ?? undefined}
        />
      </KeyboardAvoidingView>

      <MessageActionSheet
        visible={!!actionSheetMessage}
        onClose={() => setActionSheetMessage(null)}
        isOwn={actionSheetMessage?.senderId === user.id}
        onReact={(emoji) => actionSheetMessage && handleToggleReaction(actionSheetMessage, emoji)}
        onReply={() => actionSheetMessage && setReplyingTo(actionSheetMessage)}
        onForward={() => actionSheetMessage && setForwardMessage(actionSheetMessage)}
        onCopy={actionSheetMessage?.content ? () => actionSheetMessage && handleCopy(actionSheetMessage) : undefined}
        onDelete={() => actionSheetMessage && handleDelete(actionSheetMessage)}
      />

      <ForwardModal
        visible={!!forwardMessage_}
        onClose={() => setForwardMessage(null)}
        message={forwardMessage_}
        currentUserId={user.id}
        onForwarded={(count) => setToast(count > 0 ? `Forwarded to ${count} conversation${count > 1 ? 's' : ''}` : 'Forward failed')}
      />

      {storyViewerGroup ? (
        <StoryViewer
          group={storyViewerGroup}
          currentUserId={user.id}
          onClose={() => setStoryViewerGroup(null)}
          onViewed={() => {}}
          onDeleted={() => {}}
        />
      ) : null}
    </SafeAreaView>
  );
}
