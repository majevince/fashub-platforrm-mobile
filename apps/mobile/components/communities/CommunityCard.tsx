import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Lock, Globe, Crown, Bookmark, Flame, BadgeCheck } from 'lucide-react-native';
import { violetColors as VF } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { resolveMediaUrl } from '@fashub/api-client';
import type { Community } from '@fashub/types';

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

/**
 * Single-column full-width card — web's CommunityCard has 3 variants
 * (rich/compact/minimal) used across different grid layouts; mobile
 * renders one consistent "rich" layout regardless of sort/scope (web's
 * per-sort-mode grid-column-count switching doesn't apply to a
 * single-column phone list) — same fields as web's rich variant, none
 * dropped. "Quick view" isn't ported: on mobile there's no grid to stay
 * on, so tapping the card and opening the real detail screen already
 * serves that purpose.
 */
export function CommunityCard({
  community,
  onJoin,
  onToggleSave,
  ribbon,
}: {
  community: Community;
  onJoin: (slug: string) => void;
  onToggleSave: (id: string) => void;
  ribbon?: string;
}) {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const coverUri = resolveMediaUrl(community.coverPhoto);
  const avatarUri = resolveMediaUrl(community.avatar);
  const membership = community.myMembership;
  const isMember = membership?.joinStatus === 'approved';
  const isPending = membership?.joinStatus === 'pending';

  return (
    <Pressable
      onPress={() => router.push(`/community/${community.slug}`)}
      style={{ backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.line, overflow: 'hidden' }}
    >
      <View style={{ width: '100%', height: 140, backgroundColor: colors.ivoryDeep }}>
        {coverUri ? <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(27,21,35,0.15)' }} />

        {community.category ? (
          <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Text style={{ fontSize: 9.5, fontWeight: '600', color: colors.ink }}>{community.category}</Text>
          </View>
        ) : null}

        <Pressable onPress={(e) => { e.stopPropagation?.(); onToggleSave(community.id); }} hitSlop={8} style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          <Bookmark size={14} color={community.isSaved ? colors.gold : colors.ink} fill={community.isSaved ? colors.gold : 'transparent'} />
        </Pressable>

        {ribbon ? (
          <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.ivory }}>{ribbon}</Text>
          </View>
        ) : null}

        <View style={{ position: 'absolute', left: 12, bottom: -22, width: 52, height: 52, borderRadius: 14, backgroundColor: colors.gold, borderWidth: 3, borderColor: colors.paper, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ivory }}>{initials(community.name)}</Text>
          )}
        </View>
      </View>

      <View style={{ paddingTop: 28, paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.ink, flexShrink: 1 }} numberOfLines={1}>{community.name}</Text>
          {community.verified ? (
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#B45309', alignItems: 'center', justifyContent: 'center' }}>
              <BadgeCheck size={9} color={colors.ink} />
            </View>
          ) : null}
          {community.visibility === 'private' ? (
            <Lock size={12} color={colors.gold} />
          ) : (
            <Globe size={12} color={VF.inkFaint} />
          )}
        </View>

        {community.description ? (
          <Text style={{ fontSize: 12, fontWeight: '400', color: colors.inkSoft, lineHeight: 17 }} numberOfLines={2}>{community.description}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkSoft }}>{community.memberCount} members</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkSoft }}>{community.onlineCount} online</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: community.weeklyGrowth > 0 ? '#059669' : colors.inkSoft }}>
            {community.weeklyGrowth > 0 ? `+${community.weeklyGrowth}%` : '—'}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkSoft }}>{community.postCount} posts</Text>
        </View>

        {community.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {community.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.gold }}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {community.topDiscussion ? (
          <View style={{ backgroundColor: colors.ivoryDeep, borderRadius: radius.md, padding: 8, gap: 2 }}>
            <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.gold }}>🔥 Top post · {community.topDiscussion.author.displayName}</Text>
            <Text style={{ fontSize: 11, fontWeight: '400', color: colors.inkSoft }} numberOfLines={1}>{community.topDiscussion.content}</Text>
          </View>
        ) : null}

        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Flame size={11} color={colors.gold} />
            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.inkSoft }}>Heat {Math.round(community.activityScore)}</Text>
          </View>
          <View style={{ height: 4, backgroundColor: colors.line, borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, community.activityScore)}%`, height: '100%', backgroundColor: colors.gold }} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {community.memberAvatars.slice(0, 3).map((m, i) => (
              <View key={m.id} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ivoryDeep, borderWidth: 1.5, borderColor: colors.paper, marginLeft: i === 0 ? 0 : -6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                {m.avatar ? <Image source={{ uri: resolveMediaUrl(m.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Text style={{ fontSize: 8, fontWeight: '700', color: colors.ink }}>{initials(m.displayName)}</Text>}
              </View>
            ))}
          </View>
          {community.createdBy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1, minWidth: 0 }}>
              <Crown size={11} color={colors.gold} />
              <Text style={{ fontSize: 10, fontWeight: '500', color: colors.inkSoft, flexShrink: 1 }} numberOfLines={1}>by {community.createdBy.displayName}</Text>
            </View>
          ) : null}
        </View>

        {isMember ? (
          <Pressable onPress={() => router.push(`/community/${community.slug}`)} style={{ borderRadius: 999, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.gold }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.gold }}>View Community</Text>
          </Pressable>
        ) : isPending ? (
          <View style={{ borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.line }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.inkSoft }}>Request Pending</Text>
          </View>
        ) : community.visibility === 'private' ? (
          <View style={{ borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.line }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.inkSoft }}>Invite Only</Text>
          </View>
        ) : (
          <Pressable onPress={(e) => { e.stopPropagation?.(); onJoin(community.slug); }} style={{ borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.gold }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ivory }}>Join Community</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}
