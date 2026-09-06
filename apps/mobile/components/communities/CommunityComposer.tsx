import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Video as VideoIcon, BarChart3, X, Plus, Type } from 'lucide-react-native';
import { violetColors as VF } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { resolveMediaUrl, uploadFiles, createCommunityPost, ApiError } from '@fashub/api-client';
import type { CommunityPost, CommunityPostType } from '@fashub/types';
import { toUploadableFile } from '../../lib/uploadableFile';
import { Banner } from '../../components/Banner';

const MODES: { key: CommunityPostType; label: string; Icon: typeof Camera }[] = [
  { key: 'text', label: 'Text', Icon: Type },
  { key: 'photo', label: 'Photo', Icon: Camera },
  { key: 'video', label: 'Video', Icon: VideoIcon },
  { key: 'poll', label: 'Poll', Icon: BarChart3 },
];

/**
 * Ports web's inline composer on the community detail page: mode tabs
 * (text/photo/video/poll), one shared `content` field required for every
 * mode (even poll — a caption in addition to the poll question, matching
 * web's own real behavior, not a mobile invention), photo multi-select,
 * single video, and poll question + 2-10 options. Submits to the same
 * POST /api/communities/{slug}/posts the web composer uses.
 */
export function CommunityComposer({
  slug,
  userId,
  avatarUri,
  onPosted,
}: {
  slug: string;
  userId: string;
  avatarUri: string | null;
  onPosted: (post: CommunityPost) => void;
}) {
  const { colors, radius } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<CommunityPostType>('text');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const openMode = (m: CommunityPostType) => {
    setMode(m);
    setExpanded(true);
  };

  const reset = () => {
    setExpanded(false);
    setMode('text');
    setContent('');
    setImages([]);
    setVideo(null);
    setPollQuestion('');
    setPollOptions(['', '']);
    setError('');
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!result.canceled) setImages((prev) => [...prev, ...result.assets].slice(0, 10));
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) setVideo(result.assets[0]);
  };

  const canSubmit =
    content.trim().length > 0 &&
    !submitting &&
    (mode !== 'poll' || (pollQuestion.trim().length > 0 && pollOptions.filter((o) => o.trim()).length >= 2));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      let imageUrls: string[] | undefined;
      let videoUrl: string | undefined;

      if (mode === 'photo' && images.length > 0) {
        const uploaded = await uploadFiles(images.map((img) => toUploadableFile(img.uri)), 'communities');
        imageUrls = uploaded.urls;
      }
      if (mode === 'video' && video) {
        const uploaded = await uploadFiles([toUploadableFile(video.uri)], 'communities');
        videoUrl = uploaded.urls[0];
      }

      const post = await createCommunityPost(slug, {
        userId,
        content: content.trim(),
        postType: mode,
        images: imageUrls,
        videoUrl,
        pollQuestion: mode === 'poll' ? pollQuestion.trim() : undefined,
        pollOptions: mode === 'poll' ? pollOptions.map((o) => o.trim()).filter(Boolean) : undefined,
      });
      onPosted(post);
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't publish this post.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    return (
      <View style={{ backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 10 }}>
        <Pressable onPress={() => openMode('text')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.gold, overflow: 'hidden' }}>
            {avatarUri ? <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
          </View>
          <View style={{ flex: 1, backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '400', color: VF.inkFaint }}>Share something…</Text>
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => openMode('photo')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.ivoryDeep }}>
            <Camera size={14} color={colors.inkSoft} /><Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.inkSoft }}>Photo</Text>
          </Pressable>
          <Pressable onPress={() => openMode('video')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.ivoryDeep }}>
            <VideoIcon size={14} color={colors.inkSoft} /><Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.inkSoft }}>Video</Text>
          </Pressable>
          <Pressable onPress={() => openMode('poll')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.ivoryDeep }}>
            <BarChart3 size={14} color={colors.inkSoft} /><Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.inkSoft }}>Poll</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 }}>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flex: 1 }}>
          {MODES.map(({ key, label }) => (
            <Pressable key={key} onPress={() => setMode(key)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: mode === key ? colors.gold : colors.ivoryDeep }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: mode === key ? colors.ivory : colors.inkSoft }}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable onPress={reset} hitSlop={8} style={{ marginLeft: 8 }}><X size={18} color={colors.inkSoft} /></Pressable>
      </View>

      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder={mode === 'poll' ? 'Add some context for your poll…' : "What's on your mind?"}
        placeholderTextColor={VF.inkFaint}
        multiline
        numberOfLines={3}
        style={{ fontSize: 14, color: colors.ink, minHeight: 70, textAlignVertical: 'top' }}
      />

      {mode === 'photo' ? (
        <View style={{ gap: 8 }}>
          <Pressable onPress={pickImages} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, borderRadius: radius.md, paddingVertical: 14 }}>
            <Camera size={16} color={VF.inkFaint} /><Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkSoft }}>Add photos</Text>
          </Pressable>
          {images.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {images.map((img, i) => (
                <View key={img.uri} style={{ width: 70, height: 70, borderRadius: 8, overflow: 'hidden' }}>
                  <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  <Pressable onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={11} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {mode === 'video' ? (
        video ? (
          <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000' }}>
            <Image source={{ uri: video.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            <Pressable onPress={() => setVideo(null)} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pickVideo} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, borderRadius: radius.md, paddingVertical: 14 }}>
            <VideoIcon size={16} color={VF.inkFaint} /><Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkSoft }}>Upload a video (up to 100MB)</Text>
          </Pressable>
        )
      ) : null}

      {mode === 'poll' ? (
        <View style={{ gap: 8 }}>
          <TextInput
            value={pollQuestion}
            onChangeText={setPollQuestion}
            placeholder="Ask a question…"
            placeholderTextColor={VF.inkFaint}
            style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: colors.ink }}
          />
          {pollOptions.map((opt, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={opt}
                onChangeText={(t) => setPollOptions((prev) => prev.map((o, idx) => (idx === i ? t : o)))}
                placeholder={`Option ${i + 1}`}
                placeholderTextColor={VF.inkFaint}
                style={{ flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: colors.ink }}
              />
              {pollOptions.length > 2 ? (
                <Pressable onPress={() => setPollOptions((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={6}>
                  <X size={16} color={colors.inkSoft} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {pollOptions.length < 10 ? (
            <Pressable onPress={() => setPollOptions((prev) => [...prev, ''])} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Plus size={14} color={colors.gold} /><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gold }}>Add option</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Pressable onPress={handleSubmit} disabled={!canSubmit} style={{ backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 12, alignItems: 'center', opacity: canSubmit ? 1 : 0.5 }}>
        {submitting ? <ActivityIndicator size="small" color={colors.ivory} /> : <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ivory }}>Post</Text>}
      </Pressable>
    </View>
  );
}
