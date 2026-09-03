import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, style, ...props }: Props) {
  const { colors, typeScale, spacing, radius } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>{label}</Text>
      ) : null}
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
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.oxblood }}>{error}</Text>
      ) : hint ? (
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>{hint}</Text>
      ) : null}
    </View>
  );
}
