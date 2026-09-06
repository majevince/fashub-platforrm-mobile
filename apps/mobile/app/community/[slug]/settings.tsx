import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Search, X, Check, Globe, Lock } from 'lucide-react-native';
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

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} MIN${mins === 1 ? '' : 'S'} AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} HOUR${hours === 1 ? '' : 'S'} AGO`;
  const days = Math.floor(hours / 24);
  return `${days} DAY${days === 1 ? '' : 'S'} AGO`;
}

/**
 * Full parity port of app/communities/[slug]/settings/page.tsx's 4 tabs,
 * restyled per community-settings-redesign.html: underline tabs (violet
 * active-state only, matching the app's established convention), an
 * inline removable tag box instead of a raw comma-separated field, a
 * two-state visibility segment with a dynamic hint line, a type-the-name
 * delete confirmation, and a sticky bottom save bar. Colors/fonts are
 * pulled from the app's real theme tokens (useTheme()), not the mockup's
 * own literal hex variables — its "violet" token IS this app's
 * colors.gold (the shared active-state accent), matching the same
 * mapping used for the Events/Communities palette-consistency fix.
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
  const { colors, radius, fontFamilies } = useTheme();
  const router = useRouter();

  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? '');
  const [category, setCategory] = useState<string | null>(community.category);
  const [tags, setTags] = useState<string[]>(community.tags);
  const [rules, setRules] = useState(community.rules ?? '');
  const [visibility, setVisibility] = useState<CommunityVisibility>(community.visibility);
  const [savingGeneral, setSavingGeneral] = useState(false);

  const [joinMode, setJoinMode] = useState(community.joinMode);
  const [postPermission, setPostPermission] = useState(community.postPermission);
  const [allowInvites, setAllowInvites] = useState(community.allowMemberInvites);
  const [savingGovernance, setSavingGovernance] = useState(false);

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

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
        tags: tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
        visibility,
      });
      setCommunity(updated);
      setLastSavedAt(new Date());
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
      setLastSavedAt(new Date());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Only the owner can change governance settings.');
    } finally {
      setSavingGovernance(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCommunity(slug, userId);
      router.replace('/communities');
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : "Couldn't delete this community.");
    }
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

  const canConfirmDelete = deleteConfirmText.trim() === community.name;
  const showSaveBar = tab === 'general' || (tab === 'governance' && isOwner);
  const saving = tab === 'general' ? savingGeneral : savingGovernance;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={17} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: fontFamilies.serif, fontSize: 20, fontWeight: '500', color: colors.ink }} numberOfLines={1}>Community Settings</Text>
            <Text style={{ fontSize: 13, color: colors.inkSoft, marginTop: 1 }} numberOfLines={1}>{community.name}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 22 }} style={{ marginTop: 22 }}>
          {(['general', 'governance', 'members', 'requests'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: tab === t ? colors.gold : 'transparent' }}
            >
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: tab === t ? colors.ink : colors.inkSoft, textTransform: 'capitalize' }}>{t}</Text>
              {t === 'requests' && pending && pending.length > 0 ? (
                <View style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 5, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.ivory }}>{pending.length}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ height: 1, backgroundColor: colors.line, marginTop: -1 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 24, gap: 26, paddingBottom: showSaveBar ? 130 : 40 }} keyboardShouldPersistTaps="handled">
        {error ? <Banner tone="error">{error}</Banner> : null}

        {tab === 'general' ? (
          <>
            <Field label="Name" value={name} onChangeText={(t) => setName(t.slice(0, NAME_MAX))} colors={colors} radius={radius} />
            <Field
              label="Description"
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
              multiline
              placeholder="Tell people what this community is about"
              colors={colors}
              radius={radius}
            />
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pressable onPress={() => setCategory(null)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: category === null ? colors.gold : colors.paper, borderWidth: 1, borderColor: category === null ? colors.gold : colors.line }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '500', color: category === null ? colors.ivory : colors.ink }}>None</Text>
                </Pressable>
                {COMMUNITY_CATEGORIES.map((c) => (
                  <Pressable key={c} onPress={() => setCategory(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: category === c ? colors.gold : colors.paper, borderWidth: 1, borderColor: category === c ? colors.gold : colors.line }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '500', color: category === c ? colors.ivory : colors.ink }}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Tags</Text>
              <TagBox tags={tags} onAdd={(t) => setTags((prev) => (prev.includes(t) ? prev : [...prev, t]))} onRemove={(t) => setTags((prev) => prev.filter((x) => x !== t))} />
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>Tags help this community surface in search and recommendations.</Text>
            </View>

            <Field
              label="Rules"
              value={rules}
              onChangeText={(t) => setRules(t.slice(0, RULES_MAX))}
              multiline
              placeholder="Set expectations for members"
              colors={colors}
              radius={radius}
            />

            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Visibility</Text>
              <VisibilitySegment value={visibility} onChange={setVisibility} />
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>
                {visibility === 'private' ? 'Only members can see posts and the member list.' : 'Anyone can find and join this community.'}
              </Text>
            </View>

            {isOwner ? (
              <View style={{ marginTop: 12, borderWidth: 1, borderColor: colors.oxblood + '59', backgroundColor: colors.oxblood + '0A', borderRadius: radius.lg, padding: 16, gap: 4 }}>
                <Text style={{ fontFamily: fontFamilies.serif, fontSize: 16, fontWeight: '500', color: colors.oxblood }}>Danger Zone</Text>
                <Text style={{ fontSize: 12.5, color: colors.inkSoft, lineHeight: 18, marginBottom: 10 }}>
                  Deleting this community removes it and its posts for every member. This can't be undone.
                </Text>
                {!deleteConfirmOpen ? (
                  <Pressable onPress={() => setDeleteConfirmOpen(true)} style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.oxblood, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.oxblood }}>Delete community</Text>
                  </Pressable>
                ) : (
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 11.5, color: colors.inkSoft }}>Type the community name to confirm</Text>
                    <TextInput
                      value={deleteConfirmText}
                      onChangeText={setDeleteConfirmText}
                      placeholder={community.name}
                      placeholderTextColor={VF.inkFaint}
                      style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fontFamilies.mono, fontSize: 12.5, color: colors.ink, backgroundColor: colors.paper }}
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => { setDeleteConfirmOpen(false); setDeleteConfirmText(''); }}
                        style={{ flex: 1, backgroundColor: colors.ivoryDeep, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleDelete}
                        disabled={!canConfirmDelete}
                        style={{ flex: 1, backgroundColor: colors.oxblood, opacity: canConfirmDelete ? 1 : 0.45, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Delete forever</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
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
            {!isOwner ? <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.inkSoft }}>Only the owner can change governance settings.</Text> : null}

            {isOwner ? (
              <View style={{ marginTop: 12, gap: 10 }}>
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

      {showSaveBar ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
          <LinearGradient colors={[colors.ivory + '00', colors.ivory, colors.ivory]} locations={[0, 0.45, 1]} style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 18 }}>
            <Pressable
              onPress={tab === 'general' ? saveGeneral : saveGovernance}
              disabled={saving || (tab === 'general' && !name.trim())}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.ink, borderRadius: radius.lg, paddingVertical: 15, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.gold} />
              ) : (
                <>
                  <Check size={15} color={colors.gold} strokeWidth={2.4} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.gold, letterSpacing: 0.2 }}>Save changes</Text>
                </>
              )}
            </Pressable>
            {lastSavedAt ? (
              <Text style={{ textAlign: 'center', fontFamily: fontFamilies.mono, fontSize: 10, color: colors.inkSoft, marginTop: 8 }}>
                LAST SAVED {timeAgo(lastSavedAt)}
              </Text>
            ) : null}
          </LinearGradient>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  placeholder,
  colors,
  radius,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  placeholder?: string;
  colors: any;
  radius: any;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 3 : undefined}
        placeholder={placeholder}
        placeholderTextColor={VF.inkFaint}
        style={{
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 12,
          fontSize: 14.5,
          color: colors.ink,
          backgroundColor: colors.paper,
          minHeight: multiline ? 88 : undefined,
          textAlignVertical: multiline ? 'top' : undefined,
          lineHeight: multiline ? 20 : undefined,
        }}
      />
    </View>
  );
}

/** Removable tag chips + an inline "press enter to add" input, matching the redesign's tag box exactly. */
function TagBox({ tags, onAdd, onRemove }: { tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void }) {
  const { colors, radius, fontFamilies } = useTheme();
  const [input, setInput] = useState('');

  const commit = () => {
    const v = input.trim().toLowerCase();
    if (v) onAdd(v);
    setInput('');
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, minHeight: 46 }}>
      {tags.map((tag) => (
        <View key={tag} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ivoryDeep, borderRadius: radius.sm, paddingVertical: 4, paddingHorizontal: 8 }}>
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.ink }}>{tag}</Text>
          <Pressable onPress={() => onRemove(tag)} hitSlop={6}>
            <X size={11} color={colors.inkSoft} />
          </Pressable>
        </View>
      ))}
      <TextInput
        value={input}
        onChangeText={setInput}
        onSubmitEditing={commit}
        onBlur={commit}
        placeholder={tags.length === 0 ? 'Add a tag, press enter' : ''}
        placeholderTextColor={VF.inkFaint}
        returnKeyType="done"
        style={{ flexGrow: 1, minWidth: 80, fontSize: 13.5, color: colors.ink }}
      />
    </View>
  );
}

/** Two-state segmented control matching the redesign's Public/Private toggle, with icons carried over from the app's own visibility badges. */
function VisibilitySegment({ value, onChange }: { value: CommunityVisibility; onChange: (v: CommunityVisibility) => void }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.ivoryDeep, borderRadius: radius.lg, padding: 4 }}>
      {(['public', 'private'] as CommunityVisibility[]).map((v) => {
        const active = value === v;
        const Icon = v === 'public' ? Globe : Lock;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 11,
              borderRadius: radius.md,
              backgroundColor: active ? colors.gold : 'transparent',
            }}
          >
            <Icon size={14} color={active ? colors.ivory : colors.inkSoft} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: active ? colors.ivory : colors.inkSoft, textTransform: 'capitalize' }}>{v}</Text>
          </Pressable>
        );
      })}
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
