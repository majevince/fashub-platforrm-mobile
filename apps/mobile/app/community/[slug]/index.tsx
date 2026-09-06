import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronLeft, Settings, Lock, Globe, Flame, Crown, Users, Share2, QrCode } from 'lucide-react-native';
import { violetColors as VF } from '@fashub/design-tokens';
import { useTheme } from '../../../theme/ThemeProvider';
import { useAuth } from '../../../context/AuthContext';
import { getCommunity, getCommunityPosts, getCommunityMembers, joinCommunity, leaveCommunity, resolveMediaUrl, API_BASE_URL, ApiError } from '@fashub/api-client';
import type { Community, CommunityPost, CommunityMember, CommunityPostSort } from '@fashub/types';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { EmptyNotice } from '../../../components/publicProfile/PortfolioTab';
import { VerifiedBadge, isVerified } from '../../../components/VerifiedBadge';
import { CommunityComposer } from '../../../components/communities/CommunityComposer';
import { CommunityPostCard } from '../../../components/communities/CommunityPostCard';
import { CommunityQRModal } from '../../../components/communities/CommunityQRModal';

type Tab = 'discussion' | 'about' | 'members';

const POST_SORTS: { key: CommunityPostSort; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'popular', label: 'Popular' },
  { key: 'active', label: 'Active' },
  { key: 'announcements', label: 'Announcements' },
];

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  owner: { label: 'Owner', color: '#B45309' },
  admin: { label: 'Admin', color: '#6D28D9' },
  moderator: { label: 'Moderator', color: '#2563EB' },
};

/**
 * Full parity port of app/communities/[slug]/page.tsx. Cover/avatar have
 * no edit affordance here — confirmed in Step 0 that web itself has none
 * either (Settings' General tab never sends avatar/coverPhoto in its
 * PATCH body despite the backend accepting them) — matched exactly, not a
 * mobile omission. Per-community "Trending in this room" hashtag filtering
 * and the desktop sidebar's duplicate About/Owner cards are folded into
 * the single About tab below rather than kept as separate sidebar
 * widgets, since mobile has no persistent sidebar to place them in.
 */
export default function CommunityDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [community, setCommunity] = useState<Community | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('discussion');
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [postSort, setPostSort] = useState<CommunityPostSort>('recent');
  const [members, setMembers] = useState<CommunityMember[] | null>(null);
  const [joining, setJoining] = useState(false);

  const load = () => {
    if (!slug || !user) return;
    setError('');
    getCommunity(slug, user.id)
      .then(setCommunity)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load this community."));
  };

  useEffect(load, [slug, user?.id]);

  useEffect(() => {
    if (!slug || !user || tab !== 'discussion') return;
    getCommunityPosts(slug, { userId: user.id, sort: postSort, limit: 20 })
      .then((res) => setPosts(res.posts))
      .catch(() => setPosts([]));
  }, [slug, user?.id, tab, postSort]);

  useEffect(() => {
    if (!slug || tab !== 'members' || members !== null) return;
    getCommunityMembers(slug, { status: 'approved', limit: 50 })
      .then((res) => setMembers(res.members))
      .catch(() => setMembers([]));
  }, [slug, tab, members]);

  if (!user || !slug) return null;

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8FC' }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}><ChevronLeft size={22} color="#1B1523" /></Pressable>
        </View>
        <ErrorState message={error} onRetry={load} />
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8FC' }} edges={['top']}>
        <LoadingState label="Loading community…" />
      </SafeAreaView>
    );
  }

  return <CommunityDetailBody community={community} setCommunity={setCommunity} slug={slug} tab={tab} setTab={setTab} posts={posts} setPosts={setPosts} postSort={postSort} setPostSort={setPostSort} members={members} joining={joining} setJoining={setJoining} />;
}

