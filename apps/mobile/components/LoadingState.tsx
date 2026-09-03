import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  label?: string;
  /** Overrides the default ink/oxblood palette — for screens (e.g. Feed) running a different confirmed color system. */
  tint?: { accent: string; text: string };
};

/** Canonical loading pattern — reuse this rather than a one-off spinner per screen. */
export function LoadingState({ label, tint }: Props) {
  const { colors, typeScale, spacing } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl }}>
      <ActivityIndicator color={tint?.accent ?? colors.oxblood} />
      {label ? <Text style={{ ...typeScale.bodySmall, color: tint?.text ?? colors.inkSoft }}>{label}</Text> : null}
    </View>
  );
}
