import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * 1:1 port of web's components/shared/VerifiedBadge.tsx — violet filled
 * circle + white checkmark. Do NOT change this color/icon (explicit brand
 * requirement, per web's own comment on the source component).
 */
const VIOLET = '#8B5CF6'; // Tailwind violet-500 — matches web's `text-violet-500` exactly.

export function isVerified(entity: {
  subscriptionTier?: string | null;
  verified?: boolean | null;
}): boolean {
  return entity.subscriptionTier === 'business' || entity.verified === true;
}

export function VerifiedBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const px = size === 'sm' ? 14 : 16;
  return (
    <Svg width={px} height={px} viewBox="0 0 24 24" fill="none" accessibilityLabel="Verified">
      <Circle cx="12" cy="12" r="10" fill={VIOLET} />
      <Path d="M8.5 12.5l2 2 5-5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
