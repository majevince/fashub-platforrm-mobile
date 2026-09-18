import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { FileText, Calendar } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectPost: () => void;
  onSelectEvent: () => void;
};

/**
 * The feed composer previously opened Create Post directly — it now opens
 * this small choice sheet first, matching web's CreatePostModal landing
 * (a type-selector screen before the actual form), since there's no
 * existing multi-option "create" row on mobile to extend instead.
 */
export function ComposerChoiceSheet({ visible, onClose, onSelectPost, onSelectEvent }: Props) {
  const row = (icon: React.ReactNode, label: string, sub: string, onPress: () => void) => (
    <Pressable
      onPress={() => { onClose(); onPress(); }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 20 }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: V.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', fontSize: 14.5, color: V.ink }}>{label}</Text>
        <Text style={{ fontWeight: '400', fontSize: 12, color: V.inkFaint, marginTop: 1 }}>{sub}</Text>
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11,11,12,0.5)' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: V.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: V.line, alignSelf: 'center', marginTop: 10, marginBottom: 6 }} />
          {row(<FileText size={19} color={V.primary} />, 'Post', 'Share your latest design or update', onSelectPost)}
          {row(<Calendar size={19} color={V.primary} />, 'Event', 'Fashion show, workshop, pop-up & more', onSelectEvent)}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
