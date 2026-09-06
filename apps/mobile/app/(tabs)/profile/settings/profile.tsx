import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../context/AuthContext';
import { getUserProfile, updateUserProfile, uploadFiles, resolveMediaUrl, ApiError } from '@fashub/api-client';
import type { ProfileDetail, CoverPhotoPosition } from '@fashub/types';
import { toUploadableFile } from '../../../../lib/uploadableFile';
import { TextField } from '../../../../components/TextField';
import { SettingsScreenShell } from '../../../../components/settings/SettingsScreenShell';
import { CoverPositionPicker } from '../../../../components/settings/CoverPositionPicker';
import { PhotoLightbox } from '../../../../components/PhotoLightbox';

const isProfessional = (role?: string) => role === 'designer' || role === 'tailor';

/**
 * Matches web's Settings "Profile" tab exactly (app/settings/{role}/page.tsx):
 * cover photo, avatar, first/last name (web splits displayName into two
 * fields), business name (designer/tailor only — lives on the Profile tab
 * on web, not Business Info), email (read-only everywhere — web's own PATCH
 * handler never persists it even when sent), phone, bio (500-char cap with
 * counter for designer/tailor, uncapped for individual, matching web's own
 * inconsistency exactly).
 *
 * Cover/avatar are now tap-to-view-full-size (no full-image viewer existed
 * anywhere on mobile before this — built PhotoLightbox for it), with upload
 * moved to an explicit corner camera badge so both actions coexist without
 * one hijacking the other's taps. Cover uploads go through a position
 * picker first (CoverPositionPicker) instead of uploading immediately —
 * the chosen focal point is stored via the same coverPhotoPosition field
 * web now uses, so it renders identically everywhere the cover appears.
 */
export default function ProfileSettingsScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();

  const [detail, setDetail] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const [coverViewerOpen, setCoverViewerOpen] = useState(false);
  const [pendingCoverUri, setPendingCoverUri] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  const pro = isProfessional(user?.role);
  const bioLimit = pro ? 500 : undefined;

  const load = () => {
    if (!user) return;
    getUserProfile(user.id, user.id).then((profile) => {
      setDetail(profile);
      const [first, ...rest] = (profile.displayName ?? '').split(' ');
      setFirstName(first ?? '');
      setLastName(rest.join(' '));
      const fields = profile.individualProfile ?? profile.designerProfile ?? profile.tailorProfile;
      setBusinessName((profile.designerProfile ?? profile.tailorProfile)?.businessName ?? '');
      setPhone(fields?.phone ?? '');
      setBio(fields?.bio ?? '');
      setLoading(false);
    });
  };

  useEffect(load, [user]);

  if (!user) return null;

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const uploaded = await uploadFiles([toUploadableFile(result.assets[0].uri)], 'avatars');
      await updateUserProfile(user.id, { role: user.role, avatar: uploaded.urls[0] });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update your photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    setPendingCoverUri(result.assets[0].uri);
  };

  const handleConfirmCoverPosition = async (position: CoverPhotoPosition) => {
    if (!pendingCoverUri) return;
    setUploadingCover(true);
    setError('');
    try {
      const uploaded = await uploadFiles([toUploadableFile(pendingCoverUri)], 'covers');
      await updateUserProfile(user.id, { role: user.role, coverPhoto: uploaded.urls[0], coverPhotoPosition: position });
      setPendingCoverUri(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update your cover photo.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateUserProfile(user.id, {
        displayName: [firstName, lastName].filter(Boolean).join(' ').trim() || user.displayName,
        role: user.role,
        profileData: {
          phone,
          bio,
          ...(pro ? { businessName } : {}),
        },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const avatarUri = resolveMediaUrl(detail?.avatar ?? user.avatar);
  const coverUri = resolveMediaUrl(detail?.coverPhoto);
  const coverPosition = detail?.coverPhotoPosition;

  return (
    <SettingsScreenShell title="Profile" loading={loading} error={error} onSave={handleSave} saving={saving}>
      <Pressable
        onPress={() => coverUri && setCoverViewerOpen(true)}
        disabled={!coverUri}
        style={{ width: '100%', aspectRatio: 3, borderRadius: radius.lg, backgroundColor: colors.ivoryDeep, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
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

        <Pressable
          onPress={handlePickCover}
          disabled={uploadingCover}
          style={{ position: 'absolute', bottom: 8, right: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.ivory, alignItems: 'center', justifyContent: 'center' }}
        >
          {uploadingCover ? <ActivityIndicator size="small" color={colors.ivory} /> : <Camera size={16} color={colors.ivory} />}
        </Pressable>
      </Pressable>

      <View style={{ alignItems: 'center', marginTop: -40 }}>
        <Pressable
          onPress={() => avatarUri && setAvatarViewerOpen(true)}
          disabled={!avatarUri}
          style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.gold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.ivory }}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Text style={{ fontWeight: '700', fontSize: 26, color: colors.ivory }}>{user.displayName.slice(0, 2).toUpperCase()}</Text>
          )}
          <Pressable
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
            style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.ivory, alignItems: 'center', justifyContent: 'center' }}
          >
            {uploadingAvatar ? <ActivityIndicator size="small" color={colors.ivory} /> : <Camera size={12} color={colors.ivory} />}
          </Pressable>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <TextField label="First Name" value={firstName} onChangeText={setFirstName} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="Last Name" value={lastName} onChangeText={setLastName} />
        </View>
      </View>

      {pro ? (
        <TextField label="Business Name (Optional)" value={businessName} onChangeText={setBusinessName} />
      ) : null}

      <TextField label="Email" value={user.email} editable={false} hint="Email address cannot be changed" />
      <TextField label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+1 555 000 0000" />

      <View>
        <TextField
          label="Bio / About You"
          value={bio}
          onChangeText={(t) => setBio(bioLimit ? t.slice(0, bioLimit) : t)}
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, textAlignVertical: 'top' }}
          placeholder="Tell people about yourself…"
        />
        {bioLimit ? (
          <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontSize: 11, color: colors.inkSoft, textAlign: 'right', marginTop: 4 }}>
            {bio.length} / {bioLimit} characters
          </Text>
        ) : null}
      </View>

      {avatarUri ? (
        <PhotoLightbox visible={avatarViewerOpen} uri={avatarUri} title={user.displayName} onClose={() => setAvatarViewerOpen(false)} />
      ) : null}
      {coverUri ? (
        <PhotoLightbox visible={coverViewerOpen} uri={coverUri} title={user.displayName} onClose={() => setCoverViewerOpen(false)} />
      ) : null}
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
    </SettingsScreenShell>
  );
}
