import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { resolveMediaUrl } from '@fashub/api-client';
import type { UserPost } from '@fashub/types';

/** Matches web's Dashboard "Recent Posts" grid (myPosts.slice(0, 6), 2-column) — GET /api/posts?authorId= data, not a mislabeled projects/orders list. Cards link to the post detail screen, same as web's `/posts/{id}` link. */
export function RecentPostsCard({ posts }: { posts: UserPost[] }) {
  const { colors, radius } = useTheme();
  const router = useRouter();

  if (posts.length === 0) return null;

  return (
    <View style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink }}>Recent Posts</Text>
        <Pressable onPress={() => router.push('/')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.gold }}>View all</Text>
          <ChevronRight size={14} color={colors.gold} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {posts.slice(0, 6).map((post) => (
          <Pressable
            key={post.id}
            onPress={() => router.push(`/post/${post.id}`)}
            style={{ width: '47%', backgroundColor: colors.ivory, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}
          >
            <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.line }}>
              {post.images[0] ? (
                <Image source={{ uri: resolveMediaUrl(post.images[0]) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : null}
            </View>
            <View style={{ padding: 8, gap: 4 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{post.title}</Text>
              <Text style={{ fontSize: 10.5, fontWeight: '400', color: colors.inkSoft }} numberOfLines={1}>{post.description}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Heart size={11} color={colors.inkSoft} />
                  <Text style={{ fontSize: 10, fontWeight: '500', color: colors.inkSoft }}>{post.likes.length}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <MessageCircle size={11} color={colors.inkSoft} />
                  <Text style={{ fontSize: 10, fontWeight: '500', color: colors.inkSoft }}>{post.comments.length}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
