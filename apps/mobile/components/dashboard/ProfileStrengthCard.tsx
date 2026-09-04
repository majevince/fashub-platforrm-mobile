import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { CheckCircle2, Circle as CircleIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { violetColors as V } from '@fashub/design-tokens';
import type { ProfileStrengthField } from '../../lib/profileStrength';
import { profileStrengthStatus } from '../../lib/profileStrength';

const STATUS_COLOR: Record<string, string> = {
  green: V.green,
  primary: V.primary,
  amber: V.amber,
  danger: '#DC2626',
};

function Ring({ percentage, color }: { percentage: number; color: string }) {
  const size = 84;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);
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
      <Text style={{ fontSize: 18, fontWeight: '700', color: V.ink }}>{percentage}%</Text>
    </View>
  );
}

/** Ports web's ProfileCompletionGauge (see lib/profileStrength.ts for the formula source). */
export function ProfileStrengthCard({ percentage, fields }: { percentage: number; fields: ProfileStrengthField[] }) {
  const { colors, spacing, radius: radii } = useTheme();
  const router = useRouter();
  const status = profileStrengthStatus(percentage);
  const missing = fields.filter((f) => !f.done);
  const completed = fields.filter((f) => f.done);

  return (
    <View style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radii.lg, padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink }}>Profile Strength</Text>
          <Text style={{ fontSize: 11, fontWeight: '400', color: colors.inkSoft, marginTop: 2 }}>A complete profile gets 5× more views</Text>
        </View>
        <View style={{ backgroundColor: STATUS_COLOR[status.color] + '22', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: STATUS_COLOR[status.color] }}>{status.label}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Ring percentage={percentage} color={STATUS_COLOR[status.color]} />
          <Text style={{ fontSize: 10, fontWeight: '500', color: colors.inkSoft }}>{completed.length}/{fields.length} items</Text>
        </View>

        <View style={{ flex: 1, gap: 10 }}>
          {missing.length > 0 ? (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 9.5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', color: colors.inkSoft }}>Missing ({missing.length})</Text>
              {missing.slice(0, 5).map((f) => (
                <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CircleIcon size={13} color={colors.line} strokeWidth={2.5} />
                  <Text style={{ fontSize: 12, fontWeight: '400', color: colors.ink }}>{f.label}</Text>
                </View>
              ))}
              {missing.length > 5 ? <Text style={{ fontSize: 10.5, fontWeight: '400', color: colors.inkSoft }}>+{missing.length - 5} more</Text> : null}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={15} color={V.green} />
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: V.green }}>Profile fully complete!</Text>
            </View>
          )}
        </View>
      </View>

      {missing.length > 0 ? (
        <Pressable
          onPress={() => router.push('/profile/settings')}
          style={{ backgroundColor: colors.gold, borderRadius: radii.md, paddingVertical: 11, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ivory }}>Complete Your Profile</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
