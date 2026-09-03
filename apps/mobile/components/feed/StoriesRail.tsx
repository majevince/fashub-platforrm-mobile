import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
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

/**
 * Matches the reference's stories-rail exactly: a dashed "Add" card first
 * (shown when the viewer has no active story of their own — if they do,
 * their own group renders as a normal card with a "+" badge overlay
 * instead, same as the reference's own-story treatment), then every other
 * author's group ring-coded by hasUnseen (gold-soft = unseen, line-strong
 * = seen). Tapping the card body opens the viewer; tapping the own-card's
 * "+" badge specifically always opens creation, even if a story already
 * exists — the real "replace" path, since the API has no PATCH for stories.
 */
export function StoriesRail({ groups, currentUserId, currentUserAvatar, currentUserName, onPressAdd, onPressGroup }: Props) {
  const { spacing } = useTheme();
  const myGroup = groups.find((g) => g.author.id === currentUserId);
  const others = groups.filter((g) => g.author.id !== currentUserId);
  const myAvatarUri = resolveMediaUrl(currentUserAvatar);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
    >
      {myGroup ? (
        <StoryCard group={myGroup} isMine onPress={() => onPressGroup(myGroup)} onPressAdd={onPressAdd} />
      ) : (
        <Pressable onPress={onPressAdd} style={[styles.card, { backgroundColor: V.canvas, borderColor: V.lineStrong }, styles.addCard]}>
          <View style={styles.plusAvatarWrap}>
            {myAvatarUri ? (
              <Image source={{ uri: myAvatarUri }} style={styles.plusAvatarImage} contentFit="cover" />
            ) : (
              <View style={[styles.plusAvatarImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: V.primary }]}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                  {currentUserName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.plusBadge, { backgroundColor: V.ink, borderColor: V.canvas, position: 'absolute', bottom: -2, right: -2 }]}>
              <Plus size={11} color="#fff" strokeWidth={3} />
            </View>
          </View>
          <Text style={{ fontSize: 10.5, fontWeight: '600', color: V.inkSoft, textAlign: 'center' }}>
            Share a{'\n'}Look
          </Text>
        </Pressable>
      )}
      {others.map((group) => (
        <StoryCard key={group.author.id} group={group} onPress={() => onPressGroup(group)} />
      ))}
    </ScrollView>
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
  addCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  plusAvatarWrap: {
    width: 44,
    height: 44,
  },
  plusAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
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
});
