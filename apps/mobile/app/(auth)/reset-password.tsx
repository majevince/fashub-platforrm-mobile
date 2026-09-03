import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useLocalSearchParams } from 'expo-router';
import { CircleCheck, CircleX } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { AuthLogo } from '../../components/AuthLogo';
import { validateResetToken, resetPassword, ApiError } from '@fashub/api-client';

type Status = 'enter-token' | 'checking' | 'valid' | 'invalid' | 'success';

/** Extracts a token from either a raw token or a full pasted reset-link URL (?token=...). */
function extractToken(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/[?&]token=([^&\s]+)/);
  return match ? decodeURIComponent(match[1]) : trimmed;
}

/**
 * Mirrors app/auth/reset-password/page.tsx's status states and copy. Web
 * gets the token from the URL the emailed link opens directly; mobile has
 * no address bar for that, so this also accepts a deep link
 * (fashub://reset-password?token=...) via route params, falling back to a
 * manual paste-the-link-or-token field when opened without one — the
 * practical native equivalent for a link that arrived in an email app.
 */
export default function ResetPasswordScreen() {
  const { colors, typeScale, spacing } = useTheme();
  const params = useLocalSearchParams<{ token?: string }>();

  const [token, setToken] = useState(params.token ?? '');
  const [pastedInput, setPastedInput] = useState('');
  const [status, setStatus] = useState<Status>(params.token ? 'checking' : 'enter-token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setStatus('checking');
    validateResetToken(token)
      .then((res) => {
        if (!cancelled) setStatus(res.valid ? 'valid' : 'invalid');
      })
      .catch(() => {
        if (!cancelled) setStatus('invalid');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleUseToken = () => {
    const extracted = extractToken(pastedInput);
    if (!extracted) {
      setError('Paste the reset link or code from your email.');
      return;
    }
    setError('');
    setToken(extracted);
  };

  const handleSubmit = async () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password, confirmPassword);
      setStatus('success');
    } catch (err) {
      if (err instanceof ApiError && /invalid|expired/i.test(err.message)) {
        setStatus('invalid');
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const heading = {
    'enter-token': 'Enter your reset link',
    checking: 'Checking your link…',
    valid: 'Create new password',
    invalid: 'Link invalid or expired',
    success: 'Password reset',
  }[status];

  const subtitle = {
    'enter-token': 'Paste the reset link or code from your email.',
    checking: '',
    valid: 'Choose a strong password for your account.',
    invalid: 'This password reset link is no longer valid.',
    success: 'You can now sign in with your new password.',
  }[status];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <AuthLogo />
            <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginTop: spacing.md, textAlign: 'center' }}>
              {heading}
            </Text>
            {subtitle ? (
              <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, textAlign: 'center' }}>{subtitle}</Text>
            ) : null}
          </View>

          {error ? <Banner tone="error">{error}</Banner> : null}

          {status === 'enter-token' && (
            <View style={{ gap: spacing.md }}>
              <TextField
                label="Reset link or code"
                value={pastedInput}
                onChangeText={setPastedInput}
                autoCapitalize="none"
                placeholder="Paste from your email"
              />
              <Button variant="primary" onPress={handleUseToken}>
                Continue
              </Button>
            </View>
          )}

          {status === 'checking' && (
            <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator color={colors.oxblood} />
            </View>
          )}

          {status === 'valid' && (
            <View style={{ gap: spacing.md }}>
              <TextField
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                placeholder="••••••••"
                hint="At least 8 characters, with a letter and a number"
              />
              <TextField
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
                placeholder="••••••••"
              />
              <Button variant="primary" onPress={handleSubmit} disabled={loading}>
                {loading ? 'Resetting password…' : 'Reset password'}
              </Button>
            </View>
          )}

          {status === 'invalid' && (
            <View style={{ alignItems: 'center', gap: spacing.lg }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: colors.ivoryDeep,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CircleX size={28} color={colors.oxblood} strokeWidth={1.6} />
              </View>
              <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, textAlign: 'center' }}>
                This link may have already been used or has expired. Request a new one to continue.
              </Text>
              <Link href="/(auth)/forgot-password" asChild>
                <Button variant="primary">Request new link</Button>
              </Link>
            </View>
          )}

          {status === 'success' && (
            <View style={{ alignItems: 'center', gap: spacing.lg }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: colors.ivoryDeep,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CircleCheck size={28} color={colors.gold} strokeWidth={1.6} />
              </View>
              <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, textAlign: 'center' }}>
                You've been logged out of all devices for your security.
              </Text>
              <Link href="/(auth)/login" asChild>
                <Button variant="primary">Continue to login</Button>
              </Link>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
