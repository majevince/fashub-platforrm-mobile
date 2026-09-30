import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronLeft, Search, Pencil, Trash2, X, Megaphone, Plug } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../context/AuthContext';
import { usePage } from '../../../../hooks/usePage';
import { getPageAdmins, searchPageFollowers, addPageAdmin, updatePageAdmin, removePageAdmin, resolveMediaUrl } from '@fashub/api-client';
import { hasPagePermission, PAGE_ROLE_LABEL, ASSIGNABLE_PAGE_ROLES, type PageAdminRole, type PageAdminUser, type PageFollowerSearchResult } from '@fashub/types';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/ErrorState';

type SubTab = 'admins' | 'paid-media' | 'integrations';

/**
 * Settings > Manage admins — Settings-tab ticket, mobile side. Same
 * functional scope as web's app/page/[handle]/manage/admins/page.tsx,
 * built against the already-live admin CRUD endpoints via the
 * @fashub/api-client wrappers. Visual language copied from the Settings
 * hub (manage.tsx): dark ink header bar, paper cards with line borders,
 * gold accents.
 */
export default function ManagePageAdminsScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { colors, spacing, typeScale } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { page, viewer, loading, error, reload } = usePage(handle);

  const [tab, setTab] = useState<SubTab>('admins');

  const [admins, setAdmins] = useState<PageAdminUser[] | null>(null);
  const [adminsError, setAdminsError] = useState('');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PageFollowerSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [pickedRoles, setPickedRoles] = useState<Record<string, PageAdminRole | undefined>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [roleModal, setRoleModal] = useState<{ kind: 'edit'; adminId: string } | { kind: 'add'; candidateId: string } | null>(null);

  const canManage = !!viewer && hasPagePermission(viewer.role, 'canManageAdmins');

  const loadAdmins = () => {
    if (!handle) return;
    getPageAdmins(handle)
      .then((res) => setAdmins(res.admins))
      .catch((err) => setAdminsError(err instanceof Error ? err.message : 'Failed to load admins'));
  };

  useEffect(() => {
    if (canManage) loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, handle]);

  // Live-search this Page's followers as the admin types — 300ms debounce.
  // Fires once with an empty query too, so the panel isn't blank before typing.
  useEffect(() => {
    if (!canManage || tab !== 'admins' || !handle) return;
    setSearching(true);
    const t = setTimeout(() => {
      searchPageFollowers(handle, query)
        .then((res) => setResults(res.followers))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, handle, tab, canManage]);

  const handleSaveRole = (role: PageAdminRole) => {
    if (!roleModal || !handle) return;
    if (roleModal.kind === 'edit') {
      const adminId = roleModal.adminId;
      setRoleModal(null);
      setSavingId(adminId);
      updatePageAdmin(handle, adminId, { role })
        .then((res) => setAdmins((prev) => (prev ? prev.map((a) => (a.id === adminId ? res.admin : a)) : prev)))
        .catch((err) => Alert.alert('Couldn’t update role', err instanceof Error ? err.message : 'Please try again.'))
        .finally(() => setSavingId(null));
    } else {
      setPickedRoles((prev) => ({ ...prev, [roleModal.candidateId]: role }));
      setRoleModal(null);
    }
  };

  const handleAdd = (candidate: PageFollowerSearchResult) => {
    const role = pickedRoles[candidate.id];
    if (!role || !handle) return;
    setAddingId(candidate.id);
    addPageAdmin(handle, candidate.id, role)
      .then(() => {
        setResults((prev) => (prev ? prev.filter((f) => f.id !== candidate.id) : prev));
        loadAdmins();
      })
      .catch((err) => Alert.alert('Couldn’t add admin', err instanceof Error ? err.message : 'Please try again.'))
      .finally(() => setAddingId(null));
  };

  const handleRemove = (admin: PageAdminUser) => {
    if (!handle) return;
    Alert.alert(
      `Remove ${admin.user.displayName}?`,
      'They will no longer be an admin of this Page.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setRemovingId(admin.id);
            removePageAdmin(handle, admin.id)
              .then(() => setAdmins((prev) => (prev ? prev.filter((a) => a.id !== admin.id) : prev)))
              .catch((err) => Alert.alert('Couldn’t remove admin', err instanceof Error ? err.message : 'Please try again.'))
              .finally(() => setRemovingId(null));
          },
        },
      ]
    );
  };

  if (loading && !page) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <LoadingState label="Loading…" />
      </SafeAreaView>
    );
  }

  if (error || !page || !viewer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message={error ?? 'Page not found'} onRetry={reload} />
      </SafeAreaView>
    );
  }

  if (!canManage) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message="You don't have permission to manage admins for this Page." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  const adminCount = admins ? admins.length : 0;
  const tabs: { key: SubTab; label: string }[] = [
    { key: 'admins', label: `Page admins (${adminCount})` },
    { key: 'paid-media', label: 'Paid media admins (0)' },
    { key: 'integrations', label: 'Integrations (0)' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color="#fff" />
        </Pressable>
        <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: '#fff' }} numberOfLines={1}>Manage admins</Text>
      </View>

      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: spacing.lg }}>
        {tabs.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ paddingVertical: 12, marginRight: 18, borderBottomWidth: 2, borderBottomColor: tab === t.key ? colors.gold : 'transparent' }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: tab === t.key ? colors.gold : colors.inkSoft }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        {tab === 'admins' ? (
          <>
            {adminsError ? <Text style={{ fontSize: 12.5, color: colors.oxblood }}>{adminsError}</Text> : null}

            <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
              {admins === null ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.oxblood} />
                </View>
              ) : admins.length === 0 ? (
                <Text style={{ fontSize: 13, color: colors.inkSoft, textAlign: 'center', paddingVertical: 24 }}>No admins yet.</Text>
              ) : (
                admins.map((admin, i) => {
                  const isSuper = admin.role === 'super_admin';
                  const isYou = admin.user.id === user?.id;
                  const roleStyle = ROLE_STYLE(colors)[admin.role];
                  return (
                    <View
                      key={admin.id}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
                        borderBottomWidth: i === admins.length - 1 ? 0 : 1, borderBottomColor: colors.line,
                      }}
                    >
                      <AdminAvatar name={admin.user.displayName} src={admin.user.avatar ?? null} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>
                          {admin.user.displayName}{isYou ? ' · You' : ''}
                        </Text>
                        {admin.title ? (
                          <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 1 }} numberOfLines={1}>{admin.title}</Text>
                        ) : null}
                        <View style={{ marginTop: 4, alignSelf: 'flex-start', backgroundColor: roleStyle.bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: roleStyle.fg }}>{PAGE_ROLE_LABEL[admin.role]}</Text>
                        </View>
                      </View>
                      {isSuper ? null : (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <Pressable
                            onPress={() => setRoleModal({ kind: 'edit', adminId: admin.id })}
                            disabled={savingId === admin.id}
                            hitSlop={6}
                            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center' }}
                          >
                            {savingId === admin.id ? <ActivityIndicator size="small" color={colors.gold} /> : <Pencil size={13} color={colors.gold} />}
                          </Pressable>
                          <Pressable
                            onPress={() => handleRemove(admin)}
                            disabled={removingId === admin.id}
                            hitSlop={6}
                            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center' }}
                          >
                            {removingId === admin.id ? <ActivityIndicator size="small" color={colors.oxblood} /> : <Trash2 size={13} color={colors.oxblood} />}
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
              <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginBottom: 10 }}>Add admin</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.ivory, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 }}>
                <Search size={15} color={colors.inkSoft} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search this Page's followers by name"
                  placeholderTextColor={colors.inkSoft}
                  style={{ flex: 1, fontSize: 13, color: colors.ink, padding: 0 }}
                />
              </View>

              <View style={{ marginTop: 12, gap: 8 }}>
                {searching && (results === null || results.length === 0) ? (
                  <Text style={{ fontSize: 12.5, color: colors.inkSoft }}>Searching…</Text>
                ) : results && results.length === 0 ? (
                  <Text style={{ fontSize: 12.5, color: colors.inkSoft }}>
                    {query ? 'No matching followers.' : "No followers available to add yet — only people who already follow this Page can be made admins."}
                  </Text>
                ) : (
                  (results ?? []).map((f) => {
                    const picked = pickedRoles[f.id];
                    return (
                      <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10 }}>
                        <AdminAvatar name={f.displayName} src={f.avatar} size={30} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{f.displayName}</Text>
                          {f.headline ? <Text style={{ fontSize: 10.5, color: colors.inkSoft }} numberOfLines={1}>{f.headline}</Text> : null}
                        </View>
                        <Pressable
                          onPress={() => setRoleModal({ kind: 'add', candidateId: f.id })}
                          style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: picked ? colors.ink : colors.inkSoft }}>{picked ? PAGE_ROLE_LABEL[picked] : 'Choose role'}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleAdd(f)}
                          disabled={!picked || addingId === f.id}
                          style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, opacity: !picked || addingId === f.id ? 0.4 : 1 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{addingId === f.id ? 'Adding…' : 'Add'}</Text>
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          </>
        ) : null}

        {tab === 'paid-media' ? (
          <EmptyPanel
            Icon={Megaphone}
            title="No paid media admins"
            message="Paid media (ad-account) access isn't a feature of FasHub Pages yet. There's nothing to manage here."
          />
        ) : null}

        {tab === 'integrations' ? (
          <EmptyPanel
            Icon={Plug}
            title="No integrations connected"
            message="Third-party integrations aren't supported yet. There's nothing to manage here."
          />
        ) : null}
      </ScrollView>

      <Modal visible={!!roleModal} animationType="slide" transparent onRequestClose={() => setRoleModal(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,19,16,0.4)' }}>
          <View style={{ backgroundColor: colors.ivory, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
              <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Choose a role</Text>
              <Pressable onPress={() => setRoleModal(null)} hitSlop={8}>
                <X size={20} color={colors.inkSoft} />
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: spacing.lg, gap: 6 }}>
              {ASSIGNABLE_PAGE_ROLES.map((r) => (
                <Pressable key={r} onPress={() => handleSaveRole(r)} style={{ paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.ivoryDeep }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{PAGE_ROLE_LABEL[r]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function AdminAvatar({ name, src, size = 34 }: { name: string; src: string | null; size?: number }) {
  const { colors } = useTheme();
  const uri = src ? resolveMediaUrl(src) : null;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Text style={{ color: colors.goldSoft, fontWeight: '700', fontSize: size * 0.36 }}>{name.slice(0, 2).toUpperCase()}</Text>
      )}
    </View>
  );
}

function EmptyPanel({ Icon, title, message }: { Icon: typeof Megaphone; title: string; message: string }) {
  const { colors, spacing, typeScale } = useTheme();
  return (
    <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: spacing.xl, alignItems: 'center', gap: 8 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={colors.inkSoft} />
      </View>
      <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontSize: 12, color: colors.inkSoft, textAlign: 'center', lineHeight: 17 }}>{message}</Text>
    </View>
  );
}

/**
 * Only the accent shades this app's palette actually has (gold family +
 * ivoryDeep/line, matching manage.tsx's own accent use) — ranked roughly
 * darkest-to-lightest by role seniority rather than inventing new colors.
 */
const ROLE_STYLE = (colors: ReturnType<typeof useTheme>['colors']): Record<PageAdminRole, { bg: string; fg: string }> => ({
  super_admin: { bg: colors.goldDim, fg: '#fff' },
  admin: { bg: colors.gold, fg: '#fff' },
  editor: { bg: colors.goldSoft, fg: '#fff' },
  moderator: { bg: colors.ivoryDeep, fg: colors.gold },
  analyst: { bg: colors.line, fg: colors.inkSoft },
});
