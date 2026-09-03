import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  UserPlus,
  Heart,
  MessageSquare,
  Mail,
  ShoppingBag,
  Calendar,
  Share2,
  Briefcase,
  Bell,
} from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationRead, findOrCreateConversation, resolveMediaUrl, ApiError } from '@fashub/api-client';
import type { AppNotification } from '@fashub/types';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

/**
 * Matches web's notification system exactly (GET/PATCH /api/notifications/[userId] —
 * same endpoints FeedAppBar's badge already polls). Web's 9 schema-defined
 * types are all handled, but per Step 0's investigation only 5 are ever
 * actually produced today (follow, like/story-reactions, message/story-replies,
 * share, workflow) — comment/order/appointment/system exist in the enum with
 * zero real creation call-sites anywhere in web's codebase, so they render
 * with a reasonable default treatment rather than pixel-matching a web
 * behavior that never actually fires.
 *
 * This screen intentionally combines the BEST of web's two divergent,
 * inconsistent notification surfaces rather than copying either one's
 * gaps: the full /notifications page's icon set (has order/appointment
 * icons the dropdown lacks) plus the dropdown's relatedType fallback-link
 * logic (routes notifications lacking an explicit `link`, which the full
 * page can't do at all). `workflow` — the richest real producer (8
 * templates) — gets its own dedicated icon/color here since web's own
 * "falls through to a generic gray bell for workflow" is itself an
 * omission, not a real design to preserve.
 *
 * Routing (see routeNotification below): web's `link` field is a *web* URL —
 * different path prefixes, query-param semantics mobile doesn't parse, and
 * sometimes a full absolute URL. Pushing it verbatim (an earlier version of
 * this screen's actual bug) silently broke workflow, story-reply-message,
 * and project-share notifications despite all three having a perfectly real
 * mobile destination. Every case in routeNotification is derived from
 * reading the actual web producer route that sets it, not guessed. `like`
 * (story reactions) has no `link` on web at all and isn't clickable on web
 * either — mobile falls back to the reacting actor's profile, the closest
 * real destination given there's no standalone story-viewer route to
 * deep-link into. Event/community shares hit a genuine missing-feature wall
 * (neither tab has a real screen behind it on mobile yet) — flagged via an
 * alert rather than silently doing nothing or faking a route.
 */

type TypeStyle = { Icon: typeof Bell; bg: string; fg: string };

const TYPE_STYLES: Record<string, TypeStyle> = {
  follow: { Icon: UserPlus, bg: '#DBEAFE', fg: '#2563EB' },
  like: { Icon: Heart, bg: '#FEE2E2', fg: '#DC2626' },
  comment: { Icon: MessageSquare, bg: '#D1FAE5', fg: '#059669' },
  message: { Icon: Mail, bg: '#EDE9FE', fg: '#7C3AED' },
  order: { Icon: ShoppingBag, bg: '#FEF3C7', fg: '#D97706' },
  appointment: { Icon: Calendar, bg: '#CFFAFE', fg: '#0891B2' },
  share: { Icon: Share2, bg: '#FEF3C7', fg: '#B45309' },
  workflow: { Icon: Briefcase, bg: V.primarySoft, fg: V.primaryDeep },
  system: { Icon: Bell, bg: '#F3F4F6', fg: '#6B7280' },
};

/** Parses web's `link` field (a web URL — relative or absolute, sometimes
 * with query params) into a path + params, without depending on the global
 * URL/URLSearchParams constructor (patchy on Hermes without a polyfill this
 * app doesn't carry). Works for both `/workflows/abc` and
 * `https://fashub.app/events/abc?post=x`. */
