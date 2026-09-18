import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { X, Plus, MapPin } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { createPortfolioProject, updatePortfolioProject, uploadFiles, ApiError, resolveMediaUrl } from '@fashub/api-client';
import type { PortfolioProject } from '@fashub/types';
import { toUploadableFile } from '../../lib/uploadableFile';
import { parseHashtags } from '../../lib/hashtags';
import { COUNTRIES } from '../../lib/countries';
import { HashtagTextInput } from './HashtagTextInput';
import { SelectRow, OptionPickerModal } from '../SelectRow';
import { ToggleRow } from '../settings/ToggleRow';

const CATEGORIES = [
  'Bridal & Wedding', 'Formal Wear', 'Casual Wear', 'Streetwear', 'Workwear',
  'Traditional & Cultural', 'Activewear', 'Evening Gown', 'Tailored Suit',
  "Children's Wear", 'Accessories', 'Experimental',
];
const CLIENT_TYPES = ['Individual', 'Business', 'Celebrity', 'Bridal Party', 'Event', 'Personal'];
const CUSTOM_OPTION = '+ Add custom…';
const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'featured', label: 'Featured' },
] as const;

/**
 * Native-adapted port of web's redesigned ProjectForm (composer header,
 * photo strip with tap-to-set-cover, live hashtag highlighting, pill
 * visibility, location fields) — full parity per the locked answer, not a
 * scoped-down version. Handles both create (no `project` prop) and edit
 * (`project` provided) the same way web's single form component does.
 */
