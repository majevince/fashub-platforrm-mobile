import React, { useState } from 'react';
import { Modal, View, Text, Pressable, Alert, Share, Switch } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Settings, Link2, Trash2, VolumeX, Flag, UserCircle, Eye, Star, Archive, Share2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { muteStoryAuthor, reportStory, deleteStory, API_BASE_URL } from '@fashub/api-client';

type Props = {
  visible: boolean;
  onClose: () => void;
  isOwner: boolean;
  storyId: string;
  authorId: string;
  authorName: string;
  viewCount: number;
  onOpenSettings: () => void;
  onOpenViewers: () => void;
  onOpenProfile: () => void;
  onDeleted: () => void;
  onToast: (message: string) => void;
};

const NOT_BUILT_MESSAGE =
  'Not built yet — there\'s no backend support for this (no Highlight/Archive model exists on the story yet). Flagged in the parity report rather than faked.';

/**
 * Bottom sheet, not web's small anchored dropdown — standard mobile
 * convention. Owner/viewer content matches web's StoryOptionsMenu split
 * exactly (mute belongs to a viewer's relationship with someone else's
 * stories, not the owner's own settings, so it stays here rather than
 * folded into StorySettingsSheet). "Story settings" opens web's actual
 * settings 1:1; Viewers/Highlights/Archive/Share are the standard-platform
 * additions layered on top, per the brief.
 */
export function StoryOptionsMenu({
  visible,
  onClose,
  isOwner,
  storyId,
  authorId,
  authorName,
  viewCount,
  onOpenSettings,
  onOpenViewers,
  onOpenProfile,
  onDeleted,
  onToast,
}: Props) {
  const { colors, typeScale, spacing } = useTheme();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archived, setArchived] = useState(false);

  const close = (after?: () => void) => {
    onClose();
    if (after) setTimeout(after, 250);
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(`${API_BASE_URL}/feed?story=${storyId}`);
    close(() => onToast('Link copied'));
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `${API_BASE_URL}/feed?story=${storyId}` });
    } catch {
      // User dismissed the native share sheet — not an error.
    }
    close();
  };

  const handleMute = async () => {
    try {
      const res = await muteStoryAuthor(authorId);
      close(() => onToast(res.muted ? `Muted ${authorName}` : `Unmuted ${authorName}`));
    } catch {
      close(() => onToast("Couldn't update mute. Try again."));
    }
  };

  const handleReport = async () => {
    try {
      await reportStory(storyId);
      close(() => onToast('Reported. Thanks for letting us know.'));
    } catch {
      close(() => onToast("Couldn't report. Try again."));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteStory(storyId);
      onDeleted();
      setConfirmDelete(false);
      onClose();
    } catch {
      setDeleting(false);
      onToast("Couldn't delete. Try again.");
    }
  };

  const handleHighlight = () => Alert.alert('Highlights', NOT_BUILT_MESSAGE);

  const handleArchiveToggle = () => {
    setArchived((v) => !v);
    Alert.alert('Archive', NOT_BUILT_MESSAGE);
    setTimeout(() => setArchived(false), 400);
  };

  const Row = ({ icon, label, onPress, destructive }: { icon: React.ReactNode; label: string; onPress: () => void; destructive?: boolean }) => (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line }}
    >
      {icon}
      <Text style={{ fontSize: 14, fontWeight: '600', color: destructive ? colors.oxblood : colors.ink }}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,19,16,0.4)' }} onPress={onClose}>
          <Pressable style={{ backgroundColor: colors.ivory, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: spacing.xl }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center', marginTop: 10, marginBottom: 6 }} />

            {isOwner ? (
              <>
                <Row icon={<Settings size={18} color={colors.inkSoft} />} label="Story settings" onPress={() => close(onOpenSettings)} />
                <Row icon={<Eye size={18} color={colors.inkSoft} />} label={`Viewers · ${viewCount}`} onPress={() => close(onOpenViewers)} />
                <Row icon={<Star size={18} color={colors.inkSoft} />} label="Add to Highlights" onPress={handleHighlight} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Archive size={18} color={colors.inkSoft} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>Archive this story</Text>
                  </View>
                  <Switch value={archived} onValueChange={handleArchiveToggle} trackColor={{ true: colors.gold, false: colors.line }} />
                </View>
                <Row icon={<Share2 size={18} color={colors.inkSoft} />} label="Share" onPress={handleShare} />
                <Row icon={<Link2 size={18} color={colors.inkSoft} />} label="Copy link" onPress={copyLink} />
                <Row icon={<Trash2 size={18} color={colors.oxblood} />} label="Delete story" destructive onPress={() => close(() => setConfirmDelete(true))} />
              </>
            ) : (
              <>
                <Row icon={<VolumeX size={18} color={colors.inkSoft} />} label={`Mute ${authorName}`} onPress={handleMute} />
                <Row icon={<Share2 size={18} color={colors.inkSoft} />} label="Share" onPress={handleShare} />
                <Row icon={<Link2 size={18} color={colors.inkSoft} />} label="Copy link" onPress={copyLink} />
                <Row icon={<Flag size={18} color={colors.inkSoft} />} label="Report" onPress={handleReport} />
                <Row icon={<UserCircle size={18} color={colors.inkSoft} />} label="About this account" onPress={() => close(onOpenProfile)} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={confirmDelete} animationType="fade" transparent onRequestClose={() => !deleting && setConfirmDelete(false)}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,16,0.5)', padding: spacing.lg }}>
          <View style={{ width: '100%', backgroundColor: colors.ivory, borderRadius: 16, padding: spacing.lg }}>
            <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Delete story?</Text>
            <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, marginTop: 6 }}>
              This story will be permanently deleted. Anyone who already viewed it will no longer see it.
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
              <Pressable
                onPress={() => setConfirmDelete(false)}
                disabled={deleting}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', opacity: deleting ? 0.5 : 1 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.oxblood, alignItems: 'center', opacity: deleting ? 0.5 : 1 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ivory }}>{deleting ? 'Deleting…' : 'Delete'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
