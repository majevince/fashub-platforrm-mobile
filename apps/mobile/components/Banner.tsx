import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Tone = 'notice' | 'error';

type Props = {
  tone: Tone;
  children: string;
};

export function Banner({ tone, children }: Props) {
  const { colors, typeScale, spacing, radius } = useTheme();
  const accent = tone === 'error' ? colors.oxblood : colors.gold;

  return (
    <View
      style={{
        backgroundColor: colors.ivoryDeep,
        borderRadius: radius.md,
        borderLeftWidth: 3,
        borderLeftColor: accent,
        padding: spacing.sm + 4,
      }}
    >
      <Text style={{ ...typeScale.bodySmall, color: colors.ink }}>{children}</Text>
    </View>
  );
}
