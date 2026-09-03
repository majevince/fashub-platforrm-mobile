import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  children: string;
};

/**
 * Native port of the prototype's SwingTag — a small notched label badge
 * (e.g. "Featured" on the events hero): gold 1px border, uppercase Space
 * Mono text, with a small gold dot inset on the left edge standing in for
 * the swing-tag's punch-hole notch.
 */
export function SwingTag({ children }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { borderColor: colors.gold }]}>
      <View style={[styles.dot, { backgroundColor: colors.gold }]} />
      <Text style={[styles.label, { fontWeight: '600', color: colors.gold }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 3,
    paddingVertical: 3,
    paddingRight: 7,
    paddingLeft: 12,
  },
  dot: {
    position: 'absolute',
    left: 4,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
