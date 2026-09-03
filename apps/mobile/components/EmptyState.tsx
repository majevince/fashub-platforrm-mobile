import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Overrides the default ink/inkSoft palette — for screens (e.g. Feed) running a different confirmed color system. */
  tint?: { text: string; textSoft: string };
};

/** Canonical empty-state pattern — a specific, in-voice heading plus a clear next action, not "No data found." */
export function EmptyState({ title, message, actionLabel, onAction, tint }: Props) {
  const { colors, typeScale, spacing } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl }}>
      <Text style={{ ...typeScale.h2, color: tint?.text ?? colors.ink, textAlign: 'center' }}>{title}</Text>
      <Text style={{ ...typeScale.body, color: tint?.textSoft ?? colors.inkSoft, textAlign: 'center' }}>{message}</Text>
      {actionLabel && onAction ? (
        <Button variant="primary" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
