import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Star, MessageCircle, Package, CheckCircle2, User as UserIcon, Shirt, ListTree, Heart } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useAuth } from '../../../context/AuthContext';
import { getUserProfile, getRatingStats, getConversations } from '@fashub/api-client';
import type { ProfileDetail } from '@fashub/types';
import { LoadingState } from '../../../components/LoadingState';

const isProfessional = (role?: string) => role === 'designer' || role === 'tailor';

/**
 * Web's dashboard is 4 separate role-forked pages (individual/designer/
 * tailor/business) — unified here into one screen that branches on role/
 * tier internally instead. Deliberately real-data-only: web's individual
 * dashboard mixes genuinely live data (profile, unread messages) with
 * hardcoded mock stats (Recent Orders, totalSpent — literally a static
 * array in the component, confirmed by reading it directly) — this screen
 * doesn't replicate that mock data, showing only what's actually backed by
 * an API. Followers/Following counts and the business-tier revenue
 * analytics chart are flagged as not built: no confirmed real data source
 * for the former in GET /api/users/[userId] (its route was read directly
 * and doesn't compute a follower count), and the latter needs a
 * /api/business/analytics client not yet built — both real web features,
 * not silently dropped, just not in this pass.
 */
export default function DashboardScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [detail, setDetail] = useState<ProfileDetail | null>(null);
  const [rating, setRating] = useState<{ averageRating: number; totalReviews: number } | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getUserProfile(user.id, user.id),
      isProfessional(user.role) ? getRatingStats(user.id) : Promise.resolve(null),
      getConversations(user.id).then((convs) => convs.reduce((sum, c) => sum + c.unreadCount, 0)),
    ])
      .then(([profile, ratingRes, unread]) => {
        setDetail(profile);
        if (ratingRes) setRating(ratingRes);
        setUnreadMessages(unread);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const pro = isProfessional(user.role);
  const professionalDetail = user.role === 'designer' ? detail?.designerProfile : user.role === 'tailor' ? detail?.tailorProfile : null;

  const kpi = (Icon: typeof Star, label: string, value: string | number) => (
    <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14, gap: 6 }}>
      <Icon size={16} color={colors.gold} />
      <Text style={{ fontWeight: '700', fontSize: 19, color: colors.ink }}>{value}</Text>
      <Text style={{ fontWeight: '500', fontSize: 9.5, color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );

  const quickAction = (Icon: typeof UserIcon, label: string, onPress: () => void) => (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md }}>
      <Icon size={18} color={colors.oxblood} />
      <Text style={{ fontWeight: '600', fontSize: 10.5, color: colors.ink }}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>{detail?.subscriptionTier === 'business' ? 'Studio Dashboard' : 'Dashboard'}</Text>
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: colors.ink, borderRadius: radius.lg, padding: 16 }}>
            <Text style={{ fontWeight: '700', fontSize: 17, color: colors.ivory }}>Welcome back, {user.displayName.split(' ')[0]}</Text>
            <Text style={{ fontWeight: '400', fontSize: 12, color: colors.ivoryDeep, marginTop: 3, opacity: 0.8 }}>
              Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {pro && rating ? kpi(Star, 'Rating', rating.totalReviews > 0 ? rating.averageRating.toFixed(1) : '—') : null}
            {pro ? kpi(Package, 'Total Orders', professionalDetail?.totalOrders ?? 0) : null}
            {pro ? kpi(CheckCircle2, 'Completed', professionalDetail?.completedOrders ?? 0) : null}
            {kpi(MessageCircle, 'Unread Messages', unreadMessages)}
          </View>

          <View>
            <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft, marginBottom: 10 }}>QUICK ACTIONS</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {quickAction(UserIcon, 'My Profile', () => router.push('/profile/my-profile'))}
              {pro ? quickAction(Shirt, 'Inventory', () => router.push('/profile/inventory')) : quickAction(Heart, 'Favorites', () => router.push('/profile/favorites'))}
              {quickAction(ListTree, 'Workflows', () => router.push('/profile/workflows'))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
