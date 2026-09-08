import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Animated, Dimensions, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useRouter, usePathname } from 'expo-router';
import {
  X,
  ChevronRight,
  Sparkles,
  Lock,
  LogOut,
  CalendarDays,
  Users2,
  Zap,
  ChartBar,
  LayoutDashboard,
  GitBranch,
  Heart,
  Package,
  Settings as SettingsIcon,
  UserPlus,
  LifeBuoy,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, resolveMediaUrl } from '@fashub/api-client';
import { VerifiedBadge, isVerified } from '../VerifiedBadge';

const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.8);

const isProfessional = (role?: string) => role === 'designer' || role === 'tailor';

const FEATURES_ITEMS = [
  { key: 'events', label: 'Events', href: '/events', Icon: CalendarDays },
  { key: 'communities', label: 'Communities', href: '/communities', Icon: Users2 },
] as const;

/**
 * Ports fashub_menu_full_redesign mock's upgrade card 1:1 (gradient, icon
 * square, headline, subtext, white pill). The mock's own CTA text ("Try
 * free for 30 days") contradicts the confirmed real terms from the earlier
 * Creator Pro ticket — free during the current beta, no trial period, no
 * conversion to paid — so it's not used verbatim; kept as "Activate
 * Creator Pro" instead, matching Billing's own real action. CTA routes to
 * Billing (the existing, working Activate flow), not a dedicated Upgrade
 * page — deliberately deferred, confirmed with Vincent, until a
 * mobile-specific Upgrade page design exists. Retained unchanged per this
 * ticket's own instruction ("retain the upgrade card and its content") even
 * though fashub_menu_industry_standard_v3's mock only shows the analytics
 * teaser below — the two cards now coexist rather than one replacing
 * the other.
 */
function CreatorProCard({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <Pressable
      onPress={() => onNavigate('/profile/settings/billing')}
      style={{ marginHorizontal: 20, marginTop: 16, marginBottom: 4, borderRadius: 14, overflow: 'hidden' }}
    >
      <LinearGradient colors={['#6D28D9', '#4C1D95']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16 }}>
        <View style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#fff', marginBottom: 3 }}>Upgrade to Creator Pro</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 17, marginBottom: 12 }}>
              Boost your reach, unlock analytics, and get priority placement in search.
            </Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#4C1D95' }}>Activate Creator Pro</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/**
 * Mobile has no analytics screen at all (confirmed in Step 0 — web has a
 * full one at /pro/analytics, mobile has nothing). Per Vincent's call,
 * this card is only ever shown to non-Pro professionals (routes to the
 * same Billing/Activate flow as CreatorProCard above) and is hidden
 * entirely once a user is Pro, rather than linking anywhere — no dead
 * link, no native analytics screen built as a side effect of a menu
 * ticket. Also hidden for Individual accounts: analytics/profile-view
 * tracking doesn't exist as a concept for that role (no profileViews
 * column on IndividualProfile), matching the same isProfessional gate
 * billing/inventory/the stats strip below already use.
 */
function AnalyticsTeaserCard({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <Pressable
      onPress={() => onNavigate('/profile/settings/billing')}
      style={{ marginHorizontal: 20, marginTop: 10, marginBottom: 4, borderRadius: 14, overflow: 'hidden' }}
    >
      <LinearGradient colors={['#6D28D9', '#4C1D95']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14 }}>
        <View style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ChartBar size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 }}>See who's viewing your work</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Upgrade to Creator Pro for full analytics</Text>
          </View>
          <ChevronRight size={16} color="#fff" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/**
 * No dedicated shared avatar component exists anywhere in the app (Step 0
 * of this ticket confirmed it — every consumer, e.g. app/(tabs)/profile/
 * index.tsx's old header and NetworkCard.tsx, duplicates this same
 * initials-on-color fallback inline). Replicating that same inline pattern
 * here rather than extracting a new shared component, which would be scope
 * beyond what this ticket asked for.
 */
