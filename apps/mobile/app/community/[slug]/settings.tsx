import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { violetColors as VF } from '@fashub/design-tokens';
import { useTheme } from '../../../theme/ThemeProvider';
import { useAuth } from '../../../context/AuthContext';
import {
  getCommunity,
  updateCommunity,
  deleteCommunity,
  getCommunityMembers,
  updateCommunityMember,
  searchUsers,
  resolveMediaUrl,
  ApiError,
} from '@fashub/api-client';
import type { UserSearchResult } from '@fashub/api-client';
import type { Community, CommunityMember, CommunityVisibility, CommunityMemberRoleType } from '@fashub/types';
import { COMMUNITY_CATEGORIES } from '@fashub/types';
import { LoadingState } from '../../../components/LoadingState';
import { Banner } from '../../../components/Banner';

type Tab = 'general' | 'governance' | 'members' | 'requests';

const NAME_MAX = 80;
const DESC_MAX = 500;
const RULES_MAX = 2000;

/**
 * Full parity port of app/communities/[slug]/settings/page.tsx's 4 tabs.
 * Client-side access gate matches web's own (redirect if role isn't
 * owner/admin/moderator) — the real enforcement lives server-side in each
 * PATCH/DELETE handler regardless (e.g. governance fields 403 for anyone
 * but owner even if this screen let an admin edit the form).
 */
export default function CommunitySettingsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [community, setCommunity] = useState<Community | null>(null);
  const [tab, setTab] = useState<Tab>('general');
  const [error, setError] = useState('');

  const load = () => {
    if (!slug || !user) return;
    getCommunity(slug, user.id)
      .then((c) => {
        const role = c.myMembership?.role;
        if (!c.myMembership || !['owner', 'admin', 'moderator'].includes(role ?? '')) {
          router.replace(`/community/${slug}`);
          return;
        }
        setCommunity(c);
      })
      .catch(() => router.replace(`/community/${slug}`));
  };

  useEffect(load, [slug, user?.id]);

  if (!user || !slug) return null;

  if (!community) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8FC' }} edges={['top']}>
        <LoadingState label="Loading settings…" />
      </SafeAreaView>
    );
  }

  const isOwner = community.myMembership?.role === 'owner';

  return (
    <SettingsBody
      slug={slug}
      userId={user.id}
      community={community}
      setCommunity={setCommunity}
      isOwner={isOwner}
      tab={tab}
      setTab={setTab}
      error={error}
      setError={setError}
    />
  );
}

