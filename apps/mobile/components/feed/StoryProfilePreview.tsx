import React, { useState } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { resolveMediaUrl, followUser } from '@fashub/api-client';

export type PreviewProfile = {
  id: string;
  displayName: string;
  avatar: string | null;
  role?: string;
  isFollowing?: boolean;
};

type Props = {
  profile: PreviewProfile;
  currentUserId: string;
  onClose: () => void;
};

/**
 * Matches web's StoryProfilePreview.tsx exactly: a compact "About this
 * account" popover, reused for both the "⋯" menu's "About this account"
 * action and tapping a row in the viewers list — same two entry points as
 * web. Not previously built on mobile at all (StoryViewer.tsx's
 * onOpenProfile was a dead "not built yet" placeholder alert).
 */
export function StoryProfilePreview({ profile, currentUserId, onClose }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(!!profile.isFollowing);
  const [loading, setLoading] = useState(false);
  const isSelf = profile.id === currentUserId;
  const avatarUri = resolveMediaUrl(profile.avatar);

  const handleFollow = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await followUser(profile.id, currentUserId);
      setFollowing(res.isFollowing);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(27,21,35,0.6)', padding: 16 }} onPress={onClose}>
        <Pressable style={{ width: '100%', maxWidth: 320, borderRadius: 20, padding: 24, alignItems: 'center', backgroundColor: V.surface }} onPress={(e) => e.stopPropagation()}>
          <Pressable onPress={onClose} hitSlop={8} style={{ position: 'absolute', top: 10, right: 10, padding: 6 }}>
            <X size={16} color={V.inkSoft} />
          </Pressable>

          <View style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden', marginBottom: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: V.primary }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text style={{ fontSize: 26, fontWeight: '600', color: '#fff' }}>{profile.displayName.charAt(0).toUpperCase()}</Text>
            )}
          </View>

          <Text style={{ fontSize: 17, fontWeight: '600', color: V.ink }}>{profile.displayName}</Text>
          {profile.role ? (
            <Text style={{ fontSize: 12, fontWeight: '400', color: V.inkFaint, marginTop: 2, textTransform: 'capitalize' }}>{profile.role}</Text>
          ) : null}

          {!isSelf ? (
            <View style={{ gap: 8, marginTop: 20, width: '100%' }}>
              <Pressable
                onPress={handleFollow}
                disabled={loading}
                style={{
                  width: '100%',
                  paddingVertical: 11,
                  borderRadius: 999,
                  alignItems: 'center',
                  opacity: loading ? 0.5 : 1,
                  backgroundColor: following ? V.canvas : V.primary,
                  borderWidth: following ? 1 : 0,
                  borderColor: V.line,
                }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: following ? V.ink : '#fff' }}>
                  {loading ? '…' : following ? '✓ Following' : '+ Follow'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onClose();
                  router.push(`/profile/${profile.id}`);
                }}
                style={{ width: '100%', paddingVertical: 11, borderRadius: 999, alignItems: 'center', backgroundColor: V.canvas, borderWidth: 1, borderColor: V.line }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: V.ink }}>View full profile</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
