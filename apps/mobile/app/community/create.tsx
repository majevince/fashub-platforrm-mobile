import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera, ChevronDown, X } from 'lucide-react-native';
import { violetColors as VF } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { uploadFiles, createCommunity, ApiError } from '@fashub/api-client';
import type { CommunityVisibility } from '@fashub/types';
import { COMMUNITY_CATEGORIES } from '@fashub/types';
import { toUploadableFile } from '../../lib/uploadableFile';
import { Banner } from '../../components/Banner';

const NAME_MAX = 80;
const DESC_MAX = 500;
const RULES_MAX = 2000;

/**
 * Matches web's app/communities/create/page.tsx field-for-field: same 7
 * fields (cover photo, name, description, category, tags, rules,
 * visibility), same limits (80/500/2000 chars), same submit payload shape
 * to POST /api/communities. Web's form never sends `avatar` even though
 * the backend/model support it separately from coverPhoto — matched here
 * exactly rather than adding an avatar upload field web itself doesn't
 * have (there is no avatar-editing UI anywhere in web's Communities
 * feature, confirmed in Step 0 — communities only ever get an avatar via
 * direct API/seed data).
 */
export default function CreateCommunityScreen() {
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [coverAsset, setCoverAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [tags, setTags] = useState('');
  const [rules, setRules] = useState('');
  const [visibility, setVisibility] = useState<CommunityVisibility>('public');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) setCoverAsset(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!user || !name.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      let coverPhoto: string | null = null;
      if (coverAsset) {
        const uploaded = await uploadFiles([toUploadableFile(coverAsset.uri)], 'communities');
        coverPhoto = uploaded.urls[0] ?? null;
      }
      const community = await createCommunity({
        userId: user.id,
        name: name.trim(),
        description: description.trim() || null,
        rules: rules.trim() || null,
        category: category ?? null,
        tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
        visibility,
        coverPhoto,
      });
      router.replace(`/community/${community.slug}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create this community.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>Create Community</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {error ? <Banner tone="error">{error}</Banner> : null}

        <Pressable onPress={pickCover} style={{ height: 140, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.paper }}>
          {coverAsset ? (
            <Image source={{ uri: coverAsset.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Camera size={22} color={VF.inkFaint} />
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkSoft }}>Add a cover photo</Text>
            </View>
          )}
        </Pressable>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>Community Name *</Text>
          <TextInput
            value={name}
            onChangeText={(t) => setName(t.slice(0, NAME_MAX))}
            placeholder="e.g. Lagos Fashion Designers"
            placeholderTextColor={VF.inkFaint}
            style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: colors.ink, backgroundColor: colors.paper }}
          />
          <Text style={{ fontSize: 10.5, fontWeight: '500', color: VF.inkFaint, textAlign: 'right' }}>{name.length}/{NAME_MAX}</Text>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>Description</Text>
          <TextInput
            value={description}
            onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
            placeholder="What's this community about?"
            placeholderTextColor={VF.inkFaint}
            multiline
            numberOfLines={3}
            style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, fontSize: 13.5, color: colors.ink, minHeight: 80, textAlignVertical: 'top', backgroundColor: colors.paper }}
          />
          <Text style={{ fontSize: 10.5, fontWeight: '500', color: VF.inkFaint, textAlign: 'right' }}>{description.length}/{DESC_MAX}</Text>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>Category</Text>
          <Pressable onPress={() => setCategoryPickerOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.paper }}>
            <Text style={{ fontSize: 14, color: category ? colors.ink : VF.inkFaint }}>{category ?? 'Select a category'}</Text>
            <ChevronDown size={16} color={VF.inkFaint} />
          </Pressable>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>Tags</Text>
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="ankara, streetwear, bespoke (comma-separated)"
            placeholderTextColor={VF.inkFaint}
            style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13.5, color: colors.ink, backgroundColor: colors.paper }}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>Rules / Guidelines</Text>
          <TextInput
            value={rules}
            onChangeText={(t) => setRules(t.slice(0, RULES_MAX))}
            placeholder="Set expectations for members…"
            placeholderTextColor={VF.inkFaint}
            multiline
            numberOfLines={3}
            style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, fontSize: 13.5, color: colors.ink, minHeight: 80, textAlignVertical: 'top', backgroundColor: colors.paper }}
          />
          <Text style={{ fontSize: 10.5, fontWeight: '500', color: VF.inkFaint, textAlign: 'right' }}>{rules.length}/{RULES_MAX}</Text>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>Visibility</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['public', 'private'] as CommunityVisibility[]).map((v) => (
              <Pressable
                key={v}
                onPress={() => setVisibility(v)}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: visibility === v ? colors.gold : colors.paper, borderWidth: 1, borderColor: visibility === v ? colors.gold : colors.line }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: visibility === v ? colors.ivory : colors.ink, textTransform: 'capitalize' }}>{v}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable onPress={handleSubmit} disabled={!name.trim() || submitting} style={{ backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 14, alignItems: 'center', opacity: !name.trim() || submitting ? 0.5 : 1 }}>
          {submitting ? <ActivityIndicator size="small" color={colors.ivory} /> : <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ivory }}>Create Community</Text>}
        </Pressable>
      </ScrollView>

      <Modal visible={categoryPickerOpen} animationType="slide" transparent onRequestClose={() => setCategoryPickerOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(27,21,35,0.5)' }}>
          <View style={{ backgroundColor: colors.ivory, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>Category</Text>
              <Pressable onPress={() => setCategoryPickerOpen(false)} hitSlop={8}><X size={20} color={colors.inkSoft} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 8 }}>
              <Pressable onPress={() => { setCategory(null); setCategoryPickerOpen(false); }} style={{ padding: 14 }}>
                <Text style={{ fontSize: 14, fontWeight: category === null ? '700' : '400', color: category === null ? colors.gold : colors.ink }}>None</Text>
              </Pressable>
              {COMMUNITY_CATEGORIES.map((c) => (
                <Pressable key={c} onPress={() => { setCategory(c); setCategoryPickerOpen(false); }} style={{ padding: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: category === c ? '700' : '400', color: category === c ? colors.gold : colors.ink }}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
