import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Camera, Upload } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { usePage } from '../../../../hooks/usePage';
import { updatePage, uploadPageAvatar, uploadPageCoverPhoto, resolveMediaUrl, ApiError } from '@fashub/api-client';
import { hasPagePermission } from '@fashub/types';
import { toUploadableFile } from '../../../../lib/uploadableFile';
import { TextField } from '../../../../components/TextField';
import { Button } from '../../../../components/Button';
import { Banner } from '../../../../components/Banner';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/ErrorState';
import { CoverPositionPicker } from '../../../../components/settings/CoverPositionPicker';
import type { CoverPhotoPosition } from '@fashub/types';

/**
 * Settings > Edit page info (mobile) — net-new, the old Manage screen's
 * "Edit Page info" row was a no-op stub (`onPress: () => {}`). Mirrors
 * web's app/page/[handle]/manage/edit/page.tsx field-for-field (name,
 * bio, category, kind, city, state, country, foundedYear, website, tags)
 * against the same already-working, canEditPageInfo-gated backend routes:
 * POST /api/pages/[handle]/avatar, POST /api/pages/[handle]/cover-photo,
 * PATCH /api/pages/[handle].
 *
 * Upload plumbing is ported from the personal-profile Settings > Profile
 * screen (app/(tabs)/profile/settings/profile.tsx) rather than invented
 * fresh: same expo-image-picker options for the avatar (aspect 1:1,
 * allowsEditing, quality 0.85, no crop UI beyond the native picker's own —
 * matches web's avatar upload, which also has no crop step), and the same
 * pick-then-CoverPositionPicker flow for the cover photo (no aspect crop at
 * pick time; the focal point is chosen after, non-destructively, exactly
 * like web's ProfileCover component). Both call the Page-scoped upload
 * functions added to packages/api-client/src/pages.ts (uploadPageAvatar,
 * uploadPageCoverPhoto), which hit the dedicated Page endpoints directly —
 * NOT the generic /api/upload route uploadFiles() targets, since the Page
 * avatar/cover routes are single-purpose, persist to the Page row
 * themselves, and use different field names (`file` / `coverPhoto`).
 *
 * Uses KeyboardAvoidingView with an explicit per-platform `behavior`, same
 * as app/page/create.tsx's own fix for the Android keyboard-covering-input
 * bug (that screen's comment: "each screen sets its own behavior", not
 * something fixed app-wide).
 */
