import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { getProjectDetailRecommendations, resolveMediaUrl } from '@fashub/api-client';
import type { RecommendedProject } from '@fashub/types';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Location + profile + browse-history blend (getProjectDetailRecommendations,
 * mode=detail) — same structural pattern as the "Related Events" rail on
 * app/event/[id].tsx (bold heading + horizontal scroll of fixed-width
 * cards, hidden entirely when empty), applied to Projects. The server
 * excludes sourceProjectId from candidates already; this component doesn't
 * duplicate that filter, just trusts the response.
 */
export function RecommendedProjectsRail({ sourceProjectId, userId }: { sourceProjectId: string; userId?: string }) {
  const { colors, fontFamilies } = useTheme();
  const router = useRouter();
  const [projects, setProjects] = useState<RecommendedProject[] | null>(null);

  useEffect(() => {
    getProjectDetailRecommendations(sourceProjectId, { userId, limit: 8 })
      .then((res) => setProjects(res.recommendations))
      .catch(() => setProjects([]));
  }, [sourceProjectId, userId]);

  if (!projects || projects.length === 0) return null;

  return (
    <View style={{ marginTop: 16, gap: 10 }}>
      <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 15, color: colors.ink }}>Recommended Projects</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {projects.map((p) => (
          <Pressable key={p.id} onPress={() => router.push(`/project/${p.id}`)} style={{ width: 150 }}>
            <View style={{ width: 150, height: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.ivoryDeep }}>
              {p.coverImage ? (
                <Image source={{ uri: resolveMediaUrl(p.coverImage) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : null}
            </View>
            <Text style={{ fontFamily: fontFamilies.sansSemiBold, fontSize: 12.5, color: colors.ink, marginTop: 6 }} numberOfLines={1}>{p.title}</Text>
            {p.creator ? (
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 11, color: colors.inkSoft, marginTop: 1 }} numberOfLines={1}>{p.creator.displayName}</Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
