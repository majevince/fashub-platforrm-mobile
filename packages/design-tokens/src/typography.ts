/**
 * Font family + type scale for React Native, matching the approved
 * prototype's font stack exactly: Fraunces (display/headers, italic for
 * wordmark/titles), Inter (UI/body), Space Mono (labels, timestamps, data,
 * tab labels) — not IBM Plex Mono, which this package carried previously
 * against the (now superseded) web-shipped tokens.
 *
 * Family name strings match the keys exported by @expo-google-fonts/fraunces,
 * @expo-google-fonts/inter, and @expo-google-fonts/space-mono — load these
 * via useFonts() in the app's root layout before rendering.
 */
export const fontFamilies = {
  serif: 'Fraunces_600SemiBold',
  serifItalic: 'Fraunces_600SemiBold_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

/**
 * Baseline roles derived from the prototype's actual instances (top bar /
 * hero titles in italic Fraunces ~21-22px, card titles in upright Fraunces
 * ~15-19px, body copy in Inter ~12.5-13px, Space Mono for labels/data at
 * ~10-11px). Per-screen components are expected to fine-tune exact sizes
 * against the prototype as each screen gets built — this scale gives
 * shared roles, not a literal size for every instance in the mockup.
 */
export const typeScale = {
  wordmark: { fontFamily: fontFamilies.serifItalic, fontSize: 21, lineHeight: 26 },
  h1: { fontFamily: fontFamilies.serif, fontSize: 19, lineHeight: 24 },
  h2: { fontFamily: fontFamilies.serif, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 19 },
  bodySmall: { fontFamily: fontFamilies.sans, fontSize: 11, lineHeight: 16 },
  label: { fontFamily: fontFamilies.mono, fontSize: 10, lineHeight: 13, letterSpacing: 0.5 },
  labelBold: { fontFamily: fontFamilies.monoBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.3 },
} as const;

export type TypeToken = keyof typeof typeScale;
