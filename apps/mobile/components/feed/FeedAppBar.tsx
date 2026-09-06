import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Search, Bell, RotateCcw, Menu } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { getNotifications } from '@fashub/api-client';
import { AppDrawer } from '../nav/AppDrawer';

// Real logo asset (see components/AuthLogo.tsx for provenance/discrepancy notes).
const LOGO_ASPECT_RATIO = 1077 / 353;
const LOGO_HEIGHT = 24;
const NOTIFICATIONS_POLL_MS = 30000;

type Props = {
  onRefresh: () => void;
};

/**
 * The bell now opens a real notification-feed screen (app/notifications.tsx)
 * listing every AppNotification the same GET /api/notifications/[userId]
 * this badge already polls returns. The refresh icon is unrelated: it
 * re-triggers the feed load. The bell's badge is real — polled every 30s to
 * match web's own NotificationDropdown cadence, capped at "9+" like web's
 * bell (web's separate messaging badge caps at 99+, this one doesn't).
 * Stays top-right on Feed's existing (already-confirmed, separately
 * violet) app bar rather than moving into the ink/ivory Profile header —
 * per the nav/profile redesign ticket's own reference mock, which shows
 * the bell in the top bar, not the profile screen itself.
 */
export function FeedAppBar({ onRefresh }: Props) {
  const { spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const poll = () => {
      getNotifications(user.id, { limit: 1 })
        .then((res) => setUnreadCount(res.unreadCount))
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, NOTIFICATIONS_POLL_MS);
    return () => clearInterval(id);
  }, [user]);

  return (
    <View style={{ backgroundColor: V.surface, paddingHorizontal: spacing.lg, paddingTop: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: V.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => setDrawerOpen(true)} hitSlop={8}>
            <Menu size={22} color={V.ink} strokeWidth={1.8} />
          </Pressable>
          <Image
            source={require('../../assets/brand/logo-wordmark.png')}
            style={{ width: LOGO_HEIGHT * LOGO_ASPECT_RATIO, height: LOGO_HEIGHT }}
            contentFit="contain"
            accessibilityLabel="FaSHub"
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable onPress={onRefresh} hitSlop={8}>
            <RotateCcw size={22} color={V.ink} strokeWidth={1.8} />
          </Pressable>
          <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={{ position: 'relative' }}>
            <Bell size={22} color={V.ink} strokeWidth={1.8} />
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -8,
                  minWidth: 15,
                  height: 15,
                  borderRadius: 8,
                  paddingHorizontal: 3,
                  backgroundColor: V.primary,
                  borderWidth: 1.5,
                  borderColor: V.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#fff' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: V.canvas, borderWidth: 1, borderColor: V.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 }}>
        <Search size={16} color={V.inkFaint} strokeWidth={2} />
        <Text style={{ fontSize: 13.5, fontWeight: '400', color: V.inkFaint }}>Search designers, tailors, communities…</Text>
      </View>

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}
