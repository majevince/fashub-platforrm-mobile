import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronLeft, Star, Pin, Lock, Eye, Images as ImagesIcon, MessageCircle, FileText, CalendarClock, Bookmark, Share2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import {
  getPortfolioProject,
  trackProjectEngagement,
  toggleSavedItem,
  getSavedItemsStatus,
  resolveMediaUrl,
  API_BASE_URL,
  ApiError,
} from '@fashub/api-client';
import type { PortfolioProjectDetail } from '@fashub/types';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { VerifiedBadge, isVerified } from '../../components/VerifiedBadge';
import { InquiryComposer, type InquiryType } from '../../components/portfolio/InquiryComposer';
import { PhotoGalleryViewer } from '../../components/PhotoGalleryViewer';
import { ProjectShareModal } from '../../components/portfolio/ProjectShareModal';

const SCREEN_W = Dimensions.get('window').width;

/**
 * Full Project Detail screen — the (tabs)/project.tsx list cards were
 * previously plain, non-tappable Views; this closes that gap. Ported from
 * web's components/portfolio/ProjectDetailModal.tsx, which is itself a
 * modal (not a routed page) opened with the already-fetched list item, with
 * only a fire-and-forget view-count increment — no separate "full detail"
 * fetch exists on web to mirror. Here we fetch from the real single-project
 * endpoint (GET /api/portfolio/projects/[projectId]) instead, since a mobile
 * deep link needs to be self-sufficient without a list item already in
 * memory. That endpoint had no owner join before this ticket — added one
 * (see its route.ts comment) so this screen's owner-contact panel works
 * from the same single fetch.
 *
 * Web's actual rendered field set (not the full underlying Prisma model) is
 * matched exactly: title, summary, category, tags, images, visibility,
 * isFeatured, isPinned, viewCount, createdAt. There is no pricing/budget,
 * timeline/status, or location field anywhere in the data model — web
 * doesn't show them either, so nothing is missing here relative to web.
 *
 * Funnel-event instrumentation (marketplace-intent ranking pipeline):
 * project_view fires on mount, project_detail_zoom on gallery open,
 * project_inquiry_sent from InquiryComposer's success path, project_save
 * from the Bookmark button, and project_share from ProjectShareModal (both
 * its native-share and its "Send to User" path — the latter is the actual
 * missing web feature this closes: sharing a project directly to another
 * FaSHub user via POST /api/portfolio/projects/[id]/share, landing as a
 * real message in their inbox that the existing ProjectMessageCard renderer
 * already knows how to display). Save/share are reachable only from this
 * detail screen, not from the (tabs)/project.tsx grid cards — the grid is
 * tap-to-open only, per Vincent's call.
 */