export function ProjectComposerForm({
  role,
  project,
}: {
  role: 'designer' | 'tailor';
  project?: PortfolioProject | null;
}) {
  const { colors, fontFamilies } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const isEdit = !!project;

  const [title, setTitle] = useState(project?.title ?? '');
  const [summary, setSummary] = useState(project?.summary ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [category, setCategory] = useState(project?.category ?? '');
  const [customCategory, setCustomCategory] = useState('');
  const [clientType, setClientType] = useState(project?.clientType ?? '');
  const [customClientType, setCustomClientType] = useState('');
  const [city, setCity] = useState(project?.city ?? '');
  const [stateField, setStateField] = useState(project?.state ?? '');
  const [country, setCountry] = useState(project?.country ?? '');
  const [shipsWorldwide, setShipsWorldwide] = useState(project?.shipsWorldwide ?? false);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'featured'>(project?.visibility ?? 'public');
  const [isFeatured, setIsFeatured] = useState(project?.isFeatured ?? false);
  const [isPinned, setIsPinned] = useState(project?.isPinned ?? false);
  const [coverImage, setCoverImage] = useState(project?.coverImage ?? '');
  const [images, setImages] = useState<string[]>(project?.images ?? []);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState<'category' | 'clientType' | 'country' | null>(null);

  // Description-only, per the locked pre-flight answer — Short Summary stays plain.
  const detectedTags = useMemo(() => parseHashtags(description), [description]);

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsMultipleSelection: true });
    if (result.canceled || !result.assets.length) return;
    setUploading(true);
    try {
      const uploaded = await uploadFiles(result.assets.map((a) => toUploadableFile(a.uri)), 'portfolio');
      setImages((prev) => [...prev, ...uploaded.urls]);
      if (!coverImage && uploaded.urls.length) setCoverImage(uploaded.urls[0]);
    } catch {
      setError('Some photos failed to upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    const removed = images[idx];
    const next = images.filter((_, i) => i !== idx);
    setImages(next);
    if (removed === coverImage) setCoverImage(next[0] ?? '');
  };

  const handleSubmit = async () => {
    if (!user || !title.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const input = {
        title: title.trim(),
        summary: summary.trim() || null,
        description: description.trim() || null,
        category: (category === CUSTOM_OPTION ? customCategory : category) || null,
        tags: detectedTags,
        clientType: (clientType === CUSTOM_OPTION ? customClientType : clientType) || null,
        city: city.trim() || null,
        state: stateField.trim() || null,
        country: country || null,
        shipsWorldwide,
        coverImage: coverImage || null,
        images,
        visibility,
        isFeatured,
        isPinned,
      };

      if (isEdit && project) {
        await updatePortfolioProject(project.id, input);
        router.back();
      } else {
        const { project: created } = await createPortfolioProject(user.id, role, input);
        router.replace(`/project/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const softInput = { backgroundColor: colors.ivory, borderRadius: 14, padding: 13, fontFamily: fontFamilies.sans, fontSize: 14, color: colors.ink };
  const fieldLabel = { fontFamily: fontFamilies.sansBold, fontSize: 12.5, color: colors.inkSoft, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.3 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top']}>
      {/* Composer header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.ivoryDeep }}>
          {user.avatar ? <Image source={{ uri: resolveMediaUrl(user.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 15, color: colors.ink }}>{user.displayName}</Text>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 12.5, color: colors.inkSoft }}>{isEdit ? 'Editing your project' : 'Posting a new project'}</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={20} color={colors.inkSoft} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 18 }} keyboardShouldPersistTaps="handled">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Give your project a title..."
          placeholderTextColor={colors.inkSoft}
          style={{ fontFamily: fontFamilies.serif, fontSize: 22, color: colors.ink, paddingVertical: 4 }}
        />

        {/* Photo strip — tap any tile to set it as cover */}
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {images.map((img, idx) => (
              <Pressable key={img + idx} onPress={() => setCoverImage(img)} style={{ width: 88, height: 88, borderRadius: 16, overflow: 'hidden' }}>
                <Image source={{ uri: resolveMediaUrl(img) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                {img === coverImage ? (
                  <View style={{ position: 'absolute', bottom: 5, left: 5, backgroundColor: colors.gold, borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9.5, fontFamily: fontFamilies.sansBold, color: '#fff' }}>Cover</Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => removeImage(idx)}
                  hitSlop={6}
                  style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(20,18,16,0.6)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={11} color="#fff" />
                </Pressable>
              </Pressable>
            ))}
            <Pressable onPress={pickPhotos} style={{ width: 88, height: 88, borderRadius: 16, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center' }}>
              {uploading ? <ActivityIndicator color={colors.gold} /> : (
                <>
                  <Plus size={20} color={colors.gold} />
                  <Text style={{ fontSize: 10.5, fontFamily: fontFamilies.sansBold, color: colors.gold, marginTop: 2 }}>Add</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
          <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 8, fontFamily: fontFamilies.sans }}>Tap any photo to set it as your cover.</Text>
        </View>

        <View>
          <Text style={fieldLabel}>Short Summary</Text>
          <TextInput value={summary} onChangeText={setSummary} placeholder="A quick one-liner for your project card" placeholderTextColor={colors.inkSoft} style={softInput} />
        </View>

        <View>
          <Text style={fieldLabel}>Description</Text>
          <HashtagTextInput value={description} onChange={setDescription} placeholder="Describe your project — inspiration, process, materials used..." />
          {detectedTags.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {detectedTags.map((tag) => (
                <View key={tag} style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 12, fontFamily: fontFamilies.sansBold, color: colors.gold }}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 8, fontFamily: fontFamilies.sans }}>Add a # anywhere in your text and it becomes a tag automatically.</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={fieldLabel}>Category</Text>
            <SelectRow label={category === CUSTOM_OPTION ? customCategory || 'Custom...' : category || 'Select category'} onPress={() => setPicker('category')} />
            {category === CUSTOM_OPTION && (
              <TextInput value={customCategory} onChangeText={setCustomCategory} placeholder="Custom category..." placeholderTextColor={colors.inkSoft} style={{ ...softInput, marginTop: 8, padding: 10, fontSize: 13 }} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={fieldLabel}>Client Type</Text>
            <SelectRow label={clientType === CUSTOM_OPTION ? customClientType || 'Custom...' : clientType || 'Select type'} onPress={() => setPicker('clientType')} />
            {clientType === CUSTOM_OPTION && (
              <TextInput value={customClientType} onChangeText={setCustomClientType} placeholder="Custom client type..." placeholderTextColor={colors.inkSoft} style={{ ...softInput, marginTop: 8, padding: 10, fontSize: 13 }} />
            )}
          </View>
        </View>

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <MapPin size={15} color={colors.ink} />
            <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 14, color: colors.ink }}>Where are you based?</Text>
          </View>
          <Text style={{ fontSize: 12.5, color: colors.inkSoft, marginBottom: 12, fontFamily: fontFamilies.sans }}>Helps clients nearby find your work. No exact address needed.</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.inkSoft} style={{ ...softInput, flex: 1 }} />
            <TextInput value={stateField} onChangeText={setStateField} placeholder="State" placeholderTextColor={colors.inkSoft} style={{ ...softInput, flex: 1 }} />
          </View>
          <View style={{ marginTop: 8 }}>
            <SelectRow label={country || 'Country'} onPress={() => setPicker('country')} />
          </View>
          <View style={{ marginTop: 10, backgroundColor: colors.ivory, borderRadius: 14, paddingHorizontal: 14 }}>
            <ToggleRow label="Ships worldwide" description="Also show this to clients outside your area" value={shipsWorldwide} onValueChange={setShipsWorldwide} />
          </View>
        </View>

        <View>
          <Text style={fieldLabel}>Who can see this?</Text>
          <View style={{ flexDirection: 'row', backgroundColor: colors.ivory, borderRadius: 100, padding: 4, gap: 2 }}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setVisibility(opt.value)}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 100,
                  backgroundColor: visibility === opt.value ? colors.paper : 'transparent',
                }}
              >
                <Text style={{ fontFamily: fontFamilies.sansSemiBold, fontSize: 13, color: visibility === opt.value ? colors.ink : colors.inkSoft }}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ marginTop: 10 }}>
            <ToggleRow label="Featured" value={isFeatured} onValueChange={setIsFeatured} />
            <ToggleRow label="Pinned" value={isPinned} onValueChange={setIsPinned} />
          </View>
        </View>

        {error ? <Text style={{ color: colors.oxblood, fontSize: 12.5, fontFamily: fontFamilies.sans }}>{error}</Text> : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontFamily: fontFamilies.sansSemiBold, fontSize: 14, color: colors.inkSoft }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={saving || !title.trim()}
            style={{ backgroundColor: colors.gold, borderRadius: 100, paddingVertical: 13, paddingHorizontal: 32, opacity: saving || !title.trim() ? 0.5 : 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : null}
            <Text style={{ color: '#fff', fontFamily: fontFamilies.sansBold, fontSize: 14.5 }}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Post Project'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <OptionPickerModal
        visible={picker === 'category'}
        title="Category"
        options={[...CATEGORIES, CUSTOM_OPTION]}
        selected={category}
        onSelect={(v) => { setCategory(v); setPicker(null); }}
        onClose={() => setPicker(null)}
      />
      <OptionPickerModal
        visible={picker === 'clientType'}
        title="Client Type"
        options={[...CLIENT_TYPES, CUSTOM_OPTION]}
        selected={clientType}
        onSelect={(v) => { setClientType(v); setPicker(null); }}
        onClose={() => setPicker(null)}
      />
      <OptionPickerModal
        visible={picker === 'country'}
        title="Country"
        options={COUNTRIES.map((c) => c.name)}
        selected={country}
        onSelect={(v) => { setCountry(v); setPicker(null); }}
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}

