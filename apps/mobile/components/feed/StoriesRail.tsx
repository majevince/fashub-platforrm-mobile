import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, User, Sparkles, ChevronRight } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { resolveMediaUrl } from '@fashub/api-client';
import type { StoryGroup } from '@fashub/types';

type Props = {
  groups: StoryGroup[];
  currentUserId: string;
  currentUserAvatar?: string | null;
  currentUserName: string;
  onPressAdd: () => void;
  onPressGroup: (group: StoryGroup) => void;
};

// Sized to match Facebook's story-tray cards (~116x205, a taller/larger
// presence than the original 78x112) rather than Instagram-style small
// circles — still the established portrait-card format, just bigger.
const CARD_W = 116;
const CARD_H = 205;
const GOLD = '#C6A15B'; // Explicit per the empty-state redesign ticket — violetColors has no "gold" token (colors.gold elsewhere in the app is actually violet), this is a real gold literal.

/**
 * Matches the reference's stories-rail exactly: a "Share a Look" add-card
 * first (shown when the viewer has no active story of their own — if they
 * do, their own group renders as a normal card with a "+" badge overlay
 * instead), then every other author's group ring-coded by hasUnseen
 * (gold-soft = unseen, line-strong = seen). Tapping the card body opens the
 * viewer; tapping the own-card's "+" badge specifically always opens
 * creation, even if a story already exists — the real "replace" path,
 * since the API has no PATCH for stories.
 *
 * The add-card (ShareALookCard, below) is the same bold gradient-ring
 * component whether `groups` is empty or not — it used to be a separate,
 * plainer thin-dashed card in this populated branch, which looked
 * inconsistent with the empty-state redesign's bolder version the instant
 * a second user's story appeared while the viewer still had none of their
 * own; unified per Vincent's explicit call rather than left as two looks
 * for the same action.
 *
 * When `groups` is empty (no stories from ANYONE, not just the viewer),
 * this switches to a separate, dedicated empty-state branch (below) per
 * the "Empty-State Story Tray" redesign ticket — that branch owns its own
 * ghost-placeholders/nudge-banner layout and never touches the
 * populated-state code above/below it, so the two can't regress each
 * other; it reuses the same ShareALookCard for its own add-card too.
 */
export function StoriesRail({ groups, currentUserId, currentUserAvatar, currentUserName, onPressAdd, onPressGroup }: Props) {
  const { spacing } = useTheme();
  const myGroup = groups.find((g) => g.author.id === currentUserId);
  const others = groups.filter((g) => g.author.id !== currentUserId);
  const myAvatarUri = resolveMediaUrl(currentUserAvatar);

  if (groups.length === 0) {
    return <EmptyStoriesTray avatarUri={myAvatarUri} displayName={currentUserName} onPressAdd={onPressAdd} />;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
    >
      {myGroup ? (
        <StoryCard group={myGroup} isMine onPress={() => onPressGroup(myGroup)} onPressAdd={onPressAdd} />
      ) : (
        <ShareALookCard avatarUri={myAvatarUri} displayName={currentUserName} onPress={onPressAdd} />
      )}
      {others.map((group) => (
        <StoryCard key={group.author.id} group={group} onPress={() => onPressGroup(group)} />
      ))}
    </ScrollView>
  );
}

/**
 * Empty-state redesign — ports fashub_story_tray_rectangle_bold_avatar.html
 * 1:1: bold gradient-ring "Share a Look" card, two fading dashed ghost
 * cards (decorative only — plain Views, never Pressable, never wired to
 * onPressGroup), and a nudge banner underneath.
 *
 * Sizing trade-off (flagged per the ticket's own instruction, not silently
 * absorbed): the card row alone reuses CARD_W/CARD_H unchanged, so it's
 * exactly as tall as the current single-row empty state. The nudge banner
 * is new content stacked BELOW that row, which the current layout has no
 * room for without adding height — there's no way to show a banner under
 * the row inside the row's own footprint. Kept the banner as compact as
 * the mock's own proportions allow (single-line headline + subtext, no
 * extra padding) to keep that addition as small as possible; the result is
 * ~60px taller than today's card-only empty state, not the same total
 * footprint. Flagging this rather than either silently growing the Feed
 * layout further or dropping the banner the ticket explicitly asked for.
 */
function EmptyStoriesTray({
  avatarUri,
  displayName,
  onPressAdd,
}: {
  avatarUri: string | null;
  displayName: string;
  onPressAdd: () => void;
}) {
  const { spacing } = useTheme();

  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <ShareALookCard avatarUri={avatarUri} displayName={displayName} onPress={onPressAdd} />

        {/* Ghost placeholders — decorative only, no Pressable, no data. */}
        <View style={[styles.card, styles.ghostCard, { opacity: 0.5 }]} pointerEvents="none">
          <View style={styles.ghostAvatar}>
            <User size={22} color="#b3ab9c" strokeWidth={1.8} />
          </View>
          <Text style={styles.ghostLabel}>Waiting…</Text>
        </View>
        <View style={[styles.card, styles.ghostCard, { opacity: 0.3 }]} pointerEvents="none">
          <View style={styles.ghostAvatar}>
            <User size={22} color="#b3ab9c" strokeWidth={1.8} />
          </View>
          <Text style={styles.ghostLabel}>Waiting…</Text>
        </View>
      </View>

      <Pressable onPress={onPressAdd} style={styles.nudgeBanner}>
        <LinearGradient colors={[V.primarySoft, '#FDF6E3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.nudgeIconChip}>
          <Sparkles size={17} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: V.ink }}>Be the first to share today</Text>
          <Text style={{ fontSize: 9.5, color: V.inkSoft, marginTop: 2 }}>Your look could be the one everyone sees first</Text>
        </View>
        <ChevronRight size={16} color={V.primary} />
      </Pressable>
    </View>
  );
}

