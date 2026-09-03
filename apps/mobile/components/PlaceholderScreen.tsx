import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Divider } from './Divider';

type Props = {
  title: string;
  note: string;
};

/** Stub for tabs that aren't built yet (Step 4) — just confirms navigation + tokens hold up across screens. */
export function PlaceholderScreen({ title, note }: Props) {
  const { colors, typeScale, spacing } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.ivory }]}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ ...typeScale.h1, color: colors.ink }}>{title}</Text>
        <Divider />
        <Text style={{ ...typeScale.body, color: colors.inkSoft }}>{note}</Text>
        <Text style={{ ...typeScale.label, color: colors.inkSoft }}>NOT YET BUILT</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
