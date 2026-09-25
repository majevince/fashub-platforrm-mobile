import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { Checkbox } from '../../components/Checkbox';
import { SocialButton } from '../../components/SocialButton';
import { AuthLogo } from '../../components/AuthLogo';
import { ApiError } from '@fashub/api-client';
import type { UserRole } from '@fashub/types';
import { googleSignIn, appleSignIn, SsoCancelledError, ssoErrorMessage } from '../../lib/sso';

/** Mirrors app/auth/signup/page.tsx on web: same role options, fields, and validation rules. */
const ROLES: { value: Extract<UserRole, 'individual' | 'designer' | 'tailor'>; label: string }[] = [
  { value: 'individual', label: 'Client' },
  { value: 'designer', label: 'Designer' },
  { value: 'tailor', label: 'Tailor' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Names read best capitalized — this capitalizes just the first character as
// typed, without forcing the rest of the string to any case (so "McCarthy"
// or "deVries" aren't clobbered). Mirrors the web signup form.
const capitalizeFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Web scores strength on a 5-tier red→green scale; the approved palette has
 * no success-green, so this reduces to 3 tiers using tones that already
 * exist in the token set (oxblood reads as "needs work", gold as "on
 * track", ink as "solid") rather than inventing an off-brand color.
 */
function getPasswordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12 && /[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) s++;
  if (pw.length === 0) return { score: 0, label: '' };
  if (s <= 1) return { score: 1, label: 'Weak' };
  if (s === 2) return { score: 2, label: 'Good' };
  return { score: 3, label: 'Strong' };
}

export default function SignupScreen() {
  const { colors, typeScale, spacing } = useTheme();
  const { signup, loginWithGoogle, loginWithApple } = useAuth();
  const [ssoLoading, setSsoLoading] = useState<'google' | 'apple' | null>(null);
  const [ssoError, setSsoError] = useState('');

  // Defaults to Client (matches web) so the submit button always reads a
  // real role from the first render instead of a blank "account" state.
  const [role, setRole] = useState<Extract<UserRole, 'individual' | 'designer' | 'tailor'>>('individual');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const roleLabel = ROLES.find((r) => r.value === role)?.label ?? 'account';

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'Required';
    if (!lastName.trim()) e.lastName = 'Required';
    if (!email.trim()) e.email = 'Required';
    else if (!EMAIL_RE.test(email)) e.email = 'Invalid email';
    if (!password) e.password = 'Required';
    else if (password.length < 8) e.password = 'At least 8 characters';
    if (password !== confirmPassword) e.confirmPassword = "Passwords don't match";
    if (!agreeToTerms) e.agreeToTerms = 'Required to continue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      await signup({
        email: email.trim(),
        password,
        displayName,
        role,
        profileData: { bio: `${role} on FaSHub` },
      });
      router.replace('/(auth)/login?registered=true');
    } catch (err) {
      setErrors({ submit: err instanceof ApiError ? err.message : "Couldn't create your account. Try again." });
    } finally {
      setLoading(false);
    }
  };

  // Unlike the password flow above, Google/Apple sign-in has no password to
  // send the person back to re-enter — a successful response logs them
  // straight in, same as the login screen's own SSO handlers.
  const handleGoogle = async () => {
    setSsoError('');
    setSsoLoading('google');
    try {
      const idToken = await googleSignIn();
      await loginWithGoogle(idToken);
      router.replace('/');
    } catch (err) {
      if (!(err instanceof SsoCancelledError)) {
        setSsoError(ssoErrorMessage(err, 'Google sign-in failed. Please try again.'));
      }
    } finally {
      setSsoLoading(null);
    }
  };

  const handleApple = async () => {
    setSsoError('');
    setSsoLoading('apple');
    try {
      const { identityToken, user } = await appleSignIn();
      await loginWithApple(identityToken, user);
      router.replace('/');
    } catch (err) {
      if (!(err instanceof SsoCancelledError)) {
        setSsoError(ssoErrorMessage(err, 'Apple sign-in failed. Please try again.'));
      }
    } finally {
      setSsoLoading(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <AuthLogo />
            <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginTop: spacing.md }}>Create your account</Text>
            <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, textAlign: 'center' }}>
              Join the fashion network in a minute.
            </Text>
          </View>

          {errors.submit ? <Banner tone="error">{errors.submit}</Banner> : null}
          {ssoError ? <Banner tone="error">{ssoError}</Banner> : null}

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

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField
                label="First name"
                value={firstName}
                onChangeText={(v) => setFirstName(capitalizeFirst(v))}
                error={errors.firstName}
                autoComplete="given-name"
                autoCapitalize="words"
                placeholder="John"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Last name"
                value={lastName}
                onChangeText={(v) => setLastName(capitalizeFirst(v))}
                error={errors.lastName}
                autoComplete="family-name"
                autoCapitalize="words"
                placeholder="Doe"
              />
            </View>
          </View>

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@studio.com"
          />

          <View style={{ gap: spacing.xs }}>
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              rightElement={
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.gold }}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              }
            />
            {password.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', gap: 3, flex: 1 }}>
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor:
                          i <= strength.score
                            ? [colors.oxblood, colors.gold, colors.ink][strength.score - 1]
                            : colors.line,
                      }}
                    />
                  ))}
                </View>
                <Text style={{ fontWeight: '500', fontSize: 10, color: colors.inkSoft }}>{strength.label}</Text>
              </View>
            )}
          </View>

          <TextField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            rightElement={
              <Pressable onPress={() => setShowConfirmPassword((v) => !v)} hitSlop={8}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.gold }}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            }
          />

          <View style={{ gap: spacing.sm }}>
            <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>
              I&apos;m joining as
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {ROLES.map((r) => {
                const active = role === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setRole(r.value)}
                    style={[
                      styles.pill,
                      {
                        borderColor: active ? colors.gold : colors.line,
                        backgroundColor: active ? colors.ivoryDeep : colors.ivory,
                      },
                    ]}
                  >
                    <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', color: active ? colors.goldDim : colors.ink }}>
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: spacing.xs }}>
            <Checkbox
              checked={agreeToTerms}
              onToggle={() => setAgreeToTerms((v) => !v)}
              label="I agree to the Terms of Service and Privacy Policy"
            />
            {errors.agreeToTerms ? (
              <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.oxblood, marginLeft: 32 }}>{errors.agreeToTerms}</Text>
            ) : null}
          </View>

          <Button variant="primary" onPress={handleSubmit} disabled={loading} style={{ backgroundColor: colors.gold }}>
            {loading ? 'Creating account…' : `Create ${roleLabel.toLowerCase()} account`}
          </Button>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
            <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>Already have an account?</Text>
            <Link href="/(auth)/login">
              <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', color: colors.gold }}>
                Sign in
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});
