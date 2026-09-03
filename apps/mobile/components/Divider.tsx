import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  orientation?: 'horizontal' | 'vertical';
  /** Overrides the default line color — for screens (e.g. Messages) running a different confirmed color system. */
  color?: string;
};

const DASH = 6;
const GAP = 6;
const DASH_COUNT = 80; // clipped by the container; comfortably fills any reasonable screen width/height

/**
 * Native port of the prototype's StitchDivider — a repeating-linear-gradient
 * dashed line (6px dash, 6px gap, using T.line) inset 16px from the edges
 * (the prototype bakes `margin: "0 16px"` into the component itself, not
 * into callers). React Native has no CSS repeating-gradient equivalent, so
 * this reproduces the same 6/6 rhythm as a row (or column) of fixed dash
 * Views inside an overflow-hidden container, rather than reaching for
 * react-native-svg for a purely decorative element.
 */
export function Divider({ orientation = 'horizontal', color }: Props) {
  const { colors, spacing } = useTheme();
  const dashStyle = { backgroundColor: color ?? colors.line };

  if (orientation === 'vertical') {
    return (
      <View style={styles.vContainer}>
        {Array.from({ length: DASH_COUNT }).map((_, i) => (
          <View key={i} style={[styles.vDash, dashStyle]} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.hContainer, { marginHorizontal: spacing.md }]}>
      {Array.from({ length: DASH_COUNT }).map((_, i) => (
        <View key={i} style={[styles.hDash, dashStyle]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hContainer: {
    flexDirection: 'row',
    columnGap: GAP,
    height: 1,
    overflow: 'hidden',
  },
  hDash: { width: DASH, height: 1 },
  vContainer: {
    flexDirection: 'column',
    rowGap: GAP,
    width: 1,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  vDash: { height: DASH, width: 1 },
});
