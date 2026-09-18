import React from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

/** A tappable "soft input" row showing the current value, opening a bottom-sheet list on press — the RN equivalent of a <select>, since RN has no native select. Extracted from ProjectComposerForm for reuse (Create Event needs the identical pattern). */
export function SelectRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, fontFamilies } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.ivory, borderRadius: 14, padding: 13 }}>
      <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.ink }} numberOfLines={1}>{label}</Text>
      <ChevronDown size={15} color={colors.inkSoft} />
    </Pressable>
  );
}

export function OptionPickerModal({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const { colors, fontFamilies } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,18,16,0.4)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable style={{ backgroundColor: colors.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 15, color: colors.ink }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}><X size={18} color={colors.inkSoft} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 8 }}>
            {options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => onSelect(opt)}
                style={{ padding: 12, borderRadius: 10, backgroundColor: selected === opt ? colors.ivory : 'transparent' }}
              >
                <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: opt.startsWith('+') ? colors.gold : colors.ink }}>{opt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
