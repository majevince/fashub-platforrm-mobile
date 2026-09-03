import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Share, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { violetColors as V } from '@fashub/design-tokens';
import { ThumbsUp, MessageCircle, Share2, Bookmark, MoreHorizontal, MapPin, Repeat2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { toggleLike, toggleSavedPost, repostPost, resolveMediaUrl, ApiError } from '@fashub/api-client';
import type { FeedPost } from '@fashub/types';
import { VerifiedBadge, isVerified } from '../VerifiedBadge';
import { CommentsSheet } from './CommentsSheet';

type Props = {
  post: FeedPost;
};

const SCREEN_W = Dimensions.get('window').width;
const CARD_MARGIN = 16;
const MEDIA_W = SCREEN_W - CARD_MARGIN * 2;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Ported from web's components/posts/PostCard/** (PostCard.tsx +
 * EngagementBar.tsx + PostGallery.tsx) — colors are web's real, live
 * violet Feed palette (packages/design-tokens's `violetColors`, confirmed
 * against lib/design/tokens.ts), not this app's default ink/ivory/gold set.
 *
 * Deliberately NOT ported: web's progressive-disclosure ("View details &
 * comments" collapse, professional badges, event banners, quick
 * actions/follow, quote-request modal, Message CTA) and its 5-emoji
 * LinkedIn-style reaction picker (hover-to-reveal on desktop, would need a
 * long-press touch equivalent). Both are real web features and larger,
 * separate scope than this card's visual/verified-badge parity pass — see
 * the Feed color-parity ticket this was built for.
 */
