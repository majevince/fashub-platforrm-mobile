import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronLeft, Heart, Calendar, MapPin } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useAuth } from '../../../context/AuthContext';
import { getSavedItems, toggleSavedItem, resolveMediaUrl } from '@fashub/api-client';
import type { SavedItem, SavedEventContent, SavedPostContent, SavedProjectContent } from '@fashub/types';
import { LoadingState } from '../../../components/LoadingState';

/**
 * Web's Favorites (components/favorites/SavedItemsPage.tsx) shows Events,
 * Posts, and Projects — Communities are also a valid SaveContentType on the
 * shared /api/saved-items backend but web's own Favorites screen doesn't
 * surface them either, so this doesn't either (matches web exactly, not an
 * omission). Fabrics are "save"-able (heart icon) on the Inventory screen
 * but that save is client-state-only on web — never persisted, never
 * appears here — confirmed by reading both screens' source; not a mobile
 * gap, a pre-existing web one.
 */
export default function FavoritesScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<SavedItem<SavedEventContent>[] | null>(null);
  const [posts, setPosts] = useState<SavedItem<SavedPostContent>[] | null>(null);
  const [projects, setProjects] = useState<SavedItem<SavedProjectContent>[] | null>(null);

  const load = () => {
    if (!user) return;
    getSavedItems(user.id, 'EVENT').then((r) => setEvents(r.items as SavedItem<SavedEventContent>[]));
    getSavedItems(user.id, 'POST').then((r) => setPosts(r.items as SavedItem<SavedPostContent>[]));
    getSavedItems(user.id, 'PROJECT').then((r) => setProjects(r.items as SavedItem<SavedProjectContent>[]));
  };

  useEffect(load, [user]);

  if (!user) return null;

  const loading = events === null || posts === null || projects === null;
  const empty = !loading && events!.length === 0 && posts!.length === 0 && projects!.length === 0;

  const unsave = async (contentId: string, contentType: 'EVENT' | 'POST' | 'PROJECT') => {
    await toggleSavedItem(user.id, contentId, contentType);
    load();
  };

  const section = <T,>(title: string, items: SavedItem<T>[] | null, render: (item: SavedItem<T>) => React.ReactNode) =>
    items && items.length > 0 ? (
      <View style={{ gap: 10 }}>
        <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft }}>{title.toUpperCase()} ({items.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {items.map(render)}
        </ScrollView>
      </View>
    ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Favorites</Text>
      </View>

      {loading ? (
        <LoadingState />
      ) : empty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 32 }}>
          <Heart size={28} color={colors.lineStrong} />
          <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Nothing saved yet</Text>
          <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, textAlign: 'center' }}>Events, posts, and projects you save will show up here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
          {section('Events', events, (item) =>
            item.content ? (
              <View key={item.id} style={{ width: 200, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden' }}>
                <View style={{ height: 90, backgroundColor: colors.ivoryDeep }}>
                  {item.content.image ? <Image source={{ uri: resolveMediaUrl(item.content.image) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                </View>
                <View style={{ padding: 10, gap: 4 }}>
                  <Text style={{ fontWeight: '600', fontSize: 12, color: colors.ink }} numberOfLines={1}>
                    {item.content.title}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Calendar size={10} color={colors.inkSoft} />
                    <Text style={{ fontWeight: '500', fontSize: 9.5, color: colors.inkSoft }}>{new Date(item.content.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                  </View>
                  {item.content.city ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} color={colors.inkSoft} />
                      <Text style={{ fontWeight: '400', fontSize: 9.5, color: colors.inkSoft }} numberOfLines={1}>{item.content.city}</Text>
                    </View>
                  ) : null}
                  <Pressable onPress={() => unsave(item.contentId, 'EVENT')} style={{ marginTop: 4 }}>
                    <Text style={{ fontWeight: '600', fontSize: 10.5, color: colors.oxblood }}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          )}

          {section('Posts', posts, (item) =>
            item.content ? (
              <View key={item.id} style={{ width: 160, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden' }}>
                <View style={{ height: 130, backgroundColor: colors.ivoryDeep }}>
                  {item.content.images[0] ? <Image source={{ uri: resolveMediaUrl(item.content.images[0]) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                </View>
                <View style={{ padding: 9, gap: 3 }}>
                  <Text style={{ fontWeight: '600', fontSize: 11.5, color: colors.ink }} numberOfLines={1}>
                    {item.content.title}
                  </Text>
                  <Text style={{ fontWeight: '400', fontSize: 10, color: colors.inkSoft }} numberOfLines={1}>{item.content.author?.displayName}</Text>
                  <Pressable onPress={() => unsave(item.contentId, 'POST')} style={{ marginTop: 2 }}>
                    <Text style={{ fontWeight: '600', fontSize: 10, color: colors.oxblood }}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          )}

          {section('Projects', projects, (item) =>
            item.content ? (
              <View key={item.id} style={{ width: 160, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden' }}>
                <View style={{ height: 130, backgroundColor: colors.ivoryDeep }}>
                  {item.content.coverImage ? <Image source={{ uri: resolveMediaUrl(item.content.coverImage) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                </View>
                <View style={{ padding: 9, gap: 3 }}>
                  <Text style={{ fontWeight: '600', fontSize: 11.5, color: colors.ink }} numberOfLines={1}>
                    {item.content.title}
                  </Text>
                  <Text style={{ fontWeight: '400', fontSize: 10, color: colors.inkSoft }} numberOfLines={1}>
                    {(item.content.designer ?? item.content.tailor)?.user.displayName}
                  </Text>
                  <Pressable onPress={() => unsave(item.contentId, 'PROJECT')} style={{ marginTop: 2 }}>
                    <Text style={{ fontWeight: '600', fontSize: 10, color: colors.oxblood }}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
