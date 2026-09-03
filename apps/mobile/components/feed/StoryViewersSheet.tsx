import React, { useEffect, useState } from 'react';
import { Modal, View, Text, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { X, Heart } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getStoryViewers, resolveMediaUrl, ApiError } from '@fashub/api-client';
import type { StoryViewerEntry } from '@fashub/types';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import { StoryProfilePreview, type PreviewProfile } from './StoryProfilePreview';

type Props = {
  storyId: string;
  currentUserId: string;
  visible: boolean;
  onClose: () => void;
};

function formatViewedAt(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Matches web's StoryViewersSheet — owner-only real viewer list, most recent first, with a liked indicator. */
export function StoryViewersSheet({ storyId, currentUserId, visible, onClose }: Props) {
  const { colors, typeScale, spacing } = useTheme();
  const [viewers, setViewers] = useState<StoryViewerEntry[] | null>(null);
  const [error, setError] = useState('');
  const [previewProfile, setPreviewProfile] = useState<PreviewProfile | null>(null);

  const load = () => {
    setError('');
    setViewers(null);
    getStoryViewers(storyId)
      .then((res) => setViewers(res.viewers))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load viewers."));
  };

  useEffect(() => {
    if (visible) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, storyId]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,19,16,0.4)' }}>
        <View style={{ backgroundColor: colors.ivory, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingTop: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>{viewers ? `Seen by ${viewers.length}` : 'Viewers'}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.inkSoft} />
            </Pressable>
          </View>

          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : viewers === null ? (
            <LoadingState />
          ) : viewers.length === 0 ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, textAlign: 'center' }}>No one's seen this yet.</Text>
            </View>
          ) : (
            <FlatList
              data={viewers}
              keyExtractor={(v) => v.id}
              contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setPreviewProfile({ id: item.id, displayName: item.displayName, avatar: item.avatar, role: item.role })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                >
                  <Image
                    source={{ uri: resolveMediaUrl(item.avatar) ?? undefined }}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ivoryDeep }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }}>{item.displayName}</Text>
                    <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.inkSoft }}>{formatViewedAt(item.viewedAt)}</Text>
                  </View>
                  {item.liked ? <Heart size={16} color={colors.oxblood} fill={colors.oxblood} /> : null}
                </Pressable>
              )}
            />
          )}
        </View>
      </View>

      {previewProfile && (
        <StoryProfilePreview profile={previewProfile} currentUserId={currentUserId} onClose={() => setPreviewProfile(null)} />
      )}
    </Modal>
  );
}