export function PostCard({ post }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const openDetail = () => router.push(`/post/${post.id}`);

  const [liked, setLiked] = useState(user ? post.likes.includes(user.id) : false);
  const [likesCount, setLikesCount] = useState(post.likes.length);
  const [saved, setSaved] = useState(false);
  const [savedCount, setSavedCount] = useState(post.interests.length);
  const [reposted, setReposted] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments.length);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);

  const handleLike = async () => {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setLikesCount((c) => (next ? c + 1 : c - 1));
    try {
      const res = await toggleLike(post.id, user.id);
      setLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch {
      setLiked(!next);
      setLikesCount((c) => (next ? c - 1 : c + 1));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const next = !saved;
    setSaved(next);
    setSavedCount((c) => (next ? c + 1 : c - 1));
    try {
      const res = await toggleSavedPost(post.id, user.id);
      setSaved(res.saved);
    } catch {
      setSaved(!next);
      setSavedCount((c) => (next ? c - 1 : c + 1));
    }
  };

  const handleRepost = async () => {
    if (!user || reposted) return;
    try {
      await repostPost(post.id, user.id);
      setReposted(true);
    } catch (err) {
      if (err instanceof ApiError && /already reposted/i.test(err.message)) {
        setReposted(true);
      }
    }
  };

  const handleShare = () => {
    Share.share({ message: `${post.title} — ${post.authorName} on FaSHub` }).catch(() => {});
  };

  const onMediaScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / MEDIA_W);
    setMediaIndex(idx);
  };

  const avatarUri = resolveMediaUrl(post.authorAvatar);
  const images = post.images;
  const verified = isVerified({ subscriptionTier: post.authorSubscriptionTier, verified: post.authorIsVerified });

  return (
    <View
      style={{
        backgroundColor: V.surface,
        borderWidth: 1,
        borderColor: V.line,
        borderRadius: 16,
        overflow: 'hidden',
        marginHorizontal: CARD_MARGIN,
        marginBottom: 12,
        shadowColor: 'rgba(20,17,15,0.2)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 2,
      }}
    >
      {/* Head */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: V.line }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: V.amberLine, backgroundColor: V.primary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{post.authorName.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <Text style={{ fontWeight: '600', fontSize: 14.5, color: V.ink }} numberOfLines={1}>
              {post.authorName}
            </Text>
            {verified ? <VerifiedBadge size="sm" /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: V.primary, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1.5 }}>
              <Text style={{ fontSize: 8.5, fontWeight: '700', letterSpacing: 0.4, color: '#fff', textTransform: 'uppercase' }}>
                {post.authorRole}
              </Text>
            </View>
            <Text style={{ fontSize: 10, fontWeight: '500', color: V.inkFaint }}>
              {formatDate(post.createdAt)}
              {post.location ? ` · ${post.location}` : ''}
            </Text>
          </View>
        </View>
        <MoreHorizontal size={20} color={V.inkFaint} />
      </View>

      {/* Media — tap opens the full post detail screen; the horizontal
          ScrollView inside still handles carousel swipes independently. */}
      {images.length > 0 && (
        <Pressable onPress={openDetail} style={{ width: '100%', aspectRatio: 1.2, position: 'relative', backgroundColor: '#0b0b0c' }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMediaScroll}
          >
            {images.map((uri, i) => (
              <Image key={i} source={{ uri: resolveMediaUrl(uri) ?? undefined }} style={{ width: MEDIA_W, height: '100%' }} contentFit="cover" />
            ))}
          </ScrollView>
          {(post.price != null || post.priceRange) && (
            <View style={{ position: 'absolute', left: 10, bottom: 10, backgroundColor: 'rgba(27,21,35,0.6)', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#fff', lineHeight: 15 }}>
                {post.priceRange || `$${post.price}`}
              </Text>
              <Text style={{ fontSize: 8, fontWeight: '500', letterSpacing: 0.5, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>
                {post.priceRange ? 'Range' : 'Price'}
              </Text>
            </View>
          )}
          {images.length > 1 && (
            <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(27,21,35,0.55)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '500', color: '#fff' }}>
                {mediaIndex + 1} / {images.length}
              </Text>
            </View>
          )}
          {images.length > 1 && (
            <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={{ width: i === mediaIndex ? 22 : 6, height: 6, borderRadius: 3, backgroundColor: i === mediaIndex ? '#fff' : 'rgba(255,255,255,0.5)' }}
                />
              ))}
            </View>
          )}
        </Pressable>
      )}

      {/* Body */}
      <View style={{ padding: 12, gap: 8 }}>
        {post.title ? (
          <Pressable onPress={openDetail}>
            <Text style={{ fontWeight: '600', fontSize: 16.5, color: V.ink, lineHeight: 21 }}>
              {post.title}
            </Text>
          </Pressable>
        ) : null}
        {post.description ? (
          <Pressable onPress={() => setExpanded((v) => !v)} disabled={expanded}>
            <Text style={{ fontSize: 13.5, fontWeight: '400', lineHeight: 19, color: V.inkSoft }} numberOfLines={expanded ? undefined : 3}>
              {post.description}
            </Text>
          </Pressable>
        ) : null}
        {post.tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {post.tags.map((tag) => (
              <View key={tag} style={{ backgroundColor: V.primarySoft, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3.5 }}>
                <Text style={{ fontSize: 9.5, fontWeight: '500', color: V.primaryDeep }}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Engagement bar — matches web's EngagementBar.tsx grouping (Like/Save/Comment/Share
          left, Repost right); web's hover-reveal 5-reaction picker and Message CTA are
          desktop/feature-parity items not ported here, see file header comment. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: V.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={handleLike}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: liked ? V.primarySoft : 'transparent' }}
          >
            <ThumbsUp size={19} color={liked ? V.primary : V.inkFaint} fill={liked ? V.primary : 'transparent'} strokeWidth={2} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: liked ? V.primary : V.inkFaint }}>{likesCount}</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: saved ? V.amberSoft : 'transparent' }}
          >
            <Bookmark size={19} color={saved ? V.amber : V.inkFaint} fill={saved ? V.amber : 'transparent'} strokeWidth={2} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: saved ? V.amber : V.inkFaint }}>{savedCount}</Text>
          </Pressable>
          <Pressable
            onPress={() => setCommentsOpen(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 }}
          >
            <MessageCircle size={19} color={V.inkFaint} strokeWidth={2} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: V.inkFaint }}>{commentsCount}</Text>
          </Pressable>
          <Pressable onPress={handleShare} style={{ padding: 10 }}>
            <Share2 size={19} color={V.inkFaint} strokeWidth={2} />
          </Pressable>
        </View>
        <Pressable
          onPress={handleRepost}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 }}
        >
          <Repeat2 size={18} color={reposted ? V.primary : V.inkFaint} strokeWidth={2} />
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: reposted ? V.primary : V.inkFaint }}>
            {reposted ? 'Reposted' : 'Repost'}
          </Text>
        </Pressable>
      </View>

      <CommentsSheet
        postId={post.id}
        postAuthorId={post.authorId}
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentAdded={() => setCommentsCount((c) => c + 1)}
      />
    </View>
  );
}
