import React from 'react';
import { Pressable, Text, StyleSheet, PressableProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Variant = 'primary' | 'secondary' | 'outline';

type Props = PressableProps & {
  variant?: Variant;
  children: string;
};

/**
 * Variant styling matches the prototype's two concrete button instances —
 * "Edit Profile" (solid ink, ivory text) and "View" (transparent, gold
 * border, ink text, pill radius) — plus an oxblood solid variant for a
 * second accent action, since the prototype doesn't show one but oxblood
 * is the brand's other actionable color (active tab state, notification
 * dot) alongside gold's decorative/label role.
 */
export function Button({ variant = 'primary', children, style, ...props }: Props) {
  const { colors, radius, spacing } = useTheme();

  const variantStyle = {
    primary: { backgroundColor: colors.ink, borderWidth: 0, borderRadius: radius.md },
    secondary: { backgroundColor: colors.oxblood, borderWidth: 0, borderRadius: radius.md },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.gold, borderRadius: radius.full },
  }[variant];

  const textColor = variant === 'outline' ? colors.ink : colors.ivory;

  return (
    <Pressable
      style={(state) => [
        styles.base,
        variantStyle,
        { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
        state.pressed && styles.pressed,
        props.disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Text style={[styles.label, { color: textColor, fontWeight: '600' }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { fontSize: 12.5, letterSpacing: 0.1 },
});
