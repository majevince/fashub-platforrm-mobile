import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Share, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronLeft, ThumbsUp, MessageCircle, Share2, Bookmark, MapPin } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { useAuth } from '../../context/AuthContext';
import { getPost, toggleLike, toggleSavedPost, resolveMediaUrl, ApiError } from '@fashub/api-client';
import type { PostDetail } from '@fashub/types';
import { VerifiedBadge, isVerified } from '../../components/VerifiedBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { useCommentsThread } from '../../components/feed/useCommentsThread';
import { CommentsList, CommentsComposer, CommentsMenuSheet } from '../../components/feed/CommentsThreadView';

const SCREEN_W = Dimensions.get('window').width;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Full-screen post detail — the pushed-route mobile equivalent of web's
 * planned photo-left/details-right modal (side-by-side doesn't fit mobile
 * width, per the mockup). Modeled on app/project/[id].tsx's existing
 * pattern: root-level route, carousel via horizontal ScrollView + index
 * state, SafeAreaView + back-chevron overlay. Comments reuse
 * useCommentsThread()/CommentsThreadView — the exact same implementation
 * CommentsSheet's bottom sheet uses, not a second copy — with the list
 * (scrollEnabled=false) embedded in this screen's own ScrollView so the
 * whole page scrolls as one column, and the composer pinned to the
 * screen's bottom edge outside that ScrollView.
 *
 * No view-count tracking here — confirmed in Step 0 that posts (unlike
 * portfolio Projects) have no view-tracking endpoint at all today, so none
 * is added as a silent side effect of this screen.
 */
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState('');
  const [mediaIndex, setMediaIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);

  const load = () => {
    if (!id || !user) return;
    setError('');
    getPost(id, user.id)
      .then((res) => {
        setPost(res);
        setLiked(user ? res.likes.includes(user.id) : false);
        setLikesCount(res.likes.length);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load this post."));
  };

  React.useEffect(load, [id, user?.id]);

  const thread = useCommentsThread(id ?? '', post?.authorId, () => {});

  if (!user || !id) return null;

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: V.canvas }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={V.ink} />
          </Pressable>
        </View>
        <ErrorState message={error} onRetry={load} />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: V.canvas }} edges={['top']}>
        <LoadingState label="Loading post…" />
      </SafeAreaView>
    );
  }

  const avatarUri = resolveMediaUrl(post.authorAvatar);
  const images = post.images;
  const verified = isVerified({ subscriptionTier: post.authorSubscriptionTier, verified: post.authorProfile.isVerified });

  const onMediaScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setMediaIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  };

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
    try {
      await toggleSavedPost(post.id, user.id);
    } catch {
      setSaved(!next);
    }
  };

  const handleShare = () => {
    Share.share({ message: `${post.title} — ${post.authorName} on FaSHub` }).catch(() => {});
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: V.canvas }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ position: 'relative' }}>
            {images.length > 0 ? (
              <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#0c0c0c' }}>
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onMediaScroll}>
                  {images.map((uri, i) => (
                    <Image key={i} source={{ uri: resolveMediaUrl(uri) ?? undefined }} style={{ width: SCREEN_W, height: '100%' }} contentFit="cover" />
                  ))}
                </ScrollView>
                {images.length > 1 ? (
                  <>
                    <View style={{ position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(20,18,16,0.55)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#fff' }}>{mediaIndex + 1} / {images.length}</Text>
                    </View>
                    <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                      {images.map((_, i) => (
                        <View key={i} style={{ width: i === mediaIndex ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === mediaIndex ? V.primary : 'rgba(255,255,255,0.5)' }} />
                      ))}
                    </View>
                  </>
                ) : null}
              </View>
            ) : (
              <View style={{ width: '100%', aspectRatio: 1.3, backgroundColor: V.primarySoft }} />
            )}

            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={{ position: 'absolute', top: 12, left: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(20,18,16,0.5)', alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronLeft size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={{ padding: 16, gap: 12 }}>
            <Pressable onPress={() => router.push(`/profile/${post.authorId}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: V.amberLine, backgroundColor: V.primary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{post.authorName.slice(0, 2).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <Text style={{ fontWeight: '600', fontSize: 14.5, color: V.ink }} numberOfLines={1}>{post.authorName}</Text>
                  {verified ? <VerifiedBadge size="sm" /> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '500', color: V.inkFaint }}>{formatDate(post.createdAt)}</Text>
                  {post.location ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <MapPin size={9} color={V.inkFaint} />
                      <Text style={{ fontSize: 10.5, fontWeight: '500', color: V.inkFaint }}>{post.location}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>

            <Text style={{ fontSize: 15, fontWeight: '700', color: V.ink }}>{post.title}</Text>
            {post.description ? <Text style={{ fontSize: 13.5, lineHeight: 19, color: V.inkSoft }}>{post.description}</Text> : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: V.line }}>
              <Pressable onPress={handleLike} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8 }}>
                <ThumbsUp size={18} color={liked ? V.primary : V.inkFaint} fill={liked ? V.primary : 'transparent'} />
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: liked ? V.primary : V.inkFaint }}>{likesCount}</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8 }}>
                <MessageCircle size={18} color={V.inkFaint} />
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: V.inkFaint }}>{thread.comments?.length ?? post.comments.length}</Text>
              </View>
              <Pressable onPress={handleSave} style={{ padding: 8 }}>
                <Bookmark size={18} color={saved ? V.primary : V.inkFaint} fill={saved ? V.primary : 'transparent'} />
              </Pressable>
              <Pressable onPress={handleShare} style={{ padding: 8 }}>
                <Share2 size={18} color={V.inkFaint} />
              </Pressable>
            </View>
          </View>

          <View style={{ borderTopWidth: 8, borderTopColor: V.canvas }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: V.ink, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
              Comments{thread.comments && thread.comments.length > 0 ? ` (${thread.comments.length})` : ''}
            </Text>
            <CommentsList thread={thread} scrollable={false} />
          </View>
        </ScrollView>

        <CommentsComposer thread={thread} />
      </KeyboardAvoidingView>

      {thread.menuFor && <CommentsMenuSheet actions={thread.menuActions} onClose={thread.closeMenu} />}
    </SafeAreaView>
  );
}
