import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * The Page-verification badge — deliberately a DIFFERENT icon from the
 * personal-profile VerifiedBadge (a filled violet circle + white check).
 * This is a 1:1 port of web's components/pages/PageVerifiedBadge.tsx —
 * lucide's "BadgeCheck" scalloped/rosette outline + checkmark, in FasHub
 * violet, per Vincent's explicit reference image. Path data copied verbatim
 * from lucide-react's badge-check icon (viewBox 0 0 24 24).
 *
 * Do NOT use this for personal/User verification — that stays VerifiedBadge.
 */
const VIOLET = '#6D28D9'; // matches web's T.primary

export function PageVerifiedBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const px = size === 'sm' ? 14 : 18;
  return (
    <Svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke={VIOLET}
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityLabel="Verified Page"
    >
      <Path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <Path d="m9 12 2 2 4-4" />
    </Svg>
  );
}