export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<PortfolioProjectDetail | null>(null);
  const [error, setError] = useState('');
  const [imageIdx, setImageIdx] = useState(0);
  const [inquiryType, setInquiryType] = useState<InquiryType | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const load = () => {
    if (!id) return;
    setError('');
    getPortfolioProject(id)
      .then((res) => setProject(res.project))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load this project."));
  };

  useEffect(load, [id]);

  useEffect(() => {
    if (!id) return;
    trackProjectEngagement(id, 'project_view', user?.id);
  }, [id, user?.id]);

  useEffect(() => {
    if (!id || !user) return;
    getSavedItemsStatus(user.id, 'PROJECT', [id])
      .then((res) => setSaved(!!res.saved[id]))
      .catch(() => {});
  }, [id, user?.id]);

  const handleToggleSave = async () => {
    if (!user || !project || saveLoading) return;
    setSaveLoading(true);
    const next = !saved;
    setSaved(next);
    try {
      const res = await toggleSavedItem(user.id, project.id, 'PROJECT');
      setSaved(res.saved);
      if (res.saved) trackProjectEngagement(project.id, 'project_save', user.id);
    } catch {
      setSaved(!next);
    } finally {
      setSaveLoading(false);
    }
  };

  const [shareOpen, setShareOpen] = useState(false);

  if (!user || !id) return null;

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
        </View>
        <ErrorState message={error} onRetry={load} />
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <LoadingState label="Loading project…" />
      </SafeAreaView>
    );
  }

  const images = [project.coverImage, ...project.images].filter((v): v is string => !!v);
  const resolvedImages = images.map((uri) => resolveMediaUrl(uri)).filter((v): v is string => !!v);
  const isOwner = project.creator?.userId === user.id;
  const creator = project.creator;

  const onImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setImageIdx(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back button — overlaid on the carousel like web's top bar */}
        <View style={{ position: 'relative' }}>
          {images.length > 0 ? (
            <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#0c0c0c' }}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onImageScroll}
              >
                {images.map((uri, i) => (
                  <Pressable key={i} onPress={() => { setImageIdx(i); setGalleryOpen(true); trackProjectEngagement(project.id, 'project_detail_zoom', user?.id, { index: i }); }} style={{ width: SCREEN_W, height: '100%' }}>
                    <Image source={{ uri: resolveMediaUrl(uri) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                  </Pressable>
                ))}
              </ScrollView>

              {images.length > 1 ? (
                <>
                  <View style={{ position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(20,18,16,0.55)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#fff' }}>{imageIdx + 1} / {images.length}</Text>
                  </View>
                  <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                    {images.map((_, i) => (
                      <View
                        key={i}
                        style={{ width: i === imageIdx ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === imageIdx ? colors.gold : 'rgba(255,255,255,0.5)' }}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          ) : (
            <View style={{ width: '100%', aspectRatio: 1.3, backgroundColor: colors.ivoryDeep, alignItems: 'center', justifyContent: 'center' }}>
              <ImagesIcon size={40} color={colors.inkSoft} />
              <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 8 }}>No images uploaded</Text>
            </View>
          )}

          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{ position: 'absolute', top: 12, left: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(20,18,16,0.5)', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} color="#fff" />
          </Pressable>

          {/* Quick actions — same top-right placement as web's DiscoveryCard */}
          <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={handleToggleSave}
              disabled={saveLoading}
              hitSlop={8}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: saved ? colors.gold : 'rgba(20,18,16,0.5)',
                opacity: saveLoading ? 0.6 : 1,
              }}
            >
              <Bookmark size={17} color="#fff" fill={saved ? '#fff' : 'transparent'} />
            </Pressable>
            <Pressable
              onPress={() => setShareOpen(true)}
              hitSlop={8}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(20,18,16,0.5)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Share2 size={16} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {/* Badges */}
          {(project.isFeatured || project.isPinned || project.visibility === 'private') ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {project.isFeatured ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                  <Star size={11} color="#D97706" fill="#D97706" />
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#B45309' }}>Featured</Text>
                </View>
              ) : null}
              {project.isPinned ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F2EBFC', borderWidth: 1, borderColor: '#E4D6F7', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                  <Pin size={11} color={colors.gold} />
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.gold }}>Pinned</Text>
                </View>
              ) : null}
              {project.visibility === 'private' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                  <Lock size={11} color={colors.inkSoft} />
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.inkSoft }}>Private</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Title + category */}
          <View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink, lineHeight: 26 }}>{project.title}</Text>
            {project.category ? <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.gold, marginTop: 3 }}>{project.category}</Text> : null}
          </View>

          {/* Summary */}
          {project.summary ? <Text style={{ fontSize: 13.5, color: colors.inkSoft, lineHeight: 20 }}>{project.summary}</Text> : null}

          {/* Tags */}
          {project.tags.length > 0 ? (
            <View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Tags</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {project.tags.map((tag) => (
                  <View key={tag} style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: colors.inkSoft }}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Eye size={14} color={colors.inkSoft} />
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>{(project.viewCount ?? 0) + 1} views</Text>
            </View>
            {images.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <ImagesIcon size={14} color={colors.inkSoft} />
                <Text style={{ fontSize: 12, color: colors.inkSoft }}>{images.length} image{images.length !== 1 ? 's' : ''}</Text>
              </View>
            ) : null}
          </View>

          {/* Published date */}
          <Text style={{ fontSize: 11, color: colors.inkSoft }}>
            Published {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>

          {/* Owner contact panel */}
          {creator && !isOwner ? (
            <View style={{ paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.line, gap: spacing.md }}>
              <Pressable
                onPress={() => router.push(`/profile/${creator.userId}`)}
                style={({ pressed }) => [{ flexDirection: 'row', gap: 10 }, pressed ? { opacity: 0.75 } : null]}
              >
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.gold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  {creator.avatar ? (
                    <Image source={{ uri: resolveMediaUrl(creator.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{creator.displayName.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink, flexShrink: 1 }} numberOfLines={1}>{creator.displayName}</Text>
                    {isVerified({ subscriptionTier: creator.subscriptionTier, verified: creator.isVerified }) ? <VerifiedBadge size="sm" /> : null}
                    {creator.isPro ? (
                      <View style={{ backgroundColor: colors.gold, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1.5 }}>
                        <Text style={{ fontSize: 8, fontWeight: '700', color: '#fff' }}>PRO</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 1, textTransform: 'capitalize' }}>
                    {creator.role}{creator.city ? ` · ${creator.city}` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 }}>
                    {creator.rating != null && creator.rating > 0 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Star size={11} color="#F59E0B" fill="#F59E0B" />
                        <Text style={{ fontSize: 11, color: colors.inkSoft, fontWeight: '500' }}>{creator.rating.toFixed(1)}</Text>
                      </View>
                    ) : null}
                    {creator.projectCount != null && creator.projectCount > 0 ? (
                      <Text style={{ fontSize: 11, color: colors.inkSoft }}>{creator.projectCount} project{creator.projectCount !== 1 ? 's' : ''}</Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>

              {/* Primary CTA */}
              <Pressable
                onPress={() => setInquiryType('message')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 14 }}
              >
                <MessageCircle size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5 }}>Message {creator.role === 'designer' ? 'Designer' : 'Tailor'}</Text>
              </Pressable>

              {/* Secondary CTAs */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setInquiryType('quote')}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 11 }}
                >
                  <FileText size={14} color={colors.ink} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>Request Quote</Text>
                </Pressable>
                <Pressable
                  onPress={() => setInquiryType('consultation')}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 11 }}
                >
                  <CalendarClock size={14} color={colors.ink} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>Schedule Consult</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {creator && inquiryType ? (
        <InquiryComposer
          visible={!!inquiryType}
          defaultType={inquiryType}
          currentUserId={user.id}
          creator={{
            userId: creator.userId,
            displayName: creator.displayName,
            avatar: creator.avatar,
            isPro: creator.isPro,
            isVerified: isVerified({ subscriptionTier: creator.subscriptionTier, verified: creator.isVerified }),
            role: creator.role,
            city: creator.city,
            rating: creator.rating,
            projectCount: creator.projectCount,
          }}
          project={{ id: project.id, title: project.title, coverImage: project.coverImage, category: project.category }}
          onClose={() => setInquiryType(null)}
        />
      ) : null}

      <PhotoGalleryViewer
        visible={galleryOpen}
        images={resolvedImages}
        initialIndex={imageIdx}
        onClose={() => setGalleryOpen(false)}
      />

      <ProjectShareModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        project={{ id: project.id, title: project.title, category: project.category, coverImage: project.coverImage }}
        currentUserId={user.id}
        shareUrl={`${API_BASE_URL}${creator ? `/profile/${creator.userId}?tab=projects&projectId=${project.id}` : `/projects?projectId=${project.id}`}`}
      />
    </SafeAreaView>
  );
}