/**
 * The "Share a Look" add-card — bold gradient ring (violet→gold→violet),
 * solid violet avatar border, larger high-contrast "+" badge. Ported from
 * fashub_story_tray_rectangle_bold_avatar.html; shared by both the
 * populated-tray branch (rendered when the viewer has no story of their
 * own yet, alongside others' real cards) and the fully-empty-tray branch
 * below, so the create-a-story entry point looks identical everywhere it
 * appears rather than only in the empty state.
 */
function ShareALookCard({
  avatarUri,
  displayName,
  onPress,
}: {
  avatarUri: string | null;
  displayName: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.card, styles.emptyShareCard]}>
      <LinearGradient colors={[V.primary, GOLD, V.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ringGradient}>
        <View style={styles.ringInner}>
          <View style={styles.avatarBold}>
            <View style={styles.avatarBoldClip}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: V.primary }]}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View style={styles.boldPlusBadge}>
              <Plus size={13} color="#fff" strokeWidth={3.5} />
            </View>
          </View>
        </View>
      </LinearGradient>
      <Text style={{ fontSize: 11, fontWeight: '700', color: V.ink, textAlign: 'center', marginTop: 10 }}>
        Share a{'\n'}Look
      </Text>
    </Pressable>
  );
}

function StoryCard({
  group,
  isMine,
  onPress,
  onPressAdd,
}: {
  group: StoryGroup;
  isMine?: boolean;
  onPress: () => void;
  onPressAdd?: () => void;
}) {
  const latest = group.stories[group.stories.length - 1];
  const thumb = resolveMediaUrl(latest?.thumbnailUrl ?? latest?.mediaUrl);
  const avatarUri = resolveMediaUrl(group.author.avatar);

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: V.inkSoft }]}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
        locations={[0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          styles.ring,
          { borderColor: group.hasUnseen ? V.primary : V.lineStrong, borderWidth: group.hasUnseen ? 2.5 : 2 },
        ]}
      />
      {/* "New" tag — matches web exactly: same hasUnseen condition driving the ring,
          top-left corner, violet (not web's original gold, fixed this pass). */}
      {!isMine && group.hasUnseen ? (
        <View style={styles.newTag}>
          <Text style={{ fontSize: 7, fontWeight: '700', letterSpacing: 0.6, color: V.primaryDeep, textTransform: 'uppercase' }}>New</Text>
        </View>
      ) : null}

      {/* Author avatar — matches web's top-right overlay exactly (StoriesBar.tsx): 26px circle,
          semi-white border, drop shadow, first-initial fallback on V.primary. Web only shows
          this on OTHER users' cards — the own-card's top-right corner is the "+" add button
          instead, so this is skipped for isMine to match that exactly, not reinterpreted. */}
      {!isMine ? (
        <View style={styles.avatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: V.primary }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>
                {group.author.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      ) : null}
      <Text style={[styles.name, { fontWeight: '600' }]} numberOfLines={1}>
        {isMine ? 'Your Look' : group.author.displayName}
      </Text>
      {isMine && onPressAdd ? (
        <Pressable
          onPress={onPressAdd}
          hitSlop={6}
          style={[styles.plusBadge, { backgroundColor: V.ink, borderColor: V.canvas, position: 'absolute', bottom: 3, right: 3 }]}
        >
          <Plus size={10} color="#fff" strokeWidth={3} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  plusBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
  },
  newTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: V.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 100,
  },
  avatar: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(247,242,231,0.85)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  name: {
    position: 'absolute',
    bottom: 7,
    left: 7,
    right: 7,
    color: '#fff',
    fontSize: 10.5,
  },
  // ── Empty-state styles ──────────────────────────────────────────────────
  emptyShareCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#c9a1e0',
    backgroundColor: '#f7f2fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringGradient: {
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#f7f2fc',
    padding: 2.5,
  },
  avatarBold: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: V.primary,
  },
  avatarBoldClip: {
    flex: 1,
    borderRadius: 23,
    overflow: 'hidden',
  },
  boldPlusBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: V.primary,
    borderWidth: 2.5,
    borderColor: '#f7f2fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#d8d2c6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ghostAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#c9c2b3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLabel: {
    fontSize: 9.5,
    color: '#9a9089',
  },
  nudgeBanner: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#e4d9f5',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  nudgeIconChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: V.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
