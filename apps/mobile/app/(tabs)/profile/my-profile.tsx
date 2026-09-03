import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera, AtSign, Link2, Hash, Globe, MapPin, Phone, Mail, Star } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useAuth } from '../../../context/AuthContext';
import { getUserProfile, updateUserProfile, getRatingStats, uploadFiles, resolveMediaUrl, ApiError } from '@fashub/api-client';
import type { ProfileDetail } from '@fashub/types';
import { toUploadableFile } from '../../../lib/uploadableFile';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { Banner } from '../../../components/Banner';
import { LoadingState } from '../../../components/LoadingState';
import { PhotoLightbox } from '../../../components/PhotoLightbox';

const isProfessional = (role?: string) => role === 'designer' || role === 'tailor';

/**
 * Web has 4 separate ~700-960 line role-forked profile pages, each with
 * many tabs (overview/wardrobe/outfits/appointments/reviews/stats for
 * individual; +portfolio/collections/projects/services for designer/
 * tailor). This unifies the real, functioning parts into one screen:
 * cover+avatar upload, bio/contact/location/social edit-in-place (matches
 * web's own pattern — no separate edit mode route), a real rating summary
 * for professionals, and a read-only portfolio image grid.
 *
 * Explicitly not ported, flagged rather than silently dropped: web's own
 * individual-profile wardrobe/outfits/appointments tabs are confirmed DEAD
 * UI on web itself (empty arrays, no-op buttons, a literal "placeholder
 * until API routes are implemented" comment in the source) — not worth
 * building a working mobile version of a feature web hasn't built either.
 * Portfolio/collections management (multi-image upload, reordering,
 * services/pricing forms) is view-only here — editing that nested data is
 * real scope beyond this pass, not a quick add.
 */
