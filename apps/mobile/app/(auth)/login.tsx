import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { Divider } from '../../components/Divider';
import { AuthLogo } from '../../components/AuthLogo';
import { ApiError } from '@fashub/api-client';

/** Mirrors app/auth/login/page.tsx on web — same flow, submit copy, and forgot-password/signup links. */
export default function LoginScreen() {
  const { colors, typeScale, spacing } = useTheme();
  const { login } = useAuth();
  const params = useLocalSearchParams<{ registered?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <AuthLogo />
            <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginTop: spacing.md }}>Welcome back</Text>
            <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>Sign in to your account</Text>
          </View>

          {params.registered === 'true' && <Banner tone="notice">Account created. Sign in to continue.</Banner>}
          {error ? <Banner tone="error">{error}</Banner> : null}

          <View style={{ gap: spacing.md }}>
            <TextField
              label="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
            />

            <Link href="/(auth)/forgot-password" style={{ alignSelf: 'flex-end' }}>
              <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.oxblood }}>
                Forgot password?
              </Text>
            </Link>

            <Button variant="primary" onPress={handleSubmit} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </View>

          <Divider />

          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>New to FaSHub?</Text>
            <Link href="/(auth)/signup" asChild>
              <Button variant="outline">Create an account</Button>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