function ProfileHeader({
  onPress,
  onUpgrade,
  onViewAnalytics,
  hasUpgraded,
  verified,
  stats,
  profileViewCount,
}: {
  onPress: () => void;
  onUpgrade: () => void;
  onViewAnalytics: () => void;
  hasUpgraded: boolean;
  verified: boolean;
  stats: { followerCount: number; projectCount: number } | null;
  profileViewCount: number | null;
}) {
  const { colors, fontFamilies } = useTheme();
  const { user } = useAuth();

  if (!user) return null;

  const avatarUri = resolveMediaUrl(user.avatar);

  const formatStat = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 4 }}>
      <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.oxblood, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Text style={{ fontWeight: '600', fontSize: 17, color: colors.ivory }}>{user.displayName.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink, flexShrink: 1 }} numberOfLines={1}>
              {user.displayName}
            </Text>
            {verified ? <VerifiedBadge size="sm" /> : null}
          </View>
          <Text style={{ fontSize: 12.5, color: colors.inkSoft, marginTop: 2, marginBottom: hasUpgraded ? 6 : 0, textTransform: 'capitalize' }}>
            {user.role}
          </Text>
          {hasUpgraded ? (
            <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Sparkles size={11} color="#fff" />
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff', letterSpacing: 0.2 }}>CREATOR PRO</Text>
            </View>
          ) : null}
        </View>
        <ChevronRight size={18} color={colors.inkSoft} />
      </Pressable>

      {stats ? (
        <View style={{ flexDirection: 'row', marginTop: 14, paddingBottom: 12, paddingHorizontal: 20 }}>
          {hasUpgraded ? (
            <Pressable onPress={onViewAnalytics} style={{ flex: 1 }}>
              <Text style={{ fontFamily: fontFamilies.mono, fontSize: 15, fontWeight: '700', color: colors.ink }}>
                {formatStat(profileViewCount ?? 0)}
              </Text>
              <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>Profile views</Text>
            </Pressable>
          ) : (
            // Real profile-view tracking exists server-side for every professional
            // user, but the COUNT itself is a Creator Pro-only stat (server-gated,
            // not just hidden here) — this cell is a teaser, not a real value with
            // a lock drawn over it.
            <Pressable onPress={onUpgrade} style={{ flex: 1 }}>
              <Lock size={14} color={colors.inkSoft} />
              <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 4 }}>Upgrade to see</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 15, fontWeight: '700', color: colors.ink }}>{formatStat(stats.followerCount)}</Text>
            <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>Followers</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 15, fontWeight: '700', color: colors.ink }}>{formatStat(stats.projectCount)}</Text>
            <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>Projects</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  const { colors, fontFamilies } = useTheme();
  return (
    <Text
      style={{
        fontFamily: fontFamilies.mono,
        fontSize: 10,
        letterSpacing: 0.6,
        color: colors.inkSoft,
        textTransform: 'uppercase',
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 4,
      }}
    >
      {children}
    </Text>
  );
}

function HairlineDivider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.line, marginHorizontal: 20, marginVertical: 8 }} />;
}

/**
 * Redesigned per fashub_menu_industry_standard_v3 mock: a stats strip
 * (Profile views / Followers / Projects) now sits under the profile header.
 * Profile views is real, server-tracked data as of the "Real Profile View
 * Tracking" ticket (packages/types/src/profileDetail.ts's profileViewCount,
 * backed by fashub's ProfileView table) — gated server-side to Creator Pro,
 * not just hidden client-side, so free-tier professionals see a locked
 * teaser cell instead of a real number. An analytics teaser card sits below
 * the existing upgrade card (both kept, per this ticket's own instruction),
 * and the flat Workspace-then-lone-
 * Settings layout is now Features / Workspace / Account, with Invite a
 * friend and Help & support newly added to Account. Dark mode is
 * deliberately NOT in this pass — mobile has no theming system at all
 * (confirmed in Step 0), so a toggle here would be fake; that's its own
 * follow-up project. The footer gained a version line under Sign out,
 * matching the mock, sourced from app.json via expo-constants rather than
 * hardcoded so it can't drift from the real build.
 */