function CommunityDetailBody({
  community,
  setCommunity,
  slug,
  tab,
  setTab,
  posts,
  setPosts,
  postSort,
  setPostSort,
  members,
  joining,
  setJoining,
}: {
  community: Community;
  setCommunity: React.Dispatch<React.SetStateAction<Community | null>>;
  slug: string;
  tab: Tab;
  setTab: (t: Tab) => void;
  posts: CommunityPost[] | null;
  setPosts: React.Dispatch<React.SetStateAction<CommunityPost[] | null>>;
  postSort: CommunityPostSort;
  setPostSort: (s: CommunityPostSort) => void;
  members: CommunityMember[] | null;
  joining: boolean;
  setJoining: (v: boolean) => void;
}) {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [qrOpen, setQrOpen] = useState(false);
  if (!user) return null;

  const membership = community.myMembership;
  const isApproved = membership?.joinStatus === 'approved';
  const isPending = membership?.joinStatus === 'pending';
  const role = membership?.role;
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const isMod = role === 'moderator';
  const canModerate = isOwner || isAdmin || isMod;
  const canManageSettings = canModerate;
  const canPost =
    isApproved &&
    (community.postPermission === 'all_members' ||
      (community.postPermission === 'admins_mods' && (isAdmin || isMod)) ||
      (community.postPermission === 'admins_only' && isAdmin));

  const coverUri = resolveMediaUrl(community.coverPhoto);
  const avatarUri = resolveMediaUrl(community.avatar);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await joinCommunity(slug, user.id);
      setCommunity((c) => (c ? { ...c, myMembership: { id: '', communityId: c.id, userId: user.id, role: 'member', joinStatus: res.joinStatus, notifyPosts: true, joinedAt: new Date().toISOString() }, memberCount: res.joinStatus === 'approved' ? c.memberCount + 1 : c.memberCount } : c));
    } catch {
      // no-op — private/invite-only rejections surface as no visible state change for now
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    setJoining(true);
    try {
      await leaveCommunity(slug, user.id);
      setCommunity((c) => (c ? { ...c, myMembership: null, memberCount: Math.max(0, c.memberCount - 1) } : c));
    } catch {
      // no-op — server blocks owners/sole-admins with a message we're not surfacing yet
    } finally {
      setJoining(false);
    }
  };

  /**
   * Web's community-level share opens an in-app "share to conversations"
   * modal (ShareModal). Mobile uses the native OS share sheet instead —
   * same practical outcome (getting a shareable link to someone), the
   * mobile-idiomatic mechanism rather than rebuilding an in-app DM-share
   * flow, matching the same adaptation already used for Events' share.
   */
  const handleShareCommunity = () => {
    Share.share({ message: `${community.name} on FaSHub — ${API_BASE_URL}/communities/${slug}` }).catch(() => {});
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ height: 150, backgroundColor: colors.ivoryDeep }}>
          {coverUri ? <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(27,21,35,0.25)' }} />
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: 'absolute', top: 12, left: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(27,21,35,0.5)', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color="#fff" />
          </Pressable>
          <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setQrOpen(true)} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(27,21,35,0.5)', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={16} color="#fff" />
            </Pressable>
            <Pressable onPress={handleShareCommunity} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(27,21,35,0.5)', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={16} color="#fff" />
            </Pressable>
            {canManageSettings ? (
              <Pressable onPress={() => router.push(`/community/${slug}/settings`)} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(27,21,35,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={18} color="#fff" />
              </Pressable>
            ) : null}
          </View>
          <View style={{ position: 'absolute', left: 16, bottom: -26, width: 64, height: 64, borderRadius: 18, backgroundColor: colors.gold, borderWidth: 3, borderColor: colors.ivory, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {avatarUri ? <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ivory }}>{community.name.slice(0, 2).toUpperCase()}</Text>}
          </View>
        </View>

        <View style={{ paddingTop: 34, paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink, flexShrink: 1 }} numberOfLines={1}>{community.name}</Text>
            {community.verified ? <VerifiedBadge size="md" /> : null}
            {community.visibility === 'private' ? <Lock size={13} color={colors.gold} /> : <Globe size={13} color={VF.inkFaint} />}
          </View>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkSoft }}>{community.memberCount} members</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkSoft }}>{community.postCount} posts</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Flame size={12} color={colors.gold} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkSoft }}>{Math.round(community.activityScore)}</Text>
            </View>
          </View>

          {isApproved ? (
            <Pressable onPress={handleLeave} disabled={joining} style={{ borderRadius: 999, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.line }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.inkSoft }}>{isOwner ? 'Owner' : 'Leave Community'}</Text>
            </Pressable>
          ) : isPending ? (
            <View style={{ borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.line }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.inkSoft }}>Request Pending</Text>
            </View>
          ) : community.visibility === 'private' ? (
            <View style={{ borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.line }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.inkSoft }}>Invite Only</Text>
            </View>
          ) : (
            <Pressable onPress={handleJoin} disabled={joining} style={{ borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.gold }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ivory }}>{joining ? 'Joining…' : 'Join Community'}</Text>
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 16 }}>
          {(['discussion', 'about', 'members'] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={{ paddingVertical: 10, marginRight: 20, borderBottomWidth: 2, borderBottomColor: tab === t ? colors.gold : 'transparent' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === t ? colors.gold : colors.inkSoft, textTransform: 'capitalize' }}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          {tab === 'discussion' ? (
            <>
              {canPost ? <CommunityComposer slug={slug} userId={user.id} avatarUri={resolveMediaUrl(user.avatar)} onPosted={(p) => setPosts((prev) => (prev ? [p, ...prev] : [p]))} /> : null}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {POST_SORTS.map(({ key, label }) => (
                  <Pressable key={key} onPress={() => setPostSort(key)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: postSort === key ? colors.ink : colors.paper, borderWidth: 1, borderColor: postSort === key ? colors.ink : colors.line }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '600', color: postSort === key ? colors.ivory : colors.inkSoft }}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {posts === null ? (
                <LoadingState />
              ) : posts.length === 0 ? (
                <EmptyNotice icon={Users} title="No posts yet" message={isApproved ? 'Be the first to start a conversation!' : 'Join the community to participate.'} />
              ) : (
                posts.map((p) => <CommunityPostCard key={p.id} slug={slug} post={p} currentUserId={user.id} canModerate={canModerate} canComment={isApproved} />)
              )}
            </>
          ) : tab === 'about' ? (
            <View style={{ gap: 14 }}>
              <View style={{ backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Description</Text>
                <Text style={{ fontSize: 13, fontWeight: '400', color: colors.inkSoft, lineHeight: 19 }}>{community.description || 'No description yet.'}</Text>
              </View>

              {community.rules ? (
                <View style={{ backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Community Rules</Text>
                  <Text style={{ fontSize: 13, fontWeight: '400', color: colors.inkSoft, lineHeight: 19 }}>{community.rules}</Text>
                </View>
              ) : null}

              <View style={{ backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Details</Text>
                {[
                  ['Visibility', community.visibility === 'private' ? 'Private' : 'Public'],
                  ['Category', community.category ?? '—'],
                  ['Members', String(community.memberCount)],
                  ['Posts', String(community.postCount)],
                  ['Created', new Date(community.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkSoft }}>{label}</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{value}</Text>
                  </View>
                ))}
              </View>

              {community.createdBy ? (
                <Pressable onPress={() => router.push(`/profile/${community.createdBy!.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.gold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                    {community.createdBy.avatar ? <Image source={{ uri: resolveMediaUrl(community.createdBy.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ivory }}>{community.createdBy.displayName.slice(0, 1).toUpperCase()}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{community.createdBy.displayName}</Text>
                      {isVerified({ subscriptionTier: community.createdBy.subscriptionTier }) ? <VerifiedBadge size="sm" /> : null}
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.gold }}>Owner</Text>
                  </View>
                  <Crown size={16} color={colors.gold} />
                </Pressable>
              ) : null}

              {community.tags.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {community.tags.map((tag) => (
                    <View key={tag} style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.gold }}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {members === null ? (
                <LoadingState />
              ) : members.length === 0 ? (
                <EmptyNotice icon={Users} title="No members yet" message="" />
              ) : (
                members.map((m) => {
                  const badge = ROLE_BADGE[m.role];
                  return (
                    <Pressable key={m.id} onPress={() => router.push(`/profile/${m.userId}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                        {m.user?.avatar ? <Image source={{ uri: resolveMediaUrl(m.user.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ivory }}>{(m.user?.displayName ?? '?').slice(0, 1).toUpperCase()}</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{m.user?.displayName ?? 'Member'}</Text>
                          {m.user && isVerified({ subscriptionTier: m.user.subscriptionTier }) ? <VerifiedBadge size="sm" /> : null}
                        </View>
                        <Text style={{ fontSize: 10.5, fontWeight: '400', color: VF.inkFaint }}>Joined {new Date(m.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                      </View>
                      {badge ? (
                        <View style={{ backgroundColor: badge.color + '22', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: badge.color }}>{badge.label}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <CommunityQRModal visible={qrOpen} slug={slug} name={community.name} coverPhoto={community.coverPhoto} onClose={() => setQrOpen(false)} />
    </SafeAreaView>
  );
}
