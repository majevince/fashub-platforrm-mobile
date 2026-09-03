import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  LayoutDashboard,
  User as UserIcon,
  ListTree,
  Heart,
  Shirt,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useAuth } from '../../../context/AuthContext';
import { getUserProfile, resolveMediaUrl } from '@fashub/api-client';
import type { ProfileDetail } from '@fashub/types';
import { Divider } from '../../../components/Divider';

const isProfessional = (role?: string) => role === 'designer' || role === 'tailor';

/**
 * 1:1 port of the account menu content confirmed live in web's
 * components/layout/Header.tsx dropdown — item list, order, and the
 * Inventory role-gate (designer/tailor only, not shown to individuals;
 * confirmed via reading the actual conditional, not the badge alone).
 * "Studio Profile" and "My Orders" (business-tier / individual-only extras
 * on web) are deliberately not included — this ticket's menu spec names
 * exactly six items plus Sign out, and those two aren't among them.
 * Settings has no dedicated mobile screen yet (not one of this ticket's
 * five full-parity destinations) — routes to an explicit "coming soon"
 * screen rather than a dead tap.
 */
export default function ProfileMenuScreen() {
  const { colors, spacing } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [detail, setDetail] = useState<ProfileDetail | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.id, user.id).then(setDetail).catch(() => {});
  }, [user]);

  if (!user) return null;

  const isBusiness = detail?.subscriptionTier === 'business';
  const showInventory = isProfessional(user.role);
  const avatarUri = resolveMediaUrl(user.avatar);

  const menuItem = (Icon: typeof LayoutDashboard, label: string, onPress: () => void, opts?: { tint?: string; badge?: string }) => (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: spacing.sm }}>
      <Icon size={19} color={opts?.tint ?? colors.ink} strokeWidth={1.8} />
      <Text style={{ fontWeight: '400', fontSize: 14, color: opts?.tint ?? colors.ink, flex: 1 }}>{label}</Text>
      {opts?.badge ? (
        <View style={{ backgroundColor: colors.goldSoft + '2E', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Text style={{ fontWeight: '600', fontSize: 9.5, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.3 }}>{opts.badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={{ padding: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.oxblood, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text style={{ fontWeight: '700', fontSize: 17, color: colors.ivory }}>{user.displayName.slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontWeight: '600', fontSize: 16, color: colors.ink }} numberOfLines={1}>
              {user.displayName}
            </Text>
            <Text style={{ fontWeight: '400', fontSize: 11.5, color: colors.inkSoft, marginTop: 1, textTransform: 'capitalize' }}>{user.role}</Text>
            <Text style={{ fontWeight: '500', fontSize: 10.5, color: colors.inkSoft, marginTop: 1, opacity: 0.8 }} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.sm, paddingTop: spacing.xs }}>
          {menuItem(LayoutDashboard, isBusiness ? 'Studio Dashboard' : 'Dashboard', () => router.push('/profile/dashboard'))}
          {menuItem(UserIcon, 'My Profile', () => router.push('/profile/my-profile'))}
          {menuItem(ListTree, 'Workflows', () => router.push('/profile/workflows'))}
          {menuItem(Heart, 'Favorites', () => router.push('/profile/favorites'))}
          {showInventory ? menuItem(Shirt, 'Inventory', () => router.push('/profile/inventory'), { tint: colors.gold, badge: 'Global' }) : null}
          {menuItem(SettingsIcon, 'Settings', () => router.push('/profile/settings'))}
        </View>

        <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.sm }}>
          <Divider />
        </View>

        <View style={{ paddingHorizontal: spacing.sm, paddingTop: spacing.sm }}>
          {menuItem(LogOut, 'Sign out', () => logout(), { tint: colors.oxblood })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
