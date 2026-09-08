import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, UserPlus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { sendInvites, ApiError } from '@fashub/api-client';
import { Banner } from '../components/Banner';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Comma-separated single input, matching the app's existing multi-value
 * pattern (community/create.tsx's tags field) rather than an "add another"
 * chip UI the app has no precedent for. Referral code/attribution and the
 * 20-per-day cap are entirely server-side (app/api/invite in the fashub
 * repo) — this screen just collects emails and renders the per-email
 * result, since sending is never all-or-nothing (some addresses can be
 * invalid while others send fine).
 */
export default function InviteFriendScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const [failed, setFailed] = useState<{ email: string; reason: string }[]>([]);

  const handleSend = async () => {
    const emails = Array.from(new Set(input.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)));

    if (emails.length === 0) {
      setError('Enter at least one email address');
      return;
    }
    if (emails.some((e) => !EMAIL_RE.test(e))) {
      setError('One or more email addresses look invalid');
      return;
    }

    setSending(true);
    setError('');
    setSent([]);
    setFailed([]);
    try {
      const result = await sendInvites(emails);
      setSent(result.sent);
      setFailed(result.failed);
      if (result.sent.length > 0) setInput('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send invites — try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>Invite a friend</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: spacing.sm }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.goldSoft + '2E', alignItems: 'center', justifyContent: 'center' }}>
            <UserPlus size={26} color={colors.gold} strokeWidth={1.8} />
          </View>
          <Text style={{ fontSize: 13, color: colors.inkSoft, textAlign: 'center', lineHeight: 19 }}>
            Invite friends and colleagues to join FaSHub. We'll email them a link to sign up.
          </Text>
        </View>

        {error ? <Banner tone="error">{error}</Banner> : null}
        {sent.length > 0 ? <Banner tone="success">{`Invite sent to ${sent.join(', ')}`}</Banner> : null}
        {failed.length > 0 ? (
          <Banner tone="error">{`Couldn't send to ${failed.map((f) => `${f.email} (${f.reason})`).join(', ')}`}</Banner>
        ) : null}

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>Email addresses</Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="friend@example.com, colleague@example.com"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            multiline
            style={{
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: radius.md,
              paddingHorizontal: 12,
              paddingVertical: 11,
              fontSize: 13.5,
              color: colors.ink,
              backgroundColor: colors.paper,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
          <Text style={{ fontSize: 11, color: colors.inkSoft }}>Separate multiple addresses with commas. Up to 20 invites per day.</Text>
        </View>

        <Pressable
          onPress={handleSend}
          disabled={sending}
          style={{ backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 13, alignItems: 'center', opacity: sending ? 0.7 : 1 }}
        >
          {sending ? <ActivityIndicator color={colors.ivory} /> : <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.ivory }}>Send invite</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