function SettingsBody({
  slug,
  userId,
  community,
  setCommunity,
  isOwner,
  tab,
  setTab,
  error,
  setError,
}: {
  slug: string;
  userId: string;
  community: Community;
  setCommunity: React.Dispatch<React.SetStateAction<Community | null>>;
  isOwner: boolean;
  tab: Tab;
  setTab: (t: Tab) => void;
  error: string;
  setError: (e: string) => void;
}) {
  const { colors, radius } = useTheme();
  const router = useRouter();

  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? '');
  const [category, setCategory] = useState<string | null>(community.category);
  const [tags, setTags] = useState(community.tags.join(', '));
  const [rules, setRules] = useState(community.rules ?? '');
  const [visibility, setVisibility] = useState<CommunityVisibility>(community.visibility);
  const [savingGeneral, setSavingGeneral] = useState(false);

  const [joinMode, setJoinMode] = useState(community.joinMode);
  const [postPermission, setPostPermission] = useState(community.postPermission);
  const [allowInvites, setAllowInvites] = useState(community.allowMemberInvites);
  const [savingGovernance, setSavingGovernance] = useState(false);

  const [members, setMembers] = useState<CommunityMember[] | null>(null);
  const [pending, setPending] = useState<CommunityMember[] | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const myRole = community.myMembership?.role;
  const isAdmin = myRole === 'admin';
  const isMod = myRole === 'moderator';

  /** Mirrors web's canManageMember() exactly (settings/page.tsx). */
  const canManageMember = (m: CommunityMember) => {
    if (m.userId === userId) return false;
    if (m.role === 'owner') return false;
    if (isOwner) return true;
    if (isAdmin && m.role !== 'admin') return true;
    if (isMod && m.role === 'member') return true;
    return false;
  };

  /** Mirrors web's getRoleOptions() exactly — owner can set admin/moderator/member, a plain admin can only set moderator/member. */
  const roleOptions: CommunityMemberRoleType[] = isOwner ? ['admin', 'moderator', 'member'] : isAdmin ? ['moderator', 'member'] : [];

  useEffect(() => {
    if (tab === 'members' && members === null) getCommunityMembers(slug, { status: 'approved', limit: 100 }).then((r) => setMembers(r.members)).catch(() => setMembers([]));
    if (tab === 'requests' && pending === null) getCommunityMembers(slug, { status: 'pending', limit: 100 }).then((r) => setPending(r.members)).catch(() => setPending([]));
  }, [tab]);

  const saveGeneral = async () => {
    if (!name.trim()) return;
    setSavingGeneral(true);
    setError('');
    try {
      const updated = await updateCommunity(slug, {
        userId,
        name: name.trim(),
        description: description.trim() || null,
        rules: rules.trim() || null,
        category: category ?? null,
        tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
        visibility,
      });
      setCommunity(updated);
      Alert.alert('Saved', 'Community settings updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSavingGeneral(false);
    }
  };

  const saveGovernance = async () => {
    setSavingGovernance(true);
    setError('');
    try {
      const updated = await updateCommunity(slug, { userId, joinMode, postPermission, allowMemberInvites: allowInvites });
      setCommunity(updated);
      Alert.alert('Saved', 'Governance settings updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Only the owner can change governance settings.");
    } finally {
      setSavingGovernance(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Community', 'This cannot be undone. Delete this community permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCommunity(slug, userId);
            router.replace('/communities');
          } catch (err) {
            Alert.alert('Error', err instanceof ApiError ? err.message : "Couldn't delete this community.");
          }
        },
      },
    ]);
  };

  const runUserSearch = async (q: string) => {
    setUserQuery(q);
    if (q.trim().length < 2) { setUserResults([]); return; }
    setSearching(true);
    try {
      const results = await searchUsers(q, 10);
      const existingIds = new Set((members ?? []).map((m) => m.userId));
      setUserResults(results.filter((u) => u.id !== userId && !existingIds.has(u.id)));
    } finally {
      setSearching(false);
    }
  };

  const handleAddUser = async (targetUserId: string) => {
    try {
      await updateCommunityMember(slug, { userId, targetUserId, action: 'add_user' });
      setUserResults((prev) => prev.filter((u) => u.id !== targetUserId));
      setMembers(null);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : "Couldn't add this member.");
    }
  };

  const handleChangeRole = async (targetUserId: string, newRole: CommunityMemberRoleType) => {
    try {
      await updateCommunityMember(slug, { userId, targetUserId, action: 'change_role', newRole });
      setMembers((prev) => prev?.map((m) => (m.userId === targetUserId ? { ...m, role: newRole } : m)) ?? null);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : "Couldn't change this member's role.");
    }
  };

  const handleRemove = (targetUserId: string) => {
    Alert.alert('Remove member', 'Remove this member from the community?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateCommunityMember(slug, { userId, targetUserId, action: 'remove' });
            setMembers((prev) => prev?.filter((m) => m.userId !== targetUserId) ?? null);
          } catch (err) {
            Alert.alert('Error', err instanceof ApiError ? err.message : "Couldn't remove this member.");
          }
        },
      },
    ]);
  };

  const handleRequestAction = async (targetUserId: string, action: 'approve' | 'reject') => {
    try {
      await updateCommunityMember(slug, { userId, targetUserId, action });
      setPending((prev) => prev?.filter((m) => m.userId !== targetUserId) ?? null);
      setMembers(null);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : "Couldn't update this request.");
    }
  };

  const handleTransferOwnership = (targetUserId: string, targetName: string) => {
    Alert.alert('Transfer Ownership', `Make ${targetName} the new owner? You will become an admin.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Transfer',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateCommunityMember(slug, { userId, targetUserId, action: 'transfer_ownership' });
            router.replace(`/community/${slug}`);
          } catch (err) {
            Alert.alert('Error', err instanceof ApiError ? err.message : "Couldn't transfer ownership.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}><ChevronLeft size={22} color={colors.ink} /></Pressable>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink, flexShrink: 1 }} numberOfLines={1}>{community.name} Settings</Text>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 6, paddingBottom: 10 }}>
        {(['general', 'governance', 'members', 'requests'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingHorizontal: 6,
              paddingVertical: 9,
              borderRadius: 999,
              backgroundColor: tab === t ? colors.gold : colors.paper,
              borderWidth: 1,
              borderColor: tab === t ? colors.gold : colors.line,
            }}
          >
            <Text
              style={{ fontSize: 11.5, fontWeight: '700', color: tab === t ? colors.ivory : colors.ink, textTransform: 'capitalize' }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {t}
            </Text>
            {t === 'requests' && pending && pending.length > 0 ? (
              <View style={{ backgroundColor: tab === t ? 'rgba(255,255,255,0.3)' : colors.gold, borderRadius: 999, paddingHorizontal: 5, minWidth: 15, alignItems: 'center' }}>
                <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.ivory }}>{pending.length}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {error ? <Banner tone="error">{error}</Banner> : null}

        {tab === 'general' ? (
          <>
            <Field label="Name" value={name} onChangeText={(t) => setName(t.slice(0, NAME_MAX))} colors={colors} radius={radius} />
            <Field label="Description" value={description} onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))} multiline colors={colors} radius={radius} />
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <Pressable onPress={() => setCategory(null)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: category === null ? colors.gold : colors.paper, borderWidth: 1, borderColor: colors.line }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: category === null ? colors.ivory : colors.ink }}>None</Text>
                </Pressable>
                {COMMUNITY_CATEGORIES.map((c) => (
                  <Pressable key={c} onPress={() => setCategory(c)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: category === c ? colors.gold : colors.paper, borderWidth: 1, borderColor: colors.line }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: category === c ? colors.ivory : colors.ink }}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Field label="Tags" value={tags} onChangeText={setTags} colors={colors} radius={radius} />
            <Field label="Rules" value={rules} onChangeText={(t) => setRules(t.slice(0, RULES_MAX))} multiline colors={colors} radius={radius} />
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>Visibility</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['public', 'private'] as CommunityVisibility[]).map((v) => (
                  <Pressable key={v} onPress={() => setVisibility(v)} style={{ flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md, backgroundColor: visibility === v ? colors.gold : colors.paper, borderWidth: 1, borderColor: colors.line }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: visibility === v ? colors.ivory : colors.ink, textTransform: 'capitalize' }}>{v}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable onPress={saveGeneral} disabled={savingGeneral} style={{ backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}>
              {savingGeneral ? <ActivityIndicator size="small" color={colors.ivory} /> : <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ivory }}>Save Changes</Text>}
            </Pressable>

            {isOwner ? (
              <View style={{ marginTop: 20, borderWidth: 1, borderColor: colors.oxblood, borderRadius: radius.lg, padding: 14, gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.oxblood }}>Danger Zone</Text>
                <Pressable onPress={handleDelete} style={{ backgroundColor: colors.oxblood, borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Delete Community</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : tab === 'governance' ? (
          <>
            <PickerRow
              label="Join Mode"
              options={[
                { v: 'open', l: 'Open Join', d: 'Anyone can join instantly (public groups only)' },
                { v: 'approval', l: 'Requires Approval', d: 'Join requests must be approved by owner/admin/moderator' },
              ]}
              value={joinMode}
              onChange={setJoinMode}
              disabled={!isOwner}
              colors={colors}
            />
            <PickerRow
              label="Who Can Post"
              options={[
                { v: 'all_members', l: 'All Members', d: 'Any approved member can post' },
                { v: 'admins_mods', l: 'Admins & Moderators', d: 'Only admins and moderators can post' },
                { v: 'admins_only', l: 'Admins Only', d: 'Only the owner and admins can post' },
              ]}
              value={postPermission}
              onChange={setPostPermission}
              disabled={!isOwner}
              colors={colors}
            />

            <View style={{ backgroundColor: colors.ivoryDeep, borderRadius: radius.md, padding: 12, gap: 8 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4 }}>Role Permissions</Text>
              {[
                { label: 'Owner', color: '#B45309', desc: 'Full control, governance settings, transfer ownership, delete community' },
                { label: 'Admin', color: colors.gold, desc: 'Manage members, approve/reject requests, edit community info, promote to mod' },
                { label: 'Mod', color: '#2563EB', desc: 'Approve/reject requests, remove members, moderate content' },
                { label: 'Member', color: colors.inkSoft, desc: 'Post, comment, like — invite others if allowed' },
              ].map((r) => (
                <View key={r.label} style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ backgroundColor: r.color + '22', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: r.color }}>{r.label}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 11, fontWeight: '400', color: colors.inkSoft }}>{r.desc}</Text>
                </View>
              ))}
            </View>
            <Pressable onPress={() => isOwner && setAllowInvites((v) => !v)} disabled={!isOwner} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Allow Member Invites</Text>
              <View style={{ width: 42, height: 24, borderRadius: 12, backgroundColor: allowInvites ? colors.gold : colors.line, padding: 2, justifyContent: 'center' }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.paper, alignSelf: allowInvites ? 'flex-end' : 'flex-start' }} />
              </View>
            </Pressable>
            {isOwner ? (
              <Pressable onPress={saveGovernance} disabled={savingGovernance} style={{ backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 13, alignItems: 'center' }}>
                {savingGovernance ? <ActivityIndicator size="small" color={colors.ivory} /> : <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ivory }}>Save Changes</Text>}
              </Pressable>
            ) : (
              <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.inkSoft }}>Only the owner can change governance settings.</Text>
            )}

            {isOwner ? (
              <View style={{ marginTop: 20, gap: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Transfer Ownership</Text>
                {(members ?? []).filter((m) => m.userId !== userId).map((m) => (
                  <Pressable key={m.id} onPress={() => handleTransferOwnership(m.userId, m.user?.displayName ?? 'this member')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{m.user?.displayName ?? 'Member'}</Text>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.oxblood }}>Transfer</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : tab === 'members' ? (
          <>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, backgroundColor: colors.paper }}>
                <Search size={14} color={VF.inkFaint} />
                <TextInput value={userQuery} onChangeText={runUserSearch} placeholder="Add members by name…" placeholderTextColor={VF.inkFaint} style={{ flex: 1, fontSize: 13, color: colors.ink, paddingVertical: 10 }} />
                {searching ? <ActivityIndicator size="small" color={colors.gold} /> : null}
              </View>
              {userResults.map((u) => (
                <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 10 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.gold, overflow: 'hidden' }}>
                    {u.avatar ? <Image source={{ uri: resolveMediaUrl(u.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                  </View>
                  <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{u.displayName}</Text>
                  <Pressable onPress={() => handleAddUser(u.id)} style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ivory }}>Add</Text>
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={{ gap: 8, marginTop: 8 }}>
              {members === null ? (
                <LoadingState />
              ) : (
                members.map((m) => (
                  <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gold, overflow: 'hidden' }}>
                      {m.user?.avatar ? <Image source={{ uri: resolveMediaUrl(m.user.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                    </View>
                    <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{m.user?.displayName ?? 'Member'}</Text>
                    {canManageMember(m) ? (
                      <>
                        {roleOptions.length > 0 ? (
                          <RoleMiniPicker role={m.role} options={roleOptions} onChange={(r) => handleChangeRole(m.userId, r)} colors={colors} />
                        ) : (
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkSoft, textTransform: 'capitalize' }}>{m.role}</Text>
                        )}
                        <Pressable onPress={() => handleRemove(m.userId)} hitSlop={6}>
                          <X size={16} color={colors.oxblood} />
                        </Pressable>
                      </>
                    ) : (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkSoft, textTransform: 'capitalize' }}>{m.role}</Text>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          <View style={{ gap: 10 }}>
            {pending === null ? (
              <LoadingState />
            ) : pending.length === 0 ? (
              <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkSoft }}>No pending requests.</Text>
            ) : (
              pending.map((m) => (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gold, overflow: 'hidden' }}>
                    {m.user?.avatar ? <Image source={{ uri: resolveMediaUrl(m.user.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                  </View>
                  <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{m.user?.displayName ?? 'Member'}</Text>
                  <Pressable onPress={() => handleRequestAction(m.userId, 'approve')} style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ivory }}>Approve</Text>
                  </Pressable>
                  <Pressable onPress={() => handleRequestAction(m.userId, 'reject')} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkSoft }}>Reject</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, multiline, colors, radius }: { label: string; value: string; onChangeText: (t: string) => void; multiline?: boolean; colors: any; radius: any }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 3 : undefined}
        style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: multiline ? 12 : 11, fontSize: 13.5, color: colors.ink, backgroundColor: colors.paper, minHeight: multiline ? 80 : undefined, textAlignVertical: multiline ? 'top' : undefined }}
      />
    </View>
  );
}

function PickerRow({ label, options, value, onChange, disabled, colors }: { label: string; options: { v: string; l: string; d?: string }[]; value: string; onChange: (v: string) => void; disabled?: boolean; colors: any }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{label}</Text>
      <View style={{ gap: 6 }}>
        {options.map((o) => (
          <Pressable key={o.v} onPress={() => !disabled && onChange(o.v)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, opacity: disabled ? 0.6 : 1, paddingVertical: 2 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: value === o.v ? colors.gold : colors.line, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              {value === o.v ? <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.gold }} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.ink }}>{o.l}</Text>
              {o.d ? <Text style={{ fontSize: 11, fontWeight: '400', color: colors.inkSoft, marginTop: 1 }}>{o.d}</Text> : null}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Cycles only through the caller's permitted options (mirrors web's getRoleOptions()) — a plain admin never sees 'admin' as a target, only owner does. */
function RoleMiniPicker({ role, options, onChange, colors }: { role: CommunityMemberRoleType; options: CommunityMemberRoleType[]; onChange: (r: CommunityMemberRoleType) => void; colors: any }) {
  const next = () => {
    const idx = options.indexOf(role);
    onChange(options[(idx + 1) % options.length] ?? options[0]);
  };
  return (
    <Pressable onPress={next} style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.gold, textTransform: 'capitalize' }}>{role}</Text>
    </Pressable>
  );
}
