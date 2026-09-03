import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { violetColors as V } from '@fashub/design-tokens';

/**
 * Matches web's scoreColor()/ringColor() banding exactly (MatchResultCard.tsx,
 * RecommendedCarousel.tsx) — the ring is NOT always violet, it changes by
 * score band. Rendered as an SVG stroke-dasharray ring since RN has no
 * conic-gradient; visually equivalent to web's ring for a solid (non-
 * gradient) color, which this is.
 */
function scoreColor(score: number): string {
  if (score >= 80) return V.green;
  if (score >= 60) return V.primary;
  if (score >= 40) return V.amber;
  return V.inkFaint;
}

export function MatchRing({ score, size = 44 }: { score: number; size?: number }) {
  const strokeWidth = size <= 32 ? 2.5 : 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);
  const color = scoreColor(score);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={V.line} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ fontSize: size <= 32 ? 9 : 11, fontWeight: '700', color }}>{Math.round(score)}%</Text>
    </View>
  );
}
