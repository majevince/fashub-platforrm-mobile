import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, PanResponder, ActivityIndicator, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { X, Check } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';

const SCREEN_W = Dimensions.get('window').width;
const TIMELINE_W = SCREEN_W - 32;
const TIMELINE_H = 64;
const THUMB_COUNT = 10;
const HANDLE_W = 14;
const MIN_WINDOW_SECONDS = 2;

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

type Props = {
  uri: string;
  durationMs: number;
  maxDurationSeconds: number;
  onCancel: () => void;
  onConfirm: (trim: { start: number; end: number }) => void;
};

/**
 * Mobile equivalent of web's VideoTrimEditor.tsx (canvas thumbnail scrubber
 * + draggable trim handles). The actual video cutting happens server-side
 * via ffmpeg in POST /api/upload (confirmed in Step 0 — trimStart/trimEnd
 * form fields, not a client-side re-encode), so this component only needs
 * to produce a {start, end} window in seconds; it never touches the video
 * file itself. Thumbnails are generated with expo-video-thumbnails (added
 * this pass — not previously a dependency) rather than a canvas element,
 * since RN has no native <canvas>/<video> frame-capture API.
 */
export function VideoTrimEditor({ uri, durationMs, maxDurationSeconds, onCancel, onConfirm }: Props) {
  const durationSeconds = durationMs / 1000;
  const [thumbnails, setThumbnails] = useState<string[] | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(Math.min(durationSeconds, maxDurationSeconds));

  const trimStartRef = useRef(trimStart);
  const trimEndRef = useRef(trimEnd);
  trimStartRef.current = trimStart;
  trimEndRef.current = trimEnd;

  // Gesture-start snapshots — PanResponder's gestureState.dx is cumulative
  // from the start of the current gesture, not incremental per move event,
  // so drag math must always be `snapshotAtGrant + dx`, never `current + dx`.
  const startGrantValue = useRef(0);
  const endGrantValue = useRef(0);

  useEffect(() => {
    // Re-clamp if a tighter cap (e.g. music just got attached) now makes the
    // existing window too wide — matches web's exact re-open behavior.
    setTrimEnd((end) => Math.min(end, trimStartRef.current + maxDurationSeconds, durationSeconds));
  }, [maxDurationSeconds, durationSeconds]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const times = Array.from({ length: THUMB_COUNT }, (_, i) => Math.round((i / (THUMB_COUNT - 1)) * Math.max(durationMs - 200, 0)));
      const results: string[] = [];
      for (const time of times) {
        if (cancelled) return;
        try {
          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time, quality: 0.4 });
          results.push(thumbUri);
        } catch {
          // A single failed frame shouldn't block the whole filmstrip.
        }
      }
      if (!cancelled) setThumbnails(results);
    })();
    return () => {
      cancelled = true;
    };
  }, [uri, durationMs]);

  const secondsPerPx = durationSeconds / TIMELINE_W;

  const startPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startGrantValue.current = trimStartRef.current;
      },
      onPanResponderMove: (_evt, gesture) => {
        const raw = startGrantValue.current + gesture.dx * secondsPerPx;
        const lowerBound = Math.max(0, trimEndRef.current - maxDurationSeconds);
        const upperBound = trimEndRef.current - MIN_WINDOW_SECONDS;
        setTrimStart(Math.max(lowerBound, Math.min(raw, upperBound)));
      },
    })
  ).current;

  const endPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        endGrantValue.current = trimEndRef.current;
      },
      onPanResponderMove: (_evt, gesture) => {
        const raw = endGrantValue.current + gesture.dx * secondsPerPx;
        const lowerBound = trimStartRef.current + MIN_WINDOW_SECONDS;
        const upperBound = Math.min(durationSeconds, trimStartRef.current + maxDurationSeconds);
        setTrimEnd(Math.max(lowerBound, Math.min(raw, upperBound)));
      },
    })
  ).current;

  const startX = (trimStart / durationSeconds) * TIMELINE_W;
  const endX = (trimEnd / durationSeconds) * TIMELINE_W;

  return (
    <View style={{ flex: 1, backgroundColor: V.ink, justifyContent: 'center', padding: 16, gap: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <X size={22} color="#fff" />
        </Pressable>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Trim video</Text>
        <Pressable onPress={() => onConfirm({ start: trimStart, end: trimEnd })} hitSlop={8}>
          <Check size={22} color={V.primary} />
        </Pressable>
      </View>

      <Text style={{ fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>
        {fmtTime(trimStart)}–{fmtTime(trimEnd)} selected ({(trimEnd - trimStart).toFixed(1)}s, max {maxDurationSeconds}s)
      </Text>

      <View style={{ width: TIMELINE_W, height: TIMELINE_H, alignSelf: 'center', borderRadius: 8, overflow: 'hidden', backgroundColor: '#1a1a1a', flexDirection: 'row' }}>
        {thumbnails === null ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={V.primary} />
          </View>
        ) : (
          thumbnails.map((t, i) => (
            <Image key={i} source={{ uri: t }} style={{ width: TIMELINE_W / thumbnails.length, height: '100%' }} contentFit="cover" />
          ))
        )}

        {/* Dimmed regions outside the trim window */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: startX, backgroundColor: 'rgba(0,0,0,0.6)' }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: TIMELINE_W - endX, backgroundColor: 'rgba(0,0,0,0.6)' }} />

        {/* Trim window border */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: startX, top: 0, width: Math.max(endX - startX, 1), height: '100%', borderWidth: 2.5, borderColor: V.primary }}
        />

        {/* Drag handles */}
        <View
          {...startPanResponder.panHandlers}
          style={{ position: 'absolute', left: startX - HANDLE_W / 2, top: 0, width: HANDLE_W, height: '100%', backgroundColor: V.primary, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ width: 3, height: 20, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.8)' }} />
        </View>
        <View
          {...endPanResponder.panHandlers}
          style={{ position: 'absolute', left: endX - HANDLE_W / 2, top: 0, width: HANDLE_W, height: '100%', backgroundColor: V.primary, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ width: 3, height: 20, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.8)' }} />
        </View>
      </View>

      <Text style={{ fontSize: 11, fontWeight: '400', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
        Drag the handles to choose which part of your video plays
      </Text>
    </View>
  );
}
