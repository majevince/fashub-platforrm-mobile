import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { SocialButton } from '../../components/SocialButton';
import { AuthLogo } from '../../components/AuthLogo';
import { ApiError } from '@fashub/api-client';
import { googleSignIn, appleSignIn, SsoCancelledError, ssoErrorMessage } from '../../lib/sso';

/** Mirrors app/auth/login/page.tsx on web — same flow, submit copy, and forgot-password/signup links. */
export default function LoginScreen() {
  const { colors, typeScale, spacing } = useTheme();
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const params = useLocalSearchParams<{ registered?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach FaSHub. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setSsoLoading('google');
    try {
      const idToken = await googleSignIn();
      await loginWithGoogle(idToken);
      router.replace('/');
    } catch (err) {
      if (!(err instanceof SsoCancelledError)) {
        setError(ssoErrorMessage(err, 'Google sign-in failed. Please try again.'));
      }
    } finally {
      setSsoLoading(null);
    }
  };

  const handleApple = async () => {
    setError('');
    setSsoLoading('apple');
    try {
      const { identityToken, user } = await appleSignIn();
      await loginWithApple(identityToken, user);
      router.replace('/');
    } catch (err) {
      if (!(err instanceof SsoCancelledError)) {
        setError(ssoErrorMessage(err, 'Apple sign-in failed. Please try again.'));
      }
    } finally {
      setSsoLoading(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <AuthLogo />
            <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginTop: spacing.md }}>Welcome back</Text>
            <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>Sign in to your account</Text>
          </View>

          {params.registered === 'true' && <Banner tone="notice">Account created. Sign in to continue.</Banner>}
          {error ? <Banner tone="error">{error}</Banner> : null}

          <View style={{ gap: spacing.sm }}>
            {/* Apple has no native Sign in with Apple on Android — see lib/sso.ts */}
            {Platform.OS === 'ios' && (
              <SocialButton
                provider="apple"
                onPress={handleApple}
                loading={ssoLoading === 'apple'}
                disabled={ssoLoading !== null || loading}
              />
            )}
            <SocialButton
              provider="google"
              onPress={handleGoogle}
              loading={ssoLoading === 'google'}
              disabled={ssoLoading !== null || loading}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
            <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>or with email</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
          </View>

          <View style={{ gap: spacing.md }}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@studio.com"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              placeholder="Min. 8 characters"
              rightElement={
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.gold }}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              }
            />

            <Link href="/(auth)/forgot-password" style={{ alignSelf: 'flex-end' }}>
              <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', color: colors.gold }}>
                Forgot password?
              </Text>
            </Link>

            <Button variant="primary" onPress={handleSubmit} disabled={loading} style={{ backgroundColor: colors.gold }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
            <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>New to FaSHub?</Text>
            <Link href="/(auth)/signup">
              <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', color: colors.gold }}>
                Create an account
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
