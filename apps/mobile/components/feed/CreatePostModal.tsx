import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { X, ImagePlus } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { uploadFiles, createPost, ApiError } from '@fashub/api-client';
import type { PostCategory } from '@fashub/types';
import { TextField } from '../TextField';
import { Button } from '../Button';
import { Banner } from '../Banner';
import { toUploadableFile } from '../../lib/uploadableFile';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const CATEGORIES: PostCategory[] = ['casual', 'formal', 'business', 'traditional', 'wedding', 'accessories', 'custom', 'other'];

export function CreatePostModal({ visible, onClose, onCreated }: Props) {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();

  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PostCategory>('casual');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setImages([]);
    setTitle('');
    setDescription('');
    setCategory('casual');
    setPrice('');
    setError('');
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.85,
    });
    if (!result.canceled) {
      setImages(result.assets);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      setError('Give it a title and a description.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const uploaded = await uploadFiles(images.map((img) => toUploadableFile(img.uri)), 'posts');
        imageUrls = uploaded.urls;
      }
      await createPost({
        authorId: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        images: imageUrls,
        price: price ? Number(price) : undefined,
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      // Only a clean ApiError from the backend's own {error} field is
      // shown verbatim (those are already written to be user-facing) —
      // anything else (a raw upload/network error, a parse failure)
      // falls back to a plain message instead of leaking internals.
      setError(err instanceof ApiError ? err.message : "Couldn't post. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.ivory }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
          <Pressable onPress={handleClose} hitSlop={8}>
            <X size={22} color={colors.ink} />
          </Pressable>
          <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>New Post</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
          {error ? <Banner tone="error">{error}</Banner> : null}

          <Pressable onPress={pickImages} style={{ flexDirection: 'row', gap: 8 }}>
            {images.length === 0 ? (
              <View style={{ width: 100, height: 100, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ImagePlus size={22} color={colors.inkSoft} />
                <Text style={{ ...typeScale.label, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.inkSoft }}>Add photos</Text>
              </View>
            ) : (
              images.map((img, i) => (
                <Image key={i} source={{ uri: img.uri }} style={{ width: 100, height: 100, borderRadius: radius.md }} contentFit="cover" />
              ))
            )}
          </Pressable>

          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Brooklyn Edge Three-Piece Suit" />
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Tell people about the piece…"
            multiline
            numberOfLines={4}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
          <TextField label="Price (optional)" value={price} onChangeText={setPrice} placeholder="1600" keyboardType="numeric" />

          <View style={{ gap: spacing.xs }}>
            <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? colors.ink : colors.line,
                      backgroundColor: active ? colors.ink : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? colors.ivory : colors.inkSoft, textTransform: 'capitalize' }}>
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Button variant="primary" onPress={handleSubmit} disabled={submitting}>
            {submitting ? 'Posting…' : 'Post'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
