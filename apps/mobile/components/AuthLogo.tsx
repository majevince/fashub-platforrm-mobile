import React from 'react';
import { Image } from 'expo-image';

/**
 * The real FaSHub logo asset — copied byte-for-byte from the web app's
 * public/logo.png (confirmed as the actual live asset via components/
 * layout/Header.tsx and app/auth/login/page.tsx, not a recreation). Web's
 * real wordmark is a solid violet "FasHub" lockup with a globe+dress mark —
 * not the serif+sans split some earlier design exploration assumed — and
 * always sits on plain white/transparent, never on ink/ivory/gold/oxblood.
 * See the logo-parity task's report for the full discrepancy writeup.
 */
const LOGO_ASPECT_RATIO = 1077 / 353;

export function AuthLogo({ width = 176 }: { width?: number }) {
  return (
    <Image
      source={require('../assets/brand/logo-wordmark.png')}
      style={{ width, height: width / LOGO_ASPECT_RATIO }}
      contentFit="contain"
      accessibilityLabel="FaSHub"
    />
  );
}
