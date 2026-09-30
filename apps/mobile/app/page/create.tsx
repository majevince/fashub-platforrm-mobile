import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { createPage, ApiError } from '@fashub/api-client';

const HANDLE_RE = /^[a-z0-9][a-z0-9_]{1,28}[a-z0-9]$/;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);

/**
 * A single-step create form, not the multi-step "wizard" the original spec
 * assumed — no wizard design exists anywhere (confirmed in Step 0), and
 * this covers everything the schema actually stores today. Uses
 * KeyboardAvoidingView with behavior set for both platforms — the (auth)
 * screens' own fix for the Android keyboard-covering-input bug, re-applied
 * here per this ticket's Step 0 instruction rather than assumed fixed
 * app-wide (it isn't; each screen sets its own behavior).
 */
export default function CreatePageScreen() {
  const { colors, spacing, typeScale } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleEdited, setHandleEdited] = useState(false);
  const [category, setCategory] = useState('');
  const [kind, setKind] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onNameChange = (v: string) => {
    setName(v);
    if (!handleEdited) setHandle(slugify(v));
  };

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) {
      setError('Give your Page a name.');
      return;
    }
    if (!HANDLE_RE.test(handle)) {
      setError('Handle must be 3-30 characters: lowercase letters, numbers, underscores.');
      return;
    }
    setLoading(true);
    try {
      const { page } = await createPage({
        name: name.trim(),
        handle,
        category: category.trim() || undefined,
        kind: kind.trim() || undefined,
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
      });
      router.replace(`/page/${page.handle}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create your Page. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Create a Page</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md }} keyboardShouldPersistTaps="handled">
          {error ? <Banner tone="error">{error}</Banner> : null}

          <TextField label="Page name" value={name} onChangeText={onNameChange} placeholder="Maison Anyah" />
          <TextField
            label="Handle"
            value={handle}
            onChangeText={(v) => { setHandleEdited(true); setHandle(slugify(v)); }}
            placeholder="maisonanyah"
            autoCapitalize="none"
            hint="fashub.com/page/@handle — lowercase letters, numbers, underscores"
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="Category" value={category} onChangeText={setCategory} placeholder="Atelier" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Type" value={kind} onChangeText={setKind} placeholder="Tailoring House" />
            </View>
          </View>
          <TextField label="Bio" value={bio} onChangeText={setBio} placeholder="Bespoke tailoring for the modern silhouette…" multiline numberOfLines={3} />
          <TextField label="City" value={city} onChangeText={setCity} placeholder="Denton, TX" />

          <Button variant="primary" onPress={handleSubmit} disabled={loading} style={{ backgroundColor: colors.gold }}>
            {loading ? 'Creating…' : 'Create Page'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
