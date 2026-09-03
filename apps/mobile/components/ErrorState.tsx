import React from 'react';
import { View, Text } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';

type Props = {
  message: string;
  onRetry: () => void;
  /** Overrides the default ink/oxblood palette — for screens (e.g. Feed) running a different confirmed color system. */
  tint?: { accent: string; text: string };
};

/** Canonical error pattern — plain-spoken, always offers a retry, no generic "Something went wrong." */
export function ErrorState({ message, onRetry, tint }: Props) {
  const { colors, typeScale, spacing } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl }}>
      <CircleAlert size={32} color={tint?.accent ?? colors.oxblood} strokeWidth={1.6} />
      <Text style={{ ...typeScale.body, color: tint?.text ?? colors.ink, textAlign: 'center' }}>{message}</Text>
      <Button variant="outline" onPress={onRetry}>
        Try again
      </Button>
    </View>
  );
}
