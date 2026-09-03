import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Briefcase,
  MapPin,
  Wrench,
  DollarSign,
  CalendarClock,
  Link2,
  ShieldCheck,
  Bell,
  CreditCard,
} from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../context/AuthContext';
import { Divider } from '../../../../components/Divider';

const isProfessional = (role?: string) => role === 'designer' || role === 'tailor';

/**
 * Web forks Settings into three role-specific pages (individual/designer/
 * tailor), each a single scrollable page with tab-switched sections rather
 * than separate routes. Mobile instead gives each section its own pushed
 * screen (per this ticket's own scope), with this index acting as the menu
 * — Business Info/Services/Pricing/Availability only ever render on web for
 * designer/tailor roles (role-gated, not tier-gated — confirmed by reading
 * web's own per-role page files), so those four rows are hidden entirely
 * for individual accounts here too rather than shown-then-empty.
 */
export default function SettingsIndexScreen() {
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return null;
  const pro = isProfessional(user.role);

  const row = (Icon: typeof UserCircle, label: string, onPress: () => void) => (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: spacing.sm }}>
      <Icon size={19} color={colors.ink} strokeWidth={1.8} />
      <Text style={{ fontWeight: '400', fontSize: 14, color: colors.ink, flex: 1 }}>{label}</Text>
      <ChevronRight size={16} color={colors.inkSoft} />
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ fontWeight: '700', fontSize: 20, color: colors.ink }}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        <View style={{ paddingVertical: spacing.xs }}>
          {row(UserCircle, 'Profile', () => router.push('/profile/settings/profile'))}
          {pro ? row(Briefcase, 'Business Info', () => router.push('/profile/settings/business')) : null}
          {row(MapPin, 'Location', () => router.push('/profile/settings/location'))}
          {pro ? row(Wrench, 'Services', () => router.push('/profile/settings/services')) : null}
          {pro ? row(DollarSign, 'Pricing', () => router.push('/profile/settings/pricing')) : null}
          {pro ? row(CalendarClock, 'Availability', () => router.push('/profile/settings/availability')) : null}
          {row(Link2, 'Social Media', () => router.push('/profile/settings/social'))}
        </View>

        <Divider />

        <View style={{ paddingVertical: spacing.xs }}>
          {row(ShieldCheck, 'Privacy', () => router.push('/profile/settings/privacy'))}
          {row(Bell, 'Notifications', () => router.push('/profile/settings/notifications'))}
          {row(CreditCard, 'Billing', () => router.push('/profile/settings/billing'))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
