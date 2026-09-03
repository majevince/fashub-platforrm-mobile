import React from 'react';
import { View, Text, Switch } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
};

/** Shared boolean-toggle row for Privacy/Notifications/Services — matches web's
 * checkbox-row pattern but as a native Switch, which is the idiomatic mobile
 * equivalent for the same "on/off" semantic. */
export function ToggleRow({ label, description, value, onValueChange, disabled }: Props) {
  const { colors, typeScale, spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs, opacity: disabled ? 0.4 : 1 }}>
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>{label}</Text>
        {description ? (
          <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', fontSize: 11.5, color: colors.inkSoft, marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.line, true: colors.gold }}
        thumbColor="#fff"
      />
    </View>
  );
}
