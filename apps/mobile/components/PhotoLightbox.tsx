import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  visible: boolean;
  uri: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
};

/**
 * No reusable full-screen image viewer existed anywhere on mobile before
 * this (confirmed in Step 0 — StoryViewer is the closest precedent but is
 * tightly coupled to story-specific logic). Matches web's PhotoLightbox
 * exactly in behavior/content: full-bleed contained image, close button,
 * optional name/role caption over a bottom gradient.
 */
export function PhotoLightbox({ visible, uri, title, subtitle, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
        <Pressable onPress={onClose} style={{ flex: 1 }}>
          <Image source={{ uri }} style={{ flex: 1 }} contentFit="contain" />
        </Pressable>

        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={{ position: 'absolute', top: 52, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={20} color="#fff" />
        </Pressable>

        {(title || subtitle) ? (
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 36 }}
          >
            {title ? <Text style={{ color: '#fff', fontSize: 19, fontWeight: '700' }}>{title}</Text> : null}
            {subtitle ? <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500', textTransform: 'capitalize', marginTop: 2 }}>{subtitle}</Text> : null}
          </LinearGradient>
        ) : null}
      </View>
    </Modal>
  );
}
