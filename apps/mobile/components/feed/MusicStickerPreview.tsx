import React, { useRef } from 'react';
import { View, Text, PanResponder, Pressable } from 'react-native';
import { Music as MusicIcon, X, RotateCw, Maximize2 } from 'lucide-react-native';
import type { Track } from '@fashub/types';
import type { StickerStyle } from './MusicSheet';

type Position = { x: number; y: number };

type Props = {
  track: Track;
  stickerStyle: StickerStyle;
  position: Position;
  rotation: number;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
  onChangePosition: (pos: Position) => void;
  onChangeRotation: (deg: number) => void;
  onChangeScale: (scale: number) => void;
  onPress: () => void;
  onRemove: () => void;
};

/** Web's real palette for this feature — see MusicSheet.tsx's `V` for why. */
const V = { ink: '#1B1523', primary: '#6D28D9', primaryDeep: '#4C1D95', ivory: '#F6F1E6' } as const;

const POSITION_MARGIN = 8;
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.8;
// Matches web's StoryForm.tsx exactly: scale = clamp(distance-from-center / 70, MIN, MAX),
// rotation = atan2(dy, dx) in degrees + 90 (handle sits above center at rotation 0).
const RESIZE_DIVISOR = 70;

/**
 * On-canvas sticker — position drag (tap the body) plus web-equivalent
 * resize (bottom-right handle) and rotate (top handle) gestures, matching
 * StoryForm.tsx's move/resize/rotate model 1:1. Trim/volume/style controls
 * live in MusicSheet; tap the sticker body to reopen it.
 */
export function MusicStickerPreview({
  track,
  stickerStyle,
  position,
  rotation,
  scale,
  canvasWidth,
  canvasHeight,
  onChangePosition,
  onChangeRotation,
  onChangeScale,
  onPress,
  onRemove,
}: Props) {
  const base = useRef(position);
  const wrapperRef = useRef<View>(null);
  const center = useRef({ x: 0, y: 0 });

  const drag = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => (base.current = position),
      onPanResponderMove: (_e, g) => {
        const deltaXPct = (g.dx / canvasWidth) * 100;
        const deltaYPct = (g.dy / canvasHeight) * 100;
        onChangePosition({
          x: Math.max(POSITION_MARGIN, Math.min(100 - POSITION_MARGIN, base.current.x + deltaXPct)),
          y: Math.max(POSITION_MARGIN, Math.min(100 - POSITION_MARGIN, base.current.y + deltaYPct)),
        });
      },
      onPanResponderRelease: (_e, g) => {
        // A drag that barely moved counts as a tap — reopens the sheet.
        if (Math.abs(g.dx) < 4 && Math.abs(g.dy) < 4) onPress();
      },
    })
  ).current;

  const measureCenter = () => {
    wrapperRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      center.current = { x: pageX + width / 2, y: pageY + height / 2 };
    });
  };

  const resizeHandle = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: measureCenter,
      onPanResponderMove: (e) => {
        const dist = Math.hypot(e.nativeEvent.pageX - center.current.x, e.nativeEvent.pageY - center.current.y);
        onChangeScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, dist / RESIZE_DIVISOR)));
      },
    })
  ).current;

  const rotateHandle = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: measureCenter,
      onPanResponderMove: (e) => {
        const angle = (Math.atan2(e.nativeEvent.pageY - center.current.y, e.nativeEvent.pageX - center.current.x) * 180) / Math.PI;
        onChangeRotation(Math.round(angle + 90));
      },
    })
  ).current;

  const wrapperStyle = {
    position: 'absolute' as const,
    left: `${position.x}%` as const,
    top: `${position.y}%` as const,
    transform: [{ rotate: `${rotation}deg` }, { scale }],
  };

  const removeBadge = (
    <Pressable onPress={onRemove} hitSlop={8} style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: 10, backgroundColor: V.ink, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
      <X size={11} color={V.ivory} />
    </Pressable>
  );

  const handles = (
    <>
      <View {...rotateHandle.panHandlers} style={{ position: 'absolute', top: -22, left: '50%', transform: [{ translateX: -10 }], width: 20, height: 20, borderRadius: 10, backgroundColor: V.primary, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <RotateCw size={10} color="#fff" />
      </View>
      <View {...resizeHandle.panHandlers} style={{ position: 'absolute', bottom: -8, right: -8, width: 20, height: 20, borderRadius: 10, backgroundColor: V.primary, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <Maximize2 size={10} color="#fff" />
      </View>
    </>
  );

  if (stickerStyle === 'card') {
    return (
      <View ref={wrapperRef} style={[wrapperStyle, { marginLeft: -95, width: 190 }]}>
        {removeBadge}
        {handles}
        <View {...drag.panHandlers} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(21,19,24,0.68)', borderWidth: 1, borderColor: V.primary, borderRadius: 12, padding: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 6, backgroundColor: V.primaryDeep, alignItems: 'center', justifyContent: 'center' }}>
            <MusicIcon size={16} color="#fff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={{ fontSize: 8.5, fontWeight: '500', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, marginTop: 2 }} numberOfLines={1}>
              {track.artist.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (stickerStyle === 'lyric') {
    const line = track.lyrics?.split('\n')[0]?.replace(/^\[\d+:\d+\]\s*/, '') || track.title;
    return (
      <View ref={wrapperRef} style={[wrapperStyle, { marginLeft: -130, width: 260, alignItems: 'center' }]}>
        {removeBadge}
        {handles}
        <View {...drag.panHandlers} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' }}>&ldquo;{line}&rdquo;</Text>
          <Text style={{ fontSize: 8.5, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
            {track.title} — {track.artist}
          </Text>
        </View>
      </View>
    );
  }

  // pill (default)
  return (
    <View ref={wrapperRef} style={[wrapperStyle, { marginLeft: -85 }]}>
      {removeBadge}
      {handles}
      <View {...drag.panHandlers} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(21,19,24,0.68)', borderRadius: 999, paddingVertical: 7, paddingLeft: 8, paddingRight: 14 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: V.primary, alignItems: 'center', justifyContent: 'center' }}>
          <MusicIcon size={11} color="#fff" />
        </View>
        <View>
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#fff' }} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={{ fontSize: 9, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }} numberOfLines={1}>
            {track.artist.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
}
