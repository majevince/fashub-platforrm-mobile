import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator, Share } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { X, Search, Check, Copy, Share2, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { searchUsers, shareProject, trackProjectEngagement, resolveMediaUrl, type UserSearchResult } from '@fashub/api-client';

export interface ShareableProject {
  id: string;
  title: string;
  category?: string | null;
  coverImage?: string | null;
}

/**
 * 1:1 port of web's components/portfolio/ProjectShareModal.tsx structure —
 * two tabs, "Share" and "Send to User". Web's "Share" tab is a grid of
 * hardcoded per-platform deep links (LinkedIn/Facebook/WhatsApp/Instagram)
 * plus copy-link; that grid is replaced here with the native OS share sheet
 * (Share.share), which already covers those same destinations through one
 * platform-native picker rather than reimplementing per-app URL schemes —
 * copy-link stays as its own explicit action underneath, matching web
 * exactly. "Send to User" is the actual missing feature this ticket adds:
 * search real users (searchUsers, already used by Communities' "Add
 * Members"), multi-select, optional note, POST /api/portfolio/projects/
 * [id]/share — the exact same endpoint and message-attachment shape web
 * uses, so the recipient's inbox renders it via the ProjectMessageCard that
 * already exists (components/messages/MessageCards.tsx) with zero changes
 * needed there.
 */
export function ProjectShareModal({
  visible,
  onClose,
  project,
  currentUserId,
  shareUrl,
}: {
  visible: boolean;
  onClose: () => void;
  project: ShareableProject;
  currentUserId: string;
  shareUrl: string;
}) {
  const { colors, spacing, radius } = useTheme();
  const [tab, setTab] = useState<'share' | 'send'>('share');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) return;
    setTab('share');
    setQuery('');
    setUsers([]);
    setSelectedIds([]);
    setNote('');
    setSuccess(false);
    setError('');
    setCopied(false);
  }, [visible]);

  useEffect(() => {
    if (!visible || tab !== 'send') return;
    setUsersLoading(true);
    const t = setTimeout(() => {
      searchUsers(query.trim(), 30)
        .then((res) => setUsers(res.filter((u) => u.id !== currentUserId)))
        .catch(() => setUsers([]))
        .finally(() => setUsersLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [visible, tab, query, currentUserId]);

  const toggleUser = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    try {
      const result = await Share.share({ message: shareUrl, url: shareUrl });
      if (result.action !== Share.dismissedAction) {
        trackProjectEngagement(project.id, 'project_share', currentUserId, { via: 'native_share' });
      }
    } catch {
      // Cancelling or the share sheet failing isn't an error worth surfacing.
    }
  };

  const handleSend = async () => {
    if (selectedIds.length === 0 || sending) return;
    setSending(true);
    setError('');
    try {
      await shareProject(project.id, { senderId: currentUserId, recipientIds: selectedIds, note: note.trim() || undefined });
      trackProjectEngagement(project.id, 'project_share', currentUserId, { via: 'internal_message' });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch {
      setError('Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const coverUri = resolveMediaUrl(project.coverImage);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,18,16,0.55)' }}>
        <View style={{ backgroundColor: colors.ivory, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '85%' }}>
          {success ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
                <CheckCircle2 size={28} color="#10B981" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>Sent!</Text>
              <Text style={{ fontSize: 12.5, color: colors.inkSoft, marginTop: 3 }}>Project shared successfully</Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.sm }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>Share Project</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <X size={20} color={colors.inkSoft} />
                </Pressable>
              </View>

              <View style={{ marginHorizontal: spacing.lg, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, flexDirection: 'row' }}>
                <View style={{ width: 64, height: 64, backgroundColor: colors.ivoryDeep }}>
                  {coverUri ? <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                </View>
                <View style={{ flex: 1, padding: 10, justifyContent: 'center', minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{project.title}</Text>
                  {project.category ? <Text style={{ fontSize: 10.5, color: colors.gold, marginTop: 2 }}>{project.category}</Text> : null}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 6, margin: spacing.lg, marginBottom: 0, backgroundColor: colors.ivoryDeep, borderRadius: 10, padding: 3 }}>
                {(['share', 'send'] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: tab === t ? colors.gold : 'transparent' }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: tab === t ? '#fff' : colors.inkSoft }}>
                      {t === 'share' ? 'Share' : 'Send to User'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {tab === 'share' ? (
                <View style={{ padding: spacing.lg, gap: 12 }}>
                  <Pressable
                    onPress={handleNativeShare}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 13 }}
                  >
                    <Share2 size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5 }}>Share via…</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCopyLink}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 12 }}
                  >
                    <Copy size={14} color={colors.inkSoft} />
                    <Text style={{ flex: 1, fontSize: 12, color: colors.inkSoft }} numberOfLines={1}>{shareUrl.replace(/^https?:\/\//, '')}</Text>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: copied ? '#10B981' : colors.gold }}>{copied ? 'Copied!' : 'Copy'}</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9 }}>
                      <Search size={15} color={colors.inkSoft} />
                      <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search people…"
                        placeholderTextColor={colors.inkSoft}
                        style={{ flex: 1, fontSize: 13, color: colors.ink, padding: 0 }}
                      />
                    </View>
                  </View>

                  {selectedIds.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.lg, paddingTop: 10 }}>
                      {selectedIds.map((id) => {
                        const u = users.find((x) => x.id === id);
                        if (!u) return null;
                        return (
                          <Pressable
                            key={id}
                            onPress={() => toggleUser(id)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F2EBFC', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.gold }}>{u.displayName}</Text>
                            <X size={11} color={colors.gold} />
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}

                  <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: 10, gap: 4 }} keyboardShouldPersistTaps="handled">
                    {usersLoading ? (
                      <ActivityIndicator color={colors.gold} style={{ marginTop: 16 }} />
                    ) : users.length === 0 ? (
                      <Text style={{ fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', paddingVertical: 16 }}>No users found</Text>
                    ) : (
                      users.map((u) => {
                        const active = selectedIds.includes(u.id);
                        const avatarUri = resolveMediaUrl(u.avatar);
                        return (
                          <Pressable
                            key={u.id}
                            onPress={() => toggleUser(u.id)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: radius.md, backgroundColor: active ? '#F2EBFC' : 'transparent' }}
                          >
                            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.gold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                              {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                              ) : (
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{u.displayName.slice(0, 2).toUpperCase()}</Text>
                              )}
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{u.displayName}</Text>
                              <Text style={{ fontSize: 10.5, color: colors.inkSoft, textTransform: 'capitalize' }}>{u.role}</Text>
                            </View>
                            <View
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 9,
                                borderWidth: 1.5,
                                borderColor: active ? colors.gold : colors.line,
                                backgroundColor: active ? colors.gold : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {active ? <Check size={11} color="#fff" /> : null}
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>

                  {selectedIds.length > 0 ? (
                    <View style={{ paddingHorizontal: spacing.lg }}>
                      <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder="Add a message (optional)…"
                        placeholderTextColor={colors.inkSoft}
                        multiline
                        style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 10, fontSize: 12.5, color: colors.ink, minHeight: 50, textAlignVertical: 'top' }}
                      />
                    </View>
                  ) : null}

                  {error ? <Text style={{ fontSize: 11.5, color: colors.oxblood, paddingHorizontal: spacing.lg, marginTop: 8 }}>{error}</Text> : null}

                  <View style={{ padding: spacing.lg, paddingTop: 10 }}>
                    <Pressable
                      onPress={handleSend}
                      disabled={selectedIds.length === 0 || sending}
                      style={{ backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', opacity: selectedIds.length === 0 || sending ? 0.5 : 1 }}
                    >
                      {sending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5 }}>{`Send${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}</Text>
                      )}
                    </Pressable>
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
