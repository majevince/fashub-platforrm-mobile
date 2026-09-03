import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { Home, Briefcase, MessageCircle, Users, UserSearch, User } from 'lucide-react-native';
import { colors } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { resolveMediaUrl, getConversations, getNotifications } from '@fashub/api-client';

// Matches web's own polling cadence for both signals (Header.tsx's unread-
// messages badge and NotificationDropdown's bell) — web has no WebSocket/push
// for either, so there's no "real" mechanism to diverge from by picking
// polling here.
const BADGE_POLL_MS = 30000;

/**
 * Exported so the messages/[id] thread screen can restore this exact style
 * when it hides the tab bar on focus (see that screen for why) — kept as a
 * plain constant, not built from useTheme(), so it's usable outside a
 * component too.
 */
export const TAB_BAR_STYLE = {
  backgroundColor: colors.ivory,
  borderTopColor: colors.line,
  borderTopWidth: 1,
  height: 64,
  paddingTop: 8,
} as const;

/**
 * Final order per the Network-page ticket: Feed, Project, Message, Network,
 * Profile — Network replaces Event in the 4th slot. Event's prior
 * destination was, confirmed in Step 0, a bare "NOT YET BUILT" placeholder
 * with zero real functionality (app/(tabs)/events.tsx) — there was nothing
 * built to relocate, so it's dropped from the bar the same way Communities
 * already was (href: null below), not silently deleted: the route/file
 * stays in the repo for whenever Events is actually built.
 * "Circles" (Communities) was already removed from this bar in an earlier
 * ticket (Project took its slot then); that decision is unchanged here.
 */
const TAB_META: Record<string, { label: string; Icon: typeof Home }> = {
  index: { label: 'Feed', Icon: Home },
  project: { label: 'Project', Icon: Briefcase },
  messages: { label: 'Message', Icon: MessageCircle },
  network: { label: 'Network', Icon: Users },
  professionals: { label: 'Professionals', Icon: UserSearch },
  profile: { label: 'Profile', Icon: User },
};

/**
 * Icon-only tab bar — no text label under each icon. Every destination
 * already states its own full name as the screen's own header/title
 * ("Network", "Profile", etc.), so repeating it under the icon too was
 * redundant once those labels became full words rather than abbreviations
 * (matches Instagram's icon-only bottom nav). Icons are bolder across both
 * states to stay legible without the label as a second cue.
 */
function TabIcon({ name, focused, showDot }: { name: keyof typeof TAB_META; focused: boolean; showDot?: boolean }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { Icon } = TAB_META[name];
  // colors.navActive is the web app's actual active-nav-state color (Header.tsx's
  // `text-violet-600`/`border-violet-600`, confirmed against the live Tailwind
  // palette) — not colors.oxblood (a real red, reserved for destructive actions)
  // and not colors.gold (a *different*, content-styling violet). See colors.ts.
  const tint = focused ? colors.navActive : colors.inkSoft;

  const isProfile = name === 'profile';
  const avatarUri = isProfile ? resolveMediaUrl(user?.avatar) : null;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <View>
        {isProfile ? (
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {avatarUri ? <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <User size={13} color={colors.ink} />}
          </View>
        ) : (
          <Icon size={23} color={tint} strokeWidth={focused ? 2.8 : 2.4} />
        )}
        {showDot ? (
          // Lightweight "something's new here" cue, distinct from the bell's
          // precise unread count — a plain dot rather than a number, since a
          // capped count would be cramped at this icon size (matches iOS's
          // own tab-badge convention for this exact case). Same violet as
          // the bell/message badges (colors.gold === #6D28D9) — no new
          // accent color introduced.
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.gold,
              borderWidth: 1.5,
              borderColor: colors.ivory,
            }}
          />
        ) : null}
      </View>
      {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.navActive }} />}
    </View>
  );
}

/**
 * Two lightweight, distinct "there's something new" signals — separate from
 * the notification bell's precise unread count (FeedAppBar.tsx):
 *
 * - Messages: real signal, ported directly from web's own pattern (Header.tsx)
 *   — sum of ConversationParticipant.unreadCount across every conversation.
 * - Project: web has no equivalent signal to port (confirmed in Step 0 — no
 *   lastViewedAt tracking, no updatedAt diffing, nothing). Reuses the same
 *   real notification data instead of inventing a new backend concept: any
 *   unread notification with type === 'workflow' (project-update events,
 *   the only real "project activity" producer on web) counts as "new."
 *
 * Both clear the same way: opening the tab marks the underlying source read
 * (Messages: opening a conversation already calls markConversationRead
 * elsewhere; Project: viewing the tab marks workflow notifications read),
 * and the next 30s poll here picks up the cleared state — matching how the
 * bell's own badge already clears today.
 */
function useTabBadges() {
  const { user } = useAuth();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasUnreadProjectActivity, setHasUnreadProjectActivity] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const poll = () => {
      getConversations(user.id)
        .then((conversations) => {
          if (!cancelled) setHasUnreadMessages(conversations.some((c) => c.unreadCount > 0));
        })
        .catch(() => {});
      getNotifications(user.id, { unreadOnly: true, limit: 50 })
        .then((res) => {
          if (!cancelled) setHasUnreadProjectActivity(res.notifications.some((n) => n.type === 'workflow'));
        })
        .catch(() => {});
    };

    poll();
    const interval = setInterval(poll, BADGE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  return { hasUnreadMessages, hasUnreadProjectActivity };
}

export default function TabsLayout() {
  const { hasUnreadMessages, hasUnreadProjectActivity } = useTabBadges();
  const dotFor: Partial<Record<keyof typeof TAB_META, boolean>> = {
    messages: hasUnreadMessages,
    project: hasUnreadProjectActivity,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: TAB_BAR_STYLE,
      }}
    >
      {(Object.keys(TAB_META) as (keyof typeof TAB_META)[]).map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name={name} focused={focused} showDot={dotFor[name]} />,
            // No visible label anymore — keep the full name available to screen readers.
            tabBarAccessibilityLabel: TAB_META[name].label,
          }}
        />
      ))}
      <Tabs.Screen name="communities" options={{ href: null }} />
      <Tabs.Screen name="events" options={{ href: null }} />
    </Tabs>
  );
}