export default function EditPageInfoScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { colors, spacing, typeScale } = useTheme();
  const router = useRouter();

  const { page, viewer, loading, error, reload } = usePage(handle);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [kind, setKind] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [country, setCountry] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [website, setWebsite] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPosition, setCoverPosition] = useState<CoverPhotoPosition | null>(null);
  const [pendingCoverUri, setPendingCoverUri] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields are only seeded from `page` once — reload() (called after
  // an image upload) must not clobber in-progress, unsaved text edits.
  const initialized = useRef(false);
  useEffect(() => {
    if (!page || initialized.current) return;
    initialized.current = true;
    setName(page.name ?? '');
    setCategory(page.category ?? '');
    setKind(page.kind ?? '');
    setBio(page.bio ?? '');
    setCity(page.city ?? '');
    setStateField(page.state ?? '');
    setCountry(page.country ?? '');
    setFoundedYear(page.foundedYear != null ? String(page.foundedYear) : '');
    setWebsite(page.website ?? '');
    setTagsInput((page.tags ?? []).join(', '));
    setAvatarUrl(page.avatar ?? null);
    setCoverUrl(page.coverImage ?? null);
    setCoverPosition(page.coverImagePosition ?? null);
  }, [page]);

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

  if (!hasPagePermission(viewer.role, 'canEditPageInfo')) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message="You don't have permission to edit this Page." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError('Photo library access is needed to change the avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    setFormError('');
    try {
      const data = await uploadPageAvatar(handle, toUploadableFile(result.assets[0].uri));
      setAvatarUrl(`${data.url}?t=${Date.now()}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't update the avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError('Photo library access is needed to change the cover photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    setPendingCoverUri(result.assets[0].uri);
  };

  const handleConfirmCoverPosition = async (position: CoverPhotoPosition) => {
    if (!pendingCoverUri) return;
    setUploadingCover(true);
    setFormError('');
    try {
      const data = await uploadPageCoverPhoto(handle, toUploadableFile(pendingCoverUri), position);
      setCoverUrl(`${data.coverPhoto}?t=${Date.now()}`);
      setCoverPosition(data.coverPhotoPosition ?? position);
      setPendingCoverUri(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't update the cover photo.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError('Give your Page a name.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setFormError('');
    try {
      await updatePage(handle, {
        name: name.trim(),
        category,
        kind,
        bio,
        city,
        state: stateField,
        country,
        foundedYear: foundedYear.trim() ? Number(foundedYear.trim()) : null,
        website,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setSaved(true);
      reload();
      setTimeout(() => router.back(), 700);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const avatarUri = resolveMediaUrl(avatarUrl);
  const coverUri = resolveMediaUrl(coverUrl);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color="#fff" />
        </Pressable>
        <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: '#fff' }} numberOfLines={1}>
          Edit page info
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {formError ? <Banner tone="error">{formError}</Banner> : null}
          {saved ? <Banner tone="success">Saved</Banner> : null}

          {/* Cover photo */}
          <Pressable
            onPress={handlePickCover}
            disabled={uploadingCover}
            style={{ width: '100%', aspectRatio: 3, borderRadius: 14, backgroundColor: colors.ivoryDeep, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
          >
            {coverUri ? (
              <Image
                source={{ uri: coverUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                contentPosition={coverPosition ? { top: `${coverPosition.y}%`, left: `${coverPosition.x}%` } : undefined}
              />
            ) : (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Camera size={22} color={colors.inkSoft} />
                <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.inkSoft }}>Add a cover photo</Text>
              </View>
            )}
            <View style={{ position: 'absolute', bottom: 8, right: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.ivory, alignItems: 'center', justifyContent: 'center' }}>
              {uploadingCover ? <ActivityIndicator size="small" color={colors.ivory} /> : <Camera size={16} color={colors.ivory} />}
            </View>
          </Pressable>

          {/* Avatar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: spacing.md }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.gold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ivory }}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Text style={{ fontWeight: '700', fontSize: 20, color: colors.ivory }}>{(name || page.name).slice(0, 2).toUpperCase()}</Text>
              )}
            </View>
            <Pressable
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.line }}
            >
              {uploadingAvatar ? <ActivityIndicator size="small" color={colors.ink} /> : <Upload size={13} color={colors.ink} />}
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{uploadingAvatar ? 'Uploading…' : 'Change avatar'}</Text>
            </Pressable>
          </View>

          <View style={{ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: spacing.md, gap: spacing.md }}>
            <TextField label="Page name" value={name} onChangeText={setName} placeholder="Maison Anyah" />
            <TextField label="Bio" value={bio} onChangeText={setBio} placeholder="Bespoke tailoring for the modern silhouette…" multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TextField label="Category" value={category} onChangeText={setCategory} placeholder="Atelier" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Kind" value={kind} onChangeText={setKind} placeholder="Tailoring House" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TextField label="City" value={city} onChangeText={setCity} placeholder="Denton" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="State" value={stateField} onChangeText={setStateField} placeholder="TX" />
              </View>
            </View>

            <TextField label="Country" value={country} onChangeText={setCountry} placeholder="United States" />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TextField label="Founded year" value={foundedYear} onChangeText={setFoundedYear} placeholder="2019" keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Website" value={website} onChangeText={setWebsite} placeholder="yoursite.com" autoCapitalize="none" />
              </View>
            </View>

            <TextField label="Tags (comma separated)" value={tagsInput} onChangeText={setTagsInput} placeholder="Bespoke, Menswear, Alterations" />
          </View>

          <Button variant="primary" onPress={handleSave} disabled={saving} style={{ backgroundColor: colors.gold }}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      {pendingCoverUri ? (
        <CoverPositionPicker
          visible={!!pendingCoverUri}
          uri={pendingCoverUri}
          initialPosition={coverPosition}
          uploading={uploadingCover}
          onConfirm={handleConfirmCoverPosition}
          onCancel={() => setPendingCoverUri(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}
