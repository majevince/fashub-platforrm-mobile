import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';

const SCREEN_W = Dimensions.get('window').width;

type Props = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
};

/**
 * Full-screen swipeable gallery — the multi-image sibling of PhotoLightbox
 * (which only ever shows one image, for cover/avatar). Opens positioned at
 * whichever photo was tapped, not always the first, and lets the user swipe
 * through the rest from there. Reuses the same paging/counter/dots pattern
 * already used for Project Detail's inline (non-full-screen) gallery.
 */
export function PhotoGalleryViewer({ visible, images, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

  // Modal doesn't unmount its children between closes, so neither `index`
  // state nor the ScrollView's initial contentOffset would otherwise reset
  // on a second open at a different initialIndex — resync both explicitly
  // whenever the viewer becomes visible, rather than relying on
  // onMomentumScrollEnd (which animated:false jumps don't reliably fire).
  useEffect(() => {
    if (!visible) return;
    setIndex(initialIndex);
    scrollRef.current?.scrollTo({ x: initialIndex * SCREEN_W, animated: false });
  }, [visible, initialIndex]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          contentOffset={{ x: initialIndex * SCREEN_W, y: 0 }}
        >
          {images.map((uri, i) => (
            <Pressable key={i} onPress={onClose} style={{ width: SCREEN_W, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri }} style={{ width: SCREEN_W, height: '100%' }} contentFit="contain" />
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={{ position: 'absolute', top: 52, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={20} color="#fff" />
        </Pressable>

        {images.length > 1 ? (
          <>
            <View style={{ position: 'absolute', top: 58, left: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{index + 1} / {images.length}</Text>
            </View>
            <View style={{ position: 'absolute', bottom: 44, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? V.primary : 'rgba(255,255,255,0.5)' }}
                />
              ))}
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}