export function AppDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [tier, setTier] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [stats, setStats] = useState<{ followerCount: number; projectCount: number } | null>(null);
  const [profileViewCount, setProfileViewCount] = useState<number | null>(null);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, translateX]);

  useEffect(() => {
    if (!visible || !user) return;
    getUserProfile(user.id, user.id)
      .then((profile) => {
        setTier(profile.subscriptionTier ?? 'free');
        setVerified(isVerified({ subscriptionTier: profile.subscriptionTier, verified: profile.isVerified }));
        const roleProfile = profile.designerProfile || profile.tailorProfile;
        if (roleProfile) {
          setStats({
            followerCount: roleProfile.followerCount ?? (roleProfile.followers?.length ?? 0),
            projectCount: profile.projectCount ?? 0,
          });
        } else {
          setStats(null);
        }
        // Real, server-gated count (packages/types' profileDetail.ts) — null
        // means "not visible to you" (non-Pro), not "zero views".
        setProfileViewCount(profile.profileViewCount ?? null);
      })
      .catch(() => {});
  }, [visible, user?.id]);

  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleSignOut = () => {
    onClose();
    logout();
  };

  const isBusiness = tier === 'business';
  const hasUpgraded = tier === 'pro' || tier === 'business';
  const showProCard = tier === 'free';
  const isPro = isProfessional(user?.role);
  const showAnalyticsTeaser = isPro && tier === 'free';

  const workspaceItems = [
    { key: 'dashboard', label: isBusiness ? 'Studio Dashboard' : 'Dashboard', href: '/profile/dashboard', Icon: LayoutDashboard, show: true, badge: undefined as string | undefined },
    { key: 'workflows', label: 'Workflow', href: '/profile/workflows', Icon: GitBranch, show: true, badge: undefined },
    { key: 'favorites', label: 'Favourites', href: '/profile/favorites', Icon: Heart, show: true, badge: undefined },
    { key: 'inventory', label: 'Inventory', href: '/profile/inventory', Icon: Package, show: isPro, badge: 'Global' },
  ].filter((item) => item.show);

  const accountItems = [
    { key: 'settings', label: 'Settings', href: '/profile/settings', Icon: SettingsIcon, badge: undefined as string | undefined },
    { key: 'invite', label: 'Invite a friend', href: '/invite', Icon: UserPlus, badge: undefined },
    { key: 'help', label: 'Help & support', href: '/help', Icon: LifeBuoy, badge: undefined },
  ];

  const renderItem = ({ key, label, href, Icon, badge }: { key: string; label: string; href: string; Icon: typeof CalendarDays; badge?: string }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Pressable
        key={key}
        onPress={() => navigate(href)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 14 }}
      >
        <Icon size={20} color={active ? colors.gold : colors.ink} strokeWidth={1.8} />
        <Text style={{ fontSize: 14.5, fontWeight: active ? '700' : '500', color: active ? colors.gold : colors.ink, flex: 1 }}>{label}</Text>
        {badge ? (
          <View style={{ backgroundColor: colors.goldSoft + '2E', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Text style={{ fontWeight: '600', fontSize: 9.5, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.3 }}>{badge}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const version = Constants.expoConfig?.version;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(27,21,35,0.4)' }]} onPress={onClose} />
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            backgroundColor: colors.ivory,
            transform: [{ translateX }],
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 12,
            shadowOffset: { width: 4, height: 0 },
            elevation: 8,
          }}
        >
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 18, paddingTop: 12 }}>
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={20} color={colors.ink} />
              </Pressable>
            </View>

            <ProfileHeader
              onPress={() => navigate(user ? `/profile/${user.id}` : '/')}
              onUpgrade={() => navigate('/profile/settings/billing')}
              onViewAnalytics={() => navigate('/profile-analytics')}
              hasUpgraded={hasUpgraded}
              verified={verified}
              stats={stats}
              profileViewCount={profileViewCount}
            />

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {showProCard ? <CreatorProCard onNavigate={navigate} /> : null}
              {showAnalyticsTeaser ? <AnalyticsTeaserCard onNavigate={navigate} /> : null}

              <SectionLabel>Features</SectionLabel>
              {FEATURES_ITEMS.map(renderItem)}

              <HairlineDivider />

              <SectionLabel>Workspace</SectionLabel>
              {workspaceItems.map(renderItem)}

              <HairlineDivider />

              <SectionLabel>Account</SectionLabel>
              {accountItems.map(renderItem)}
            </ScrollView>

            <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 }}>
              <Pressable onPress={handleSignOut} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}>
                <LogOut size={19} color={colors.oxblood} strokeWidth={1.8} />
                <Text style={{ fontSize: 14.5, fontWeight: '500', color: colors.oxblood }}>Sign out</Text>
              </Pressable>
              {version ? (
                <Text style={{ fontFamily: undefined, fontSize: 9.5, color: colors.inkSoft, opacity: 0.7, marginTop: 2, marginBottom: 8 }}>
                  {`FASHUB · VERSION ${version}`}
                </Text>
              ) : null}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}