export default function MyProfileScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [detail, setDetail] = useState<ProfileDetail | null>(null);
  const [rating, setRating] = useState<{ averageRating: number; totalReviews: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);

  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [website, setWebsite] = useState('');

  const load = () => {
    if (!user) return;
    Promise.all([getUserProfile(user.id, user.id), isProfessional(user.role) ? getRatingStats(user.id) : Promise.resolve(null)]).then(([profile, ratingRes]) => {
      setDetail(profile);
      if (ratingRes) setRating(ratingRes);
      const profileFields = profile.individualProfile ?? profile.designerProfile ?? profile.tailorProfile;
      setBio(profileFields?.bio ?? '');
      setPhone(profileFields?.phone ?? '');
      setCity(profileFields?.city ?? '');
      setCountry(profileFields?.country ?? '');
      setInstagram(profileFields?.instagram ?? '');
      setFacebook(profileFields?.facebook ?? '');
      setTwitter(profileFields?.twitter ?? '');
      setWebsite(profileFields?.website ?? '');
      setLoading(false);
    });
  };

  useEffect(load, [user]);

  if (!user) return null;
  const pro = isProfessional(user.role);
  const professionalDetail = user.role === 'designer' ? detail?.designerProfile : user.role === 'tailor' ? detail?.tailorProfile : null;

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
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

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateUserProfile(user.id, {
        role: user.role,
        profileData: {
          bio,
          phone,
          location: { city, country },
          socialMedia: { instagram, facebook, twitter, website },
        },
      });
      setEditing(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const avatarUri = resolveMediaUrl(detail?.avatar ?? user.avatar);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
          <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>My Profile</Text>
        </View>
        <Pressable onPress={() => (editing ? handleSave() : setEditing(true))} disabled={saving}>
          <Text style={{ fontWeight: '600', fontSize: 13, color: colors.oxblood }}>{saving ? 'Saving…' : editing ? 'Save' : 'Edit'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
          {error ? <Banner tone="error">{error}</Banner> : null}

          <View style={{ alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => avatarUri && setAvatarViewerOpen(true)}
              disabled={!avatarUri}
              style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.oxblood, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
            >
              {uploadingAvatar ? (
                <ActivityIndicator color={colors.ivory} />
              ) : avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Text style={{ fontWeight: '700', fontSize: 26, color: colors.ivory }}>{user.displayName.slice(0, 2).toUpperCase()}</Text>
              )}
              <Pressable
                onPress={handlePickAvatar}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.ivory, alignItems: 'center', justifyContent: 'center' }}
              >
                <Camera size={12} color={colors.ivory} />
              </Pressable>
            </Pressable>
            <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>{user.displayName}</Text>
            <Text style={{ fontWeight: '500', fontSize: 10.5, color: colors.gold, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {user.role}
              {professionalDetail?.businessName ? ` · ${professionalDetail.businessName}` : ''}
            </Text>
            {pro && rating && rating.totalReviews > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Star size={13} color={colors.gold} fill={colors.gold} />
                <Text style={{ fontWeight: '600', fontSize: 12.5, color: colors.ink }}>
                  {rating.averageRating.toFixed(1)} ({rating.totalReviews})
                </Text>
              </View>
            ) : null}
          </View>

          {editing ? (
            <View style={{ gap: spacing.md }}>
              <TextField label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={4} style={{ minHeight: 80, textAlignVertical: 'top' }} placeholder="Tell people about yourself…" />
              <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+1 555 000 0000" />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <TextField label="City" value={city} onChangeText={setCity} />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField label="Country" value={country} onChangeText={setCountry} />
                </View>
              </View>
              <TextField label="Instagram" value={instagram} onChangeText={setInstagram} autoCapitalize="none" placeholder="@handle" />
              <TextField label="Facebook" value={facebook} onChangeText={setFacebook} autoCapitalize="none" />
              <TextField label="Twitter / X" value={twitter} onChangeText={setTwitter} autoCapitalize="none" placeholder="@handle" />
              <TextField label="Website" value={website} onChangeText={setWebsite} autoCapitalize="none" placeholder="https://" />
              <Button variant="primary" onPress={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </View>
          ) : (
            <View style={{ gap: spacing.lg }}>
              {bio ? (
                <View>
                  <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft, marginBottom: 6 }}>BIO</Text>
                  <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{bio}</Text>
                </View>
              ) : null}

              <View style={{ gap: 8 }}>
                <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft }}>CONTACT</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Mail size={14} color={colors.inkSoft} />
                  <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{user.email}</Text>
                </View>
                {phone ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Phone size={14} color={colors.inkSoft} />
                    <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{phone}</Text>
                  </View>
                ) : null}
                {city || country ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MapPin size={14} color={colors.inkSoft} />
                    <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{[city, country].filter(Boolean).join(', ')}</Text>
                  </View>
                ) : null}
              </View>

              {instagram || facebook || twitter || website ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft }}>SOCIAL</Text>
                  {instagram ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <AtSign size={14} color={colors.inkSoft} />
                      <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{instagram}</Text>
                    </View>
                  ) : null}
                  {facebook ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Link2 size={14} color={colors.inkSoft} />
                      <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{facebook}</Text>
                    </View>
                  ) : null}
                  {twitter ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Hash size={14} color={colors.inkSoft} />
                      <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{twitter}</Text>
                    </View>
                  ) : null}
                  {website ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Globe size={14} color={colors.inkSoft} />
                      <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{website}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {pro && professionalDetail?.specialties && professionalDetail.specialties.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft }}>SPECIALTIES</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {professionalDetail.specialties.map((s) => (
                      <View key={s} style={{ backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontWeight: '600', fontSize: 10, color: colors.oxblood }}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {pro && professionalDetail?.portfolioImages && professionalDetail.portfolioImages.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft }}>PORTFOLIO</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {professionalDetail.portfolioImages.map((img, i) => (
                      <Image key={i} source={{ uri: resolveMediaUrl(img) ?? undefined }} style={{ width: 100, height: 100, borderRadius: radius.md, backgroundColor: colors.ivoryDeep }} contentFit="cover" />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
      )}

      {avatarUri ? (
        <PhotoLightbox visible={avatarViewerOpen} uri={avatarUri} title={user.displayName} onClose={() => setAvatarViewerOpen(false)} />
      ) : null}
    </SafeAreaView>
  );
}
