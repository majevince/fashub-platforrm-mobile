import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  checked: boolean;
  onToggle: () => void;
  label: string;
};

export function Checkbox({ checked, onToggle, label }: Props) {
  const { colors, typeScale, spacing, radius } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}
      hitSlop={8}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: radius.sm,
          borderWidth: 1.5,
          borderColor: checked ? colors.ink : colors.line,
          backgroundColor: checked ? colors.ink : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        {checked && <Check size={13} color={colors.ivory} strokeWidth={3} />}
      </View>
      <Text style={{ ...typeScale.bodySmall, color: colors.ink, flex: 1 }}>{label}</Text>
    </Pressable>
  );
}
