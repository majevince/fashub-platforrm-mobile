import React, { useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { Image } from 'expo-image';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getStorySettings, updateStorySettings, addCloseFriend, removeCloseFriend, toggleHiddenFromUser, resolveMediaUrl, ApiError } from '@fashub/api-client';
import type { StoryPrivacySettings } from '@fashub/types';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const REPLY_OPTIONS: { value: 'everyone' | 'followers' | 'off'; label: string; hint: string }[] = [
  { value: 'everyone', label: 'Everyone', hint: 'Any FaSHub member can reply or react' },
  { value: 'followers', label: 'People you follow', hint: 'Only accounts you follow back' },
  { value: 'off', label: 'Off', hint: 'No one can reply to this story' },
];

/** Matches web's StorySettingsSheet exactly — same 4 sections, same copy, same ordering. */
export function StorySettingsSheet({ visible, onClose }: Props) {
  const { colors, typeScale, spacing, radius } = useTheme();
  const [settings, setSettings] = useState<StoryPrivacySettings | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    setSettings(null);
    getStorySettings()
      .then(setSettings)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your story settings."));
  };

  useEffect(() => {
    if (visible) load();
  }, [visible]);

  const setReplies = async (allowReplies: 'everyone' | 'followers' | 'off') => {
    setSettings((s) => (s ? { ...s, allowReplies } : s));
    await updateStorySettings({ allowReplies }).catch(() => {});
  };

  const toggleCloseFriendsOnly = async () => {
    const next = !settings?.closeFriendsOnly;
    setSettings((s) => (s ? { ...s, closeFriendsOnly: next } : s));
    await updateStorySettings({ closeFriendsOnly: next }).catch(() => {});
  };

  const toggleCloseFriend = async (personId: string, isCloseFriend: boolean) => {
    setSettings((s) => (s ? { ...s, people: s.people.map((p) => (p.id === personId ? { ...p, isCloseFriend: !isCloseFriend } : p)) } : s));
    await (isCloseFriend ? removeCloseFriend(personId) : addCloseFriend(personId)).catch(() => {});
  };

  const toggleHidden = async (personId: string) => {
    setSettings((s) => (s ? { ...s, people: s.people.map((p) => (p.id === personId ? { ...p, isHidden: !p.isHidden } : p)) } : s));
    await toggleHiddenFromUser(personId).catch(() => {});
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,19,16,0.4)' }}>
        <View style={{ backgroundColor: colors.ivory, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '84%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Story settings</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.inkSoft} />
            </Pressable>
          </View>

          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : !settings ? (
            <LoadingState />
          ) : (
            <ScrollView>
              <View style={{ padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 4 }}>
                <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.inkSoft, marginBottom: 4 }}>ALLOW REPLIES &amp; REACTIONS</Text>
                {REPLY_OPTIONS.map((o) => {
                  const active = settings.allowReplies === o.value;
                  return (
                    <Pressable key={o.value} onPress={() => setReplies(o.value)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 }}>
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          borderWidth: 1.5,
                          borderColor: active ? colors.gold : colors.line,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 2,
                        }}
                      >
                        {active ? <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.gold }} /> : null}
                      </View>
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{o.label}</Text>
                        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>{o.hint}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line, gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>Close Friends only</Text>
                  <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>Only your Close Friends will see new stories</Text>
                </View>
                <Switch value={settings.closeFriendsOnly} onValueChange={toggleCloseFriendsOnly} trackColor={{ true: colors.gold, false: colors.line }} />
              </View>

              <View style={{ padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.inkSoft, marginBottom: 8 }}>MANAGE CLOSE FRIENDS</Text>
                {settings.people.length === 0 ? (
                  <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>No followers yet to add.</Text>
                ) : (
                  settings.people.map((p) => (
                    <Pressable key={p.id} onPress={() => toggleCloseFriend(p.id, p.isCloseFriend)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                      <Image source={{ uri: resolveMediaUrl(p.avatar) ?? undefined }} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ivoryDeep }} />
                      <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.ink, flex: 1 }}>{p.name}</Text>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: radius.sm,
                          borderWidth: 1.5,
                          borderColor: p.isCloseFriend ? colors.gold : colors.line,
                          backgroundColor: p.isCloseFriend ? colors.gold : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {p.isCloseFriend ? <Check size={12} color={colors.ivory} /> : null}
                      </View>
                    </Pressable>
                  ))
                )}
              </View>

              <View style={{ padding: spacing.lg }}>
                <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.inkSoft, marginBottom: 8 }}>HIDE STORY FROM</Text>
                {settings.people.length === 0 ? (
                  <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>No followers yet to hide from.</Text>
                ) : (
                  settings.people.map((p) => (
                    <Pressable key={p.id} onPress={() => toggleHidden(p.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                      <Image source={{ uri: resolveMediaUrl(p.avatar) ?? undefined }} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ivoryDeep }} />
                      <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.ink, flex: 1 }}>{p.name}</Text>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: radius.sm,
                          borderWidth: 1.5,
                          borderColor: p.isHidden ? colors.gold : colors.line,
                          backgroundColor: p.isHidden ? colors.gold : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {p.isHidden ? <Check size={12} color={colors.ivory} /> : null}
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
