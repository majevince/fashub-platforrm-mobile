import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, KeyboardAvoidingView, Platform, LayoutChangeEvent, Image as RNImage, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Image as ImageIcon, Video as VideoIcon, Music as MusicIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { violetColors as V } from '@fashub/design-tokens';
import { uploadFiles, createStory, resolveMediaUrl, ApiError } from '@fashub/api-client';
import type { Track } from '@fashub/types';
import { TextField } from '../TextField';
import { Button } from '../Button';
import { Banner } from '../Banner';
import { toUploadableFile } from '../../lib/uploadableFile';
import { MusicSheet, type StickerStyle } from './MusicSheet';
import { MusicStickerPreview } from './MusicStickerPreview';
import { VideoTrimEditor } from './VideoTrimEditor';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
};

// Matches web's lib/stories/durationCap.ts exactly — 15s when music is
// attached, 30s without. Server-side enforcement (app/api/upload/route.ts)
// is the real authority; these are the client-side values used to decide
// when the trim editor needs to open.
const MAX_CLIP_WITH_MUSIC_SECONDS = 15;
const MAX_VIDEO_SECONDS = 30;

export function CreateStoryModal({ visible, onClose, onCreated }: Props) {
  const { colors, typeScale, spacing, radius } = useTheme();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingVideo, setPendingVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [videoTrim, setVideoTrim] = useState<{ start: number; end: number } | null>(null);

  const [musicSheetOpen, setMusicSheetOpen] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [generatingBg, setGeneratingBg] = useState(false);
  const [bgGenTrack, setBgGenTrack] = useState<Track | null>(null);
  const [bgImageReady, setBgImageReady] = useState(false);
  const bgCaptureRef = useRef<View>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [musicVolume, setMusicVolume] = useState(1);
  const [originalVolume, setOriginalVolume] = useState(0);
  const [stickerStyle, setStickerStyle] = useState<StickerStyle>('pill');
  // Matches web's StoryForm.tsx defaults exactly (stickerPos {50,82}, scale 1, rotation 0).
  const [stickerPos, setStickerPos] = useState({ x: 50, y: 82 });
  const [stickerScale, setStickerScale] = useState(1);
  const [stickerRotation, setStickerRotation] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const hasVideo = asset?.type === 'video';

  const reset = () => {
    setAsset(null);
    setCaption('');
    setError('');
    setPendingVideo(null);
    setVideoTrim(null);
    setTrack(null);
    setTrimStart(0);
    setTrimEnd(0);
    setMusicVolume(1);
    setOriginalVolume(0);
    setStickerStyle('pill');
    setStickerPos({ x: 50, y: 82 });
    setStickerScale(1);
    setStickerRotation(0);
    setGeneratingBg(false);
    setBgGenTrack(null);
    setBgImageReady(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
      videoMaxDuration: 30,
    });
    if (result.canceled || !result.assets[0]) return;
    const picked = result.assets[0];
    // Matches web's exact trigger: only open the trim editor when the
    // selected video genuinely exceeds the cap that currently applies
    // (30s, or 15s if music is already attached) — under the cap, the
    // video is used directly with no trim step, same as web.
    const cap = track ? MAX_CLIP_WITH_MUSIC_SECONDS : MAX_VIDEO_SECONDS;
    if (picked.type === 'video' && picked.duration && picked.duration / 1000 > cap + 1) {
      setPendingVideo(picked);
      return;
    }
    setAsset(picked);
    setVideoTrim(null);
  };

  const handleTrimConfirm = (trim: { start: number; end: number }) => {
    if (!pendingVideo) return;
    setAsset(pendingVideo);
    setVideoTrim(trim);
    setPendingVideo(null);
  };

  const handleSelectTrack = (selected: Track) => {
    setTrack(selected);
    // If the video already selected (trimmed or not) now exceeds the
    // tighter 15s music cap, re-open the trim editor with that cap —
    // matches web's exact re-trigger behavior when music is attached
    // after a video was already picked.
    if (asset?.type === 'video') {
      const currentLength = videoTrim ? videoTrim.end - videoTrim.start : (asset.duration ?? 0) / 1000;
      if (currentLength > MAX_CLIP_WITH_MUSIC_SECONDS + 1) {
        setPendingVideo(asset);
      }
    }
    const clipLength = Math.min(selected.durationSeconds, MAX_CLIP_WITH_MUSIC_SECONDS);
    setTrimStart(0);
    setTrimEnd(clipLength);
    setMusicVolume(1);
    setOriginalVolume(0);
    setStickerPos({ x: 50, y: 82 });
    setStickerScale(1);
    setStickerRotation(0);

    // No media chosen yet — auto-generate a 9:16 background from the track
    // (blurred cover art, or a violet gradient card if it has none), matching
    // web's generateAlbumArtBackground behavior exactly.
    if (!asset) {
      setGeneratingBg(true);
      setBgImageReady(false);
      setBgGenTrack(selected);
    }
  };

  // Renders the hidden off-screen card (see JSX below) then snapshots it into
  // a real image file once its content is ready, and uses that as the story's
  // asset — routed through the exact same upload pipeline as any other photo.
  useEffect(() => {
    if (!bgGenTrack) return;
    if (bgGenTrack.coverArtUrl && !bgImageReady) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const uri = await captureRef(bgCaptureRef, { format: 'png', quality: 0.92, width: 1080, height: 1920 });
        if (cancelled) return;
        setAsset({
          uri,
          type: 'image',
          width: 1080,
          height: 1920,
          fileName: 'album-art-background.png',
        } as ImagePicker.ImagePickerAsset);
        setVideoTrim(null);
      } catch {
        if (!cancelled) setError("Couldn't generate a background for that song — try picking a photo or video instead.");
      } finally {
        if (!cancelled) {
          setGeneratingBg(false);
          setBgGenTrack(null);
          setBgImageReady(false);
        }
      }
    }, 30);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [bgGenTrack, bgImageReady]);

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    setCanvasSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
  };

  const handleSubmit = async () => {
    if (!asset) {
      setError('Add a photo or video first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const mediaType: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';
      const uploaded = await uploadFiles([toUploadableFile(asset.uri)], 'stories', videoTrim ?? undefined);
      await createStory({
        mediaType,
        mediaUrl: uploaded.urls[0],
        thumbnailUrl: uploaded.thumbnails?.[0],
        caption: caption.trim() || undefined,
        ...(track
          ? {
              trackId: track.id,
              trackTrimStart: trimStart,
              trackTrimEnd: trimEnd,
              trackVolume: musicVolume,
              originalAudioVolume: originalVolume,
              stickerStyle,
              stickerTransform: { x: stickerPos.x, y: stickerPos.y, rotation: stickerRotation, scale: stickerScale },
              ...(mediaType === 'image' ? { displayDurationMs: Math.round((trimEnd - trimStart) * 1000) } : {}),
            }
          : {}),
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't post your Look. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (pendingVideo) {
    const cap = track ? MAX_CLIP_WITH_MUSIC_SECONDS : MAX_VIDEO_SECONDS;
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={() => setPendingVideo(null)}>
        <VideoTrimEditor
          uri={pendingVideo.uri}
          durationMs={pendingVideo.duration ?? 0}
          maxDurationSeconds={cap}
          onCancel={() => setPendingVideo(null)}
          onConfirm={handleTrimConfirm}
        />
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.ivory }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
          <Pressable onPress={handleClose} hitSlop={8}>
            <X size={22} color={colors.ink} />
          </Pressable>
          <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Share a Look</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={{ padding: spacing.lg, gap: spacing.md, flex: 1 }}>
          {error ? <Banner tone="error">{error}</Banner> : null}

          <View
            onLayout={handleCanvasLayout}
            style={{ width: '100%', aspectRatio: 9 / 16, maxHeight: 420, alignSelf: 'center', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: asset?.type !== 'video' && asset ? colors.ink : colors.paper, position: 'relative' }}
          >
            <Pressable
              onPress={pickMedia}
              disabled={generatingBg}
              style={{ width: '100%', height: '100%', borderWidth: asset ? 0 : 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}
            >
              {asset ? (
                asset.type === 'video' ? (
                  <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inkSoft }}>
                    <VideoIcon size={32} color={colors.ivory} />
                    <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ivory, marginTop: 8 }}>Video selected</Text>
                  </View>
                ) : (
                  <Image source={{ uri: asset.uri }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                )
              ) : generatingBg ? (
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator size="small" color={colors.gold} />
                  <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.inkSoft }}>Generating background…</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <ImageIcon size={24} color={colors.gold} />
                    <VideoIcon size={24} color={colors.gold} />
                  </View>
                  <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', color: colors.inkSoft }}>Choose a photo or video</Text>
                  <Text style={{ fontSize: 11, fontWeight: '400', color: V.inkFaint, textAlign: 'center', paddingHorizontal: 24 }}>
                    JPG, PNG, WEBP · or MP4, MOV, WEBM — any length, trim to {MAX_VIDEO_SECONDS}s
                  </Text>
                </View>
              )}
            </Pressable>

            {track && canvasSize.width > 0 ? (
              <MusicStickerPreview
                track={track}
                stickerStyle={stickerStyle}
                position={stickerPos}
                rotation={stickerRotation}
                scale={stickerScale}
                canvasWidth={canvasSize.width}
                canvasHeight={canvasSize.height}
                onChangePosition={setStickerPos}
                onChangeRotation={setStickerRotation}
                onChangeScale={setStickerScale}
                onPress={() => setMusicSheetOpen(true)}
                onRemove={() => setTrack(null)}
              />
            ) : null}

            {/* Canvas toolbar — matches the reference's music-icon-reopens-sheet pattern */}
            <Pressable
              onPress={() => setMusicSheetOpen(true)}
              disabled={!asset}
              style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(20,18,16,0.55)',
                borderWidth: track ? 1 : 0,
                borderColor: colors.gold,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: asset ? 1 : 0.4,
              }}
            >
              <MusicIcon size={16} color={track ? colors.goldSoft : '#fff'} />
            </Pressable>
          </View>

          {/* Hidden off-screen render target — captured into a real PNG once
              its content is ready (see the bgGenTrack effect above), giving
              a 9:16 album-art background exactly like web's canvas-drawn
              generateAlbumArtBackground, just composed with native views
              instead of a 2D canvas context. */}
          {bgGenTrack ? (
            <View ref={bgCaptureRef} collapsable={false} style={{ position: 'absolute', width: 270, height: 480, top: -9999, left: -9999 }}>
              {bgGenTrack.coverArtUrl ? (
                <RNImage
                  source={{ uri: resolveMediaUrl(bgGenTrack.coverArtUrl) ?? bgGenTrack.coverArtUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  blurRadius={18}
                  onLoadEnd={() => setBgImageReady(true)}
                  onError={() => setBgImageReady(true)}
                />
              ) : (
                <LinearGradient colors={[V.primary, V.primaryDeep]} style={StyleSheet.absoluteFill} />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)' }]} />
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
                <Text style={{ color: '#fff', fontSize: 19, fontWeight: '700', fontStyle: 'italic', textAlign: 'center' }} numberOfLines={3}>
                  {bgGenTrack.title}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 8, fontWeight: '600', marginTop: 8, letterSpacing: 1 }}>
                  {bgGenTrack.artist.toUpperCase()}
                </Text>
              </View>
            </View>
          ) : null}

          {!asset ? (
            <Pressable
              onPress={() => setMusicSheetOpen(true)}
              disabled={generatingBg}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: colors.ivory,
                borderWidth: 1,
                borderColor: colors.line,
                opacity: generatingBg ? 0.6 : 1,
              }}
            >
              {generatingBg ? (
                <ActivityIndicator size="small" color={colors.inkSoft} />
              ) : (
                <MusicIcon size={13} color={colors.inkSoft} />
              )}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkSoft }}>
                {generatingBg ? 'Generating background…' : "Or start from a song — we'll generate a background"}
              </Text>
            </Pressable>
          ) : null}

          <TextField label="Caption (optional)" value={caption} onChangeText={setCaption} placeholder="Say something about this Look…" />

          <Button
            variant="primary"
            onPress={handleSubmit}
            disabled={submitting || !asset}
            style={{ backgroundColor: V.primary, borderRadius: 999 }}
          >
            {submitting ? 'Posting your Look…' : 'Share to Looks'}
          </Button>
          <Text style={{ fontSize: 11, fontWeight: '400', color: V.inkFaint, textAlign: 'center' }}>Visible for 24 hours</Text>
        </View>
      </KeyboardAvoidingView>

      <MusicSheet
        visible={musicSheetOpen}
        onClose={() => setMusicSheetOpen(false)}
        selectedTrack={track}
        trimStart={trimStart}
        trimEnd={trimEnd}
        musicVolume={musicVolume}
        originalVolume={originalVolume}
        stickerStyle={stickerStyle}
        maxClipSeconds={MAX_CLIP_WITH_MUSIC_SECONDS}
        hasVideo={hasVideo}
        onSelectTrack={handleSelectTrack}
        onChangeTrim={(s, e) => {
          setTrimStart(s);
          setTrimEnd(e);
        }}
        onChangeMusicVolume={setMusicVolume}
        onChangeOriginalVolume={setOriginalVolume}
        onChangeStickerStyle={setStickerStyle}
      />
    </Modal>
  );
}
