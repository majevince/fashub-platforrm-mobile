import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  /** Optional control (e.g. a Show/Hide toggle) docked inside the field's right edge. */
  rightElement?: React.ReactNode;
};

export function TextField({ label, error, hint, rightElement, style, ...props }: Props) {
  const { colors, typeScale, spacing, radius } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>{label}</Text>
      ) : null}
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          placeholderTextColor={colors.inkSoft}
          style={[
            {
              borderWidth: 1,
              borderColor: error ? colors.oxblood : colors.line,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 4,
              fontWeight: '400',
              fontSize: 15,
              color: colors.ink,
              backgroundColor: colors.ivory,
            },
            rightElement ? { paddingRight: spacing.xl + spacing.md } : null,
            style,
          ]}
          {...props}
        />
        {rightElement ? <View style={{ position: 'absolute', right: spacing.md }}>{rightElement}</View> : null}
      </View>
      {error ? (
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.oxblood }}>{error}</Text>
      ) : hint ? (
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>{hint}</Text>
      ) : null}
    </View>
  );
}
