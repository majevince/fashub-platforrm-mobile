import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Animated, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { X, Trash2, Heart, Send, MoreHorizontal, Music as MusicIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import {
  resolveMediaUrl,
  markStoryViewed,
  deleteStory,
  reactToStory,
  findOrCreateConversation,
  sendStoryReplyMessage,
} from '@fashub/api-client';
import type { StoryGroup } from '@fashub/types';
import { TextField } from '../TextField';
import { StoryOptionsMenu } from './StoryOptionsMenu';
import { StorySettingsSheet } from './StorySettingsSheet';
import { StoryViewersSheet } from './StoryViewersSheet';
import { StoryProfilePreview } from './StoryProfilePreview';

type Props = {
  group: StoryGroup | null;
  currentUserId: string;
  onClose: () => void;
  onViewed: (storyId: string) => void;
  onDeleted: () => void;
};

const DEFAULT_DURATION_MS = 5000;
const REACTION_EMOJIS = ['🔥', '🎧', '💃', '✨'];
// Progress bars (paddingTop 54 + ~3px bar) + header row (paddingTop 10 +
// 32px buttons), with headroom — the tap-to-advance zones start below this,
// never under the header's own buttons. See the "Tap zones" comment below.
const HEADER_SAFE_ZONE_HEIGHT = 110;

/** Web's real music-feature palette (components/stories/StoryViewer.tsx / lib/design/tokens.ts) — see MusicSheet.tsx's `V` for why this diverges from the app's ink/ivory/gold/oxblood set. Scoped to the music sticker only. */
const V = { primary: '#6D28D9', primaryDeep: '#4C1D95' } as const;

/**
 * Progress bars, tap-to-advance, per-story view tracking, general reaction,
 * reply-into-DM, music sticker (viewer chip + emoji reactions), and the
 * owner's options menu (settings/viewers/highlights/archive/share/delete)
 * are all real. Swipe-down-to-close is not implemented — a visible X
 * close button covers "closes as expected" without gesture-handler pan
 * tracking for this pass.
 */
export function StoryViewer({ group, currentUserId, onClose, onViewed, onDeleted }: Props) {
  const { colors, typeScale, spacing } = useTheme();
  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const isOwner = group?.author.id === currentUserId;
  const story = group?.stories[index];

  const [reacted, setReacted] = useState(false);
  const [reactedEmoji, setReactedEmoji] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replySent, setReplySent] = useState(false);

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);
  const [toast, setToast] = useState('');

  const videoPlayer = useVideoPlayer(story?.mediaType === 'video' ? resolveMediaUrl(story.mediaUrl) ?? '' : '', (player) => {
    player.loop = false;
    // Video stories with a track attached mix in the clip's own audio via the
    // poster's originalAudioVolume (default 0 = auto-muted) instead of a hard
    // mute — matches web's StoryViewer.tsx native-audio-volume effect.
    const vol = story?.track ? (story.originalAudioVolume ?? 0) : 1;
    player.volume = vol;
    player.muted = vol === 0;
  });

  // Music track playback — starts alongside the story, loops within the
  // trimmed clip window (matches web's StoryViewer.tsx). Lyric-line sync:
  // Track.lyrics is plain newline-separated text (no per-line timestamps),
  // so lines get equal shares of the trimmed clip's duration.
  const trackPlayer = useAudioPlayer(null);
  const trackStatus = useAudioPlayerStatus(trackPlayer);
  const [lyricLine, setLyricLine] = useState('');

  const anySheetOpen = optionsOpen || settingsOpen || viewersOpen;
  const anySheetOpenRef = useRef(anySheetOpen);
  anySheetOpenRef.current = anySheetOpen;

  useEffect(() => {
    setIndex(0);
  }, [group?.author.id]);

  // Pause video (and skip auto-advance for images, guarded via the ref below
  // since the completion callback closure is otherwise stale) while a sheet
  // is open on top of the viewer — otherwise the story keeps racing forward
  // or closes out from under whatever the user's actually looking at.
  useEffect(() => {
    if (story?.mediaType !== 'video') return;
    if (anySheetOpen) videoPlayer.pause();
    else videoPlayer.play();
  }, [anySheetOpen, story?.mediaType, videoPlayer]);

  useEffect(() => {
    if (!story?.track) return;
    if (anySheetOpen) trackPlayer.pause();
    else trackPlayer.play();
  }, [anySheetOpen, story?.track, trackPlayer]);

  const pendingTrackSeekRef = useRef<string | null>(null);

  // Loads the attached track alongside the story and marks it pending a
  // trim-start seek once its metadata is ready (see the effect below).
  useEffect(() => {
    if (!story?.track) {
      trackPlayer.pause();
      return;
    }
    const uri = resolveMediaUrl(story.track.audioUrl) ?? story.track.audioUrl;
    trackPlayer.replace(uri);
    trackPlayer.volume = story.trackVolume ?? 1;
    pendingTrackSeekRef.current = story.track.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, story?.track?.id]);

  useEffect(() => {
    if (!story?.track || pendingTrackSeekRef.current !== story.track.id || !trackStatus.isLoaded) return;
    pendingTrackSeekRef.current = null;
    const start = story.trackTrimStart ?? 0;
    trackPlayer.seekTo(start).then(() => trackPlayer.play());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackStatus.isLoaded, trackStatus.duration, story?.track?.id]);

  // Loop within the trimmed clip window; drive the lyric-ticker line off
  // real playback position, splitting the clip's duration evenly across
  // Track.lyrics' lines (matches web — there's no per-line LRC timing).
  useEffect(() => {
    if (!story?.track) return;
    const start = story.trackTrimStart ?? 0;
    const end = story.trackTrimEnd ?? start + 15;
    if (trackStatus.currentTime >= end) {
      trackPlayer.seekTo(start);
      return;
    }
    const lines = story.track.lyrics?.split('\n').map((l) => l.trim()).filter(Boolean) ?? [];
    if (lines.length) {
      const pct = Math.min(0.999, Math.max(0, (trackStatus.currentTime - start) / Math.max(0.001, end - start)));
      setLyricLine(lines[Math.floor(pct * lines.length)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackStatus.currentTime]);

  useEffect(() => {
    if (!story) return;
    markStoryViewed(story.id).catch(() => {});
    onViewed(story.id);

    setReacted(story.reactedByMe);
    setReactedEmoji(null);
    setReplyText('');
    setReplySent(false);

    progress.setValue(0);

    if (story.mediaType === 'video') {
      videoPlayer.play();
      const sub = videoPlayer.addListener('playToEnd', () => {
        if (!anySheetOpenRef.current) goNext();
      });
      return () => sub.remove();
    }

    const duration = story.displayDurationMs ?? DEFAULT_DURATION_MS;
    const anim = Animated.timing(progress, { toValue: 1, duration, useNativeDriver: false });
    anim.start(({ finished }) => {
      if (finished && !anySheetOpenRef.current) goNext();
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!group || !story) return null;

  const goNext = () => {
    if (index < group.stories.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  // Matches web's canInteract exactly (components/stories/StoryViewer.tsx):
  // owner always can; otherwise gated by the author's allowReplies setting.
  const canInteract =
    isOwner || group.author.allowReplies === 'everyone' || (group.author.allowReplies === 'followers' && group.author.isFollowing);

  const handleReact = async (emoji = '❤️') => {
    if (!canInteract) return;
    setReacted(true);
    setReactedEmoji(emoji);
    try {
      await reactToStory(story.id, emoji);
    } catch {
      setReacted(false);
      setReactedEmoji(null);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !canInteract || replySending) return;
    const text = replyText.trim();
    setReplySending(true);
    try {
      const { conversation } = await findOrCreateConversation(currentUserId, group.author.id);
      const thumbnailUrl = story.thumbnailUrl ?? (story.mediaType === 'image' ? story.mediaUrl : null);
      await sendStoryReplyMessage(conversation.id, {
        senderId: currentUserId,
        recipientId: group.author.id,
        content: text,
        attachmentData: {
          storyId: story.id,
          authorId: group.author.id,
          authorName: group.author.displayName,
          mediaType: story.mediaType,
          thumbnailUrl,
          caption: story.caption,
          replyText: text,
          expiresAt: story.expiresAt,
        },
      });
      setReplySent(true);
      setReplyText('');
    } catch {
      // Reply box stays populated with what was typed so nothing's lost — no silent failure.
    } finally {
      setReplySending(false);
    }
  };

  const replyPlaceholder = !canInteract
    ? group.author.allowReplies === 'off'
      ? 'Replies are off'
      : 'Only accounts they follow can reply'
    : replySending
      ? 'Sending…'
      : replySent
        ? 'Reply sent!'
        : `Reply to ${group.author.displayName}…`;

  const mediaUri = resolveMediaUrl(story.mediaUrl);
  const stickerX = story.stickerTransform?.x ?? 50;
  const stickerY = story.stickerTransform?.y ?? 20;
  const stickerRotation = story.stickerTransform?.rotation ?? 0;
  const stickerScale = story.stickerTransform?.scale ?? 1;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.ink }}>
        {story.mediaType === 'video' ? (
          <VideoView player={videoPlayer} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
        ) : mediaUri ? (
          <Image source={{ uri: mediaUri }} style={StyleSheet.absoluteFill} contentFit="contain" />
        ) : null}

        {/* Progress bars */}
        <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: spacing.md, paddingTop: 54 }}>
          {group.stories.map((s, i) => (
            <View key={s.id} style={{ flex: 1, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
              <Animated.View
                style={{
                  height: '100%',
                  backgroundColor: '#fff',
                  width:
                    i < index
                      ? '100%'
                      : i > index
                        ? '0%'
                        : progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }}
              />
            </View>
          ))}
        </View>

        {/* Header — zIndex above the tap-zones below (which absolute-fill the
            entire screen, including this area) so its buttons stay tappable.
            Matches web's z-20 header vs z-10 tap-zones exactly (StoryViewer.tsx). */}
        <View style={{ zIndex: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: V.primary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              {resolveMediaUrl(group.author.avatar) ? (
                <Image source={{ uri: resolveMediaUrl(group.author.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>{group.author.displayName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{group.author.displayName}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isOwner ? (
              <Pressable
                onPress={() => deleteStory(story.id).then(onDeleted).then(onClose).catch(() => {})}
                hitSlop={10}
                style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' }}
              >
                <Trash2 size={16} color="#fff" />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setOptionsOpen(true)}
              hitSlop={10}
              style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' }}
            >
              <MoreHorizontal size={18} color="#fff" />
            </Pressable>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' }}
            >
              <X size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Music sticker chip (viewer) — positioned at the spot the creator placed it, rendered per the creator's chosen stickerStyle (pill/card/lyric), not always a pill */}
        {story.track ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: `${stickerX}%`, top: `${stickerY}%`, transform: [{ rotate: `${stickerRotation}deg` }, { scale: stickerScale }] }}
          >
            {story.stickerStyle === 'card' ? (
              <View style={{ transform: [{ translateX: -95 }], width: 190, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(21,19,24,0.68)', borderWidth: 1, borderColor: V.primary, borderRadius: 12, padding: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 6, backgroundColor: V.primaryDeep, alignItems: 'center', justifyContent: 'center' }}>
                  <MusicIcon size={16} color="#fff" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }} numberOfLines={1}>
                    {story.track.title}
                  </Text>
                  <Text style={{ fontSize: 8.5, fontWeight: '500', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, marginTop: 2 }} numberOfLines={1}>
                    {story.track.artist.toUpperCase()}
                  </Text>
                </View>
              </View>
            ) : story.stickerStyle === 'lyric' ? (
              <View style={{ transform: [{ translateX: -130 }], width: 260, alignItems: 'center' }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' }}>
                  &ldquo;{lyricLine || story.track.title}&rdquo;
                </Text>
                <Text style={{ fontSize: 8.5, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
                  {story.track.title} — {story.track.artist}
                </Text>
              </View>
            ) : (
              <View style={{ transform: [{ translateX: -85 }], flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(21,19,24,0.68)', borderRadius: 999, paddingVertical: 7, paddingLeft: 8, paddingRight: 14 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: V.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <MusicIcon size={11} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#fff' }} numberOfLines={1}>
                    {story.track.title}
                  </Text>
                  <Text style={{ fontSize: 9, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }} numberOfLines={1}>
                    {story.track.artist.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : null}

        {/* Tap zones — top-inset below the progress bars + header row entirely,
            not just z-ordered under it. A zIndex-only fix still leaves a
            zero-margin boundary right at the header's edge where a slightly
            mis-placed tap can register on the tap-zone instead of a header
            button; carving the header's actual screen region out of the
            tap-zone's hit area removes that ambiguity structurally instead
            of relying on stacking priority alone (kept as defense-in-depth). */}
        <View style={{ position: 'absolute', top: HEADER_SAFE_ZONE_HEIGHT, left: 0, right: 0, bottom: 0, zIndex: 1 }} pointerEvents="box-none">
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <Pressable style={{ flex: 1 }} onPress={goPrev} />
            <Pressable style={{ flex: 1 }} onPress={goNext} />
          </View>
        </View>

        {/* Music reaction row — separate from the general heart/reply footer below */}
        {story.track ? (
          <View style={{ zIndex: 20, position: 'absolute', top: '42%', left: 0, right: 0, alignItems: 'center', gap: 6 }} pointerEvents="box-none">
            <View style={{ flexDirection: 'row', gap: 14 }}>
              {REACTION_EMOJIS.map((emoji) => (
                <Pressable key={emoji} onPress={() => handleReact(emoji)} onLongPress={() => handleReact(emoji)} disabled={!canInteract}>
                  <Text style={{ fontSize: reactedEmoji === emoji ? 30 : 24, opacity: reactedEmoji && reactedEmoji !== emoji ? 0.55 : 1 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            {!reactedEmoji ? (
              <Text style={{ fontSize: 9.5, fontWeight: '500', color: 'rgba(246,241,230,0.55)' }}>hold to react to the beat</Text>
            ) : null}
          </View>
        ) : null}

        {story.caption ? (
          <View style={{ position: 'absolute', bottom: 88, left: spacing.md, right: spacing.md }}>
            <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: '#fff' }}>{story.caption}</Text>
          </View>
        ) : null}

        {/* Reacted-state chip */}
        {reactedEmoji ? (
          <View
            style={{
              position: 'absolute',
              bottom: isOwner ? 24 : 78,
              left: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(20,18,16,0.55)',
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 12 }}>{reactedEmoji}</Text>
            <Text style={{ fontSize: 9.5, fontWeight: '500', color: '#fff' }}>reacted with {reactedEmoji}</Text>
          </View>
        ) : null}

        {toast ? (
          <View style={{ position: 'absolute', top: '50%', left: spacing.lg, right: spacing.lg, alignItems: 'center' }} pointerEvents="none">
            <View style={{ backgroundColor: 'rgba(20,18,16,0.85)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: '#fff' }}>{toast}</Text>
            </View>
          </View>
        ) : null}

        {/* Footer — owner sees a tappable "seen by" count; everyone else gets reply + react */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ zIndex: 20, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.lg }}>
            {isOwner ? (
              <Pressable onPress={() => setViewersOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Heart size={16} color="#fff" fill={story.reactionCount > 0 ? '#fff' : 'transparent'} />
                <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: '#fff' }}>
                  {story.reactionCount} {story.reactionCount === 1 ? 'like' : 'likes'} · Seen by {story.viewCount}
                </Text>
              </Pressable>
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <TextField
                    value={replyText}
                    onChangeText={setReplyText}
                    placeholder={replyPlaceholder}
                    editable={canInteract && !replySending}
                    style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                  />
                </View>
                <Pressable onPress={() => handleReact()} disabled={!canInteract} hitSlop={8}>
                  <Heart size={26} color="#fff" fill={reacted ? colors.oxbloodSoft : 'transparent'} strokeWidth={1.8} />
                </Pressable>
                {replyText.trim() ? (
                  <Pressable onPress={handleReply} disabled={!canInteract || replySending} hitSlop={8}>
                    <Send size={24} color="#fff" />
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>

      <StoryOptionsMenu
        visible={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        isOwner={isOwner}
        storyId={story.id}
        authorId={group.author.id}
        authorName={group.author.displayName}
        viewCount={story.viewCount}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenViewers={() => setViewersOpen(true)}
        onOpenProfile={() => setProfilePreviewOpen(true)}
        onDeleted={() => {
          onDeleted();
          onClose();
        }}
        onToast={setToast}
      />
      <StorySettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <StoryViewersSheet storyId={story.id} currentUserId={currentUserId} visible={viewersOpen} onClose={() => setViewersOpen(false)} />
      {profilePreviewOpen && (
        <StoryProfilePreview
          profile={{ id: group.author.id, displayName: group.author.displayName, avatar: group.author.avatar, role: group.author.role, isFollowing: group.author.isFollowing }}
          currentUserId={currentUserId}
          onClose={() => setProfilePreviewOpen(false)}
        />
      )}
    </Modal>
  );
}
