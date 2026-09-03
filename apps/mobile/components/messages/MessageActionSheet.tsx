import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Reply, Forward, Copy, Trash2 } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';

/** Web's fixed 6-emoji quick-react tray (QUICK_REACTIONS in MessageBubble.tsx / SharedMessageWrapper.tsx / EmojiPicker.tsx) — reactions never use the full emoji picker, only these. */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

type Props = {
  visible: boolean;
  onClose: () => void;
  isOwn: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
};

/**
 * Touch equivalent of web's hover-reveal action bar (React/Reply/Forward/
 * More→Delete) — long-press a message to open this instead. Delete only
 * offered when isOwn (matches web's sender-only soft-delete).
 */
export function MessageActionSheet({ visible, onClose, isOwn, onReact, onReply, onForward, onCopy, onDelete }: Props) {
  const row = (icon: React.ReactNode, label: string, onPress: () => void, destructive?: boolean) => (
    <Pressable
      onPress={() => {
        onClose();
        onPress();
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 18 }}
    >
      {icon}
      <Text style={{ fontWeight: '500', fontSize: 14.5, color: destructive ? '#DC2626' : V.ink }}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11,11,12,0.5)' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: V.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: V.line, alignSelf: 'center', marginTop: 10, marginBottom: 14 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: V.line }}>
            {QUICK_REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  onClose();
                  onReact(emoji);
                }}
                hitSlop={6}
              >
                <Text style={{ fontSize: 26 }}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          {row(<Reply size={19} color={V.inkSoft} />, 'Reply', onReply)}
          {row(<Forward size={19} color={V.inkSoft} />, 'Forward', onForward)}
          {onCopy ? row(<Copy size={19} color={V.inkSoft} />, 'Copy text', onCopy) : null}
          {isOwn && onDelete ? row(<Trash2 size={19} color="#DC2626" />, 'Delete', onDelete, true) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
