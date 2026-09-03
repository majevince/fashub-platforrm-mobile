/**
 * 4px base scale — web has no equivalent custom scale (tailwind.config.ts
 * defines no theme extension, so web relies on Tailwind's stock spacing).
 * This is a fresh, deliberate scale for native rather than a port.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  full: 9999,
} as const;

export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
