import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { X, FolderKanban } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getPortfolioProjects, trackProjectView, resolveMediaUrl } from '@fashub/api-client';
import type { PortfolioProject } from '@fashub/types';
import { LoadingState } from '../../components/LoadingState';
import { EmptyNotice } from './PortfolioTab';

export function ProjectsTab({ userId, role, showProjects }: { userId: string; role: 'designer' | 'tailor'; showProjects: boolean }) {
  const { colors, typeScale, radius } = useTheme();
  const [projects, setProjects] = useState<PortfolioProject[] | null>(null);
  const [selected, setSelected] = useState<PortfolioProject | null>(null);

  useEffect(() => {
    if (!showProjects) return;
    getPortfolioProjects(userId, role)
      .then((res) => setProjects(res.projects))
      .catch(() => setProjects([]));
  }, [userId, role, showProjects]);

  if (!showProjects) {
    return <EmptyNotice icon={FolderKanban} title="Projects are Private" message="This user has chosen to keep their projects private." />;
  }

  if (projects === null) return <LoadingState />;

  if (projects.length === 0) {
    return <EmptyNotice icon={FolderKanban} title="No Projects Yet" message="This user hasn't published any projects." />;
  }

  return (
    <View style={{ gap: 10 }}>
      {projects.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => {
            setSelected(p);
            trackProjectView(p.id).catch(() => {});
          }}
          style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 10 }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.ivoryDeep, overflow: 'hidden' }}>
            {p.coverImage ? <Image source={{ uri: resolveMediaUrl(p.coverImage) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
          </View>
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }} numberOfLines={1}>
              {p.title}
            </Text>
            {p.category ? <Text style={{ fontSize: 11, fontWeight: '400', color: colors.inkSoft }}>{p.category}</Text> : null}
          </View>
          {p.isFeatured ? (
            <View style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 8.5, fontWeight: '600', letterSpacing: 0.4, color: colors.gold }}>FEATURED</Text>
            </View>
          ) : null}
        </Pressable>
      ))}

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected ? (
          <View style={{ flex: 1, backgroundColor: colors.ivory }}>
            <ScrollView>
              <View style={{ height: 220, backgroundColor: colors.ivoryDeep }}>
                {selected.coverImage ? <Image source={{ uri: resolveMediaUrl(selected.coverImage) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                <Pressable onPress={() => setSelected(null)} style={{ position: 'absolute', top: 44, left: 16, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(20,18,16,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color="#fff" />
                </Pressable>
              </View>
              <View style={{ padding: 20, gap: 12 }}>
                <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>{selected.title}</Text>
                {selected.category ? <Text style={{ fontSize: 11, fontWeight: '600', color: colors.gold, textTransform: 'uppercase' }}>{selected.category}</Text> : null}
                {selected.description || selected.summary ? <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{selected.description ?? selected.summary}</Text> : null}
                {selected.tags.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {selected.tags.map((t) => (
                      <View key={t} style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '500', color: colors.oxblood }}>#{t}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {selected.images.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {selected.images.map((img, i) => (
                      <Image key={i} source={{ uri: resolveMediaUrl(img) ?? undefined }} style={{ width: '48%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.ivoryDeep }} contentFit="cover" />
                    ))}
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}
