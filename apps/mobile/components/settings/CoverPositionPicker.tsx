import React, { useRef, useState } from 'react';
import { Modal, View, Text, Pressable, PanResponder } from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { violetColors as V } from '@fashub/design-tokens';
import type { CoverPhotoPosition } from '@fashub/types';

type Props = {
  visible: boolean;
  uri: string;
  initialPosition?: CoverPhotoPosition | null;
  uploading: boolean;
  onConfirm: (position: CoverPhotoPosition) => void;
  onCancel: () => void;
};

/**
 * Mirrors web's CoverPositionPicker exactly — same {x, y} 0-100 percentage
 * focal point, same "drag the photo" interaction (matching web's opposite-
 * of-pointer-movement formula), rendered here via expo-image's
 * contentPosition instead of CSS object-position. Non-destructive: stores a
 * position, never a pixel crop, so the original upload is never discarded.
 */
export function CoverPositionPicker({ visible, uri, initialPosition, uploading, onConfirm, onCancel }: Props) {
  const { spacing } = useTheme();
  const [position, setPosition] = useState<CoverPhotoPosition>(initialPosition ?? { x: 50, y: 50 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const base = useRef(position);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        base.current = position;
      },
      onPanResponderMove: (_e, gesture) => {
        if (!containerSize.width || !containerSize.height) return;
        // Dragging the photo right reveals more of its left side — position
        // moves opposite to the gesture, same formula as web.
        const nextX = base.current.x - (gesture.dx / containerSize.width) * 100;
        const nextY = base.current.y - (gesture.dy / containerSize.height) * 100;
        setPosition({
          x: Math.min(100, Math.max(0, nextX)),
          y: Math.min(100, Math.max(0, nextY)),
        });
      },
    })
  ).current;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.sm }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Position your cover photo</Text>
          <Pressable onPress={onCancel} hitSlop={8}>
            <X size={22} color="#fff" />
          </Pressable>
        </View>

        <Text style={{ fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)', paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
          Drag the photo to choose what shows in the cover frame.
        </Text>

        <View
          onLayout={(e) => setContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          style={{ marginHorizontal: spacing.lg, aspectRatio: 3, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' }}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            contentPosition={{ top: `${position.y}%`, left: `${position.x}%` }}
          />
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.lg }}>
          <Pressable
            onPress={onCancel}
            disabled={uploading}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => onConfirm(position)}
            disabled={uploading}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: 'center', backgroundColor: V.primary, opacity: uploading ? 0.6 : 1 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{uploading ? 'Uploading…' : 'Save cover photo'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
