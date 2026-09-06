import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Tone = 'notice' | 'error' | 'success';

type Props = {
  tone: Tone;
  children: string;
};

const SUCCESS_GREEN = '#059669';

export function Banner({ tone, children }: Props) {
  const { colors, typeScale, spacing, radius } = useTheme();
  const accent = tone === 'error' ? colors.oxblood : tone === 'success' ? SUCCESS_GREEN : colors.gold;

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
