import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { AuthLogo } from '../../components/AuthLogo';
import { forgotPassword, ApiError } from '@fashub/api-client';

/** Mirrors app/auth/forgot-password/page.tsx: same generic-response copy, 30-minute expiry note. */
export default function ForgotPasswordScreen() {
  const { colors, typeScale, spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email) {
      setError('Enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
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
            <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginTop: spacing.md, textAlign: 'center' }}>
              {submitted ? 'Check your email' : 'Forgot your password?'}
            </Text>
            <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, textAlign: 'center' }}>
              {submitted
                ? "If an account exists with that email, we've sent a link to reset your password."
                : "Enter your email and we'll send you a link to reset it."}
            </Text>
          </View>

          {error ? <Banner tone="error">{error}</Banner> : null}

          {!submitted ? (
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
              <Button variant="primary" onPress={handleSubmit} disabled={loading}>
                {loading ? 'Sending link…' : 'Send reset link'}
              </Button>
              <Link href="/(auth)/login" style={{ alignSelf: 'center' }}>
                <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.oxblood }}>← Back to login</Text>
              </Link>
            </View>
          ) : (
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
                <Mail size={28} color={colors.oxblood} strokeWidth={1.6} />
              </View>
              <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, textAlign: 'center' }}>
                The link expires in 30 minutes. If you don't see the email, check your spam folder.
              </Text>
              <Link href="/(auth)/login" asChild>
                <Button variant="primary">Back to login</Button>
              </Link>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