function parseWebLink(link: string): { pathname: string; params: Record<string, string> } {
  const withoutOrigin = link.replace(/^https?:\/\/[^/]+/, '');
  const [pathname, query] = withoutOrigin.split('?');
  const params: Record<string, string> = {};
  if (query) {
    for (const pair of query.split('&')) {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
  }
  return { pathname, params };
}

type RouteOutcome = 'navigated' | 'no_destination' | 'missing_feature';

/**
 * Centralized type→route dispatch — the single place that translates web's
 * notification `link`/`relatedType` data into an actual mobile screen. Web's
 * links are web URLs (different path prefixes, query-param semantics mobile
 * doesn't parse, sometimes full absolute URLs) — pushing them verbatim, which
 * the previous version of this screen did, is exactly why workflow/message/
 * project-share notifications were broken. Every case here is derived from
 * reading the actual web producer code, not guessed (see route.ts files
 * referenced inline).
 */
async function routeNotification(n: AppNotification, ctx: { currentUserId: string; router: ReturnType<typeof useRouter> }): Promise<RouteOutcome> {
  switch (n.type) {
    case 'follow': {
      // lib: app/api/users/[userId]/follow/route.ts → link: /profile/{followerId}
      // Already mobile-route-compatible as-is.
      if (n.link) {
        ctx.router.push(n.link);
        return 'navigated';
      }
      return 'no_destination';
    }

    case 'workflow': {
      // lib: lib/workflows/notifyWorkflow.ts → link: /workflows/{workflowId}.
      // Mobile's workflow detail screen takes the same workflowId, just at
      // a different path (app/(tabs)/profile/workflow/[id].tsx).
      const id = n.link ? parseWebLink(n.link).pathname.split('/').filter(Boolean).pop() : n.relatedId;
      if (id) {
        ctx.router.push(`/profile/workflow/${id}`);
        return 'navigated';
      }
      return 'no_destination';
    }

    case 'message': {
      // lib: app/api/conversations/[conversationId]/messages/route.ts (story
      // replies only) → link: /chat?userId={senderId}. Mobile has no /chat
      // route or query-param conversation lookup, but the destination is
      // real: resolve the same way every other "Message" button on mobile
      // already does (findOrCreateConversation → /messages/{conversationId}).
      const senderId = n.actorId ?? (n.link ? parseWebLink(n.link).params.userId : undefined);
      if (!senderId) return 'no_destination';
      try {
        const { conversation } = await findOrCreateConversation(ctx.currentUserId, senderId);
        ctx.router.push(`/messages/${conversation.id}`);
        return 'navigated';
      } catch {
        return 'no_destination';
      }
    }

    case 'share': {
      if (!n.link) return 'no_destination';
      const { pathname, params } = parseWebLink(n.link);
      // Project share: /profile/{ownerId}?tab=projects&projectId={id}
      // (app/api/portfolio/projects/[projectId]/share/route.ts) — mobile has
      // a direct project-detail screen, a cleaner destination than
      // replicating web's tab+modal deep-link.
      if (params.projectId) {
        ctx.router.push(`/project/${params.projectId}`);
        return 'navigated';
      }
      // Orphaned-project fallback (no owner): /projects?project={id} — no
      // clean mobile equivalent for an ownerless project; rare edge case.
      if (pathname === '/projects') return 'no_destination';
      // Event/community shares are always absolute URLs to features mobile
      // hasn't built at all yet (app/(tabs)/_layout.tsx registers both tabs
      // with href: null — confirmed no real screen exists behind either).
      if (pathname.startsWith('/events/') || pathname.startsWith('/communities/')) return 'missing_feature';
      return 'no_destination';
    }

    case 'like': {
      // app/api/stories/[id]/react/route.ts sets no `link` at all —
      // relatedType: 'story' isn't in web's own click-routing either (a real
      // web bug, not mobile's to replicate). Mobile has no standalone
      // story-viewer route to deep-link into (stories only open inline from
      // the Feed tab's rail with an already-fetched StoryGroup), so the
      // closest real, working destination is the reacting actor's profile.
      if (n.relatedType === 'story' && n.actorId) {
        ctx.router.push(`/profile/${n.actorId}`);
        return 'navigated';
      }
      return 'no_destination';
    }

    // comment/order/appointment/system: re-confirmed zero creation
    // call-sites anywhere in web's codebase (dead enum values) — never
    // reached with real data, so no destination is defined for them.
    default: {
      if (n.link) {
        ctx.router.push(n.link);
        return 'navigated';
      }
      if (n.relatedType === 'user' && n.relatedId) {
        ctx.router.push(`/profile/${n.relatedId}`);
        return 'navigated';
      }
      if (n.relatedType === 'post' && n.relatedId) {
        ctx.router.push(`/post/${n.relatedId}`);
        return 'navigated';
      }
      return 'no_destination';
    }
  }
}

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export default function NotificationsScreen() {
  const { colors, typeScale, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    setError('');
    getNotifications(user.id, { limit: 50 })
      .then((res) => setNotifications(res.notifications))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load notifications."));
  }, [user]);

  useEffect(load, [load]);

  if (!user) return null;

  const handleRefresh = () => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    await markNotificationRead(user.id, { markAllAsRead: true }).catch(() => {});
    load();
  };

  const handlePress = (n: AppNotification) => {
    // Mark-as-read is independent of routing outcome in both directions —
    // fired immediately regardless of whether navigation below succeeds,
    // fails, or hits a missing-feature case.
    if (!n.isRead) {
      setNotifications((prev) => (prev ? prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)) : prev));
      markNotificationRead(user.id, { notificationId: n.id }).catch(() => {});
    }
    routeNotification(n, { currentUserId: user.id, router }).then((outcome) => {
      if (outcome === 'missing_feature') {
        Alert.alert('Not available yet', "This isn't available on the mobile app yet.");
      }
    });
  };

  const hasUnread = !!notifications?.some((n) => !n.isRead);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
          <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Notifications</Text>
        </View>
        {hasUnread ? (
          <Pressable onPress={handleMarkAllRead} hitSlop={8}>
            <Text style={{ fontWeight: '600', fontSize: 12.5, color: colors.oxblood }}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      {notifications === null ? (
        error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <LoadingState />
        )
      ) : notifications.length === 0 ? (
        <EmptyState title="No notifications yet" message="You'll see follows, messages, project updates, and more here." />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.oxblood} />}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item }) => {
            const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.system;
            const avatarUri = resolveMediaUrl(item.actorAvatar);
            return (
              <Pressable
                onPress={() => handlePress(item)}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.sm + 4,
                  backgroundColor: item.isRead ? colors.ivory : V.primarySoft,
                }}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: style.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <style.Icon size={18} color={style.fg} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '400', color: colors.inkSoft, marginTop: 2 }} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: colors.inkSoft, marginTop: 4 }}>{timeAgo(item.createdAt)}</Text>
                </View>
                {!item.isRead ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: V.primary, marginTop: 4 }} /> : null}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
