import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { Checkbox } from '../../components/Checkbox';
import { AuthLogo } from '../../components/AuthLogo';
import { ApiError } from '@fashub/api-client';
import type { UserRole } from '@fashub/types';

/** Mirrors app/auth/signup/page.tsx on web: same role options, fields, and validation rules. */
const ROLES: { value: Extract<UserRole, 'individual' | 'designer' | 'tailor'>; label: string; desc: string }[] = [
  { value: 'individual', label: 'Client', desc: 'Find & hire professionals' },
  { value: 'designer', label: 'Designer', desc: 'Showcase your designs' },
  { value: 'tailor', label: 'Tailor', desc: 'Grow your business' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const { signup } = useAuth();

  const [role, setRole] = useState<UserRole | ''>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!role) e.role = 'Select an account type';
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
        role: role as Extract<UserRole, 'individual' | 'designer' | 'tailor'>,
        profileData: { bio: `${role} on FaSHub` },
      });
      router.replace('/');
    } catch (err) {
      setErrors({ submit: err instanceof ApiError ? err.message : "Couldn't create your account. Try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <AuthLogo />
            <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink, marginTop: spacing.md }}>Create your account</Text>
            <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft, textAlign: 'center' }}>
              Join fashion professionals and clients on FaSHub
            </Text>
          </View>

          {errors.submit ? <Banner tone="error">{errors.submit}</Banner> : null}

          <View style={{ gap: spacing.sm }}>
            <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>
              I am a
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {ROLES.map((r) => {
                const active = role === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setRole(r.value)}
                    style={[
                      styles.roleCard,
                      {
                        borderColor: active ? colors.oxblood : colors.line,
                        backgroundColor: active ? colors.ivoryDeep : colors.ivory,
                      },
                    ]}
                  >
                    <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', color: colors.ink }}>
                      {r.label}
                    </Text>
                    <Text style={{ fontWeight: '400', fontSize: 10.5, color: colors.inkSoft, marginTop: 2 }}>
                      {r.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.role ? <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.oxblood }}>{errors.role}</Text> : null}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="First name" value={firstName} onChangeText={setFirstName} error={errors.firstName} autoComplete="given-name" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Last name" value={lastName} onChangeText={setLastName} error={errors.lastName} autoComplete="family-name" />
            </View>
          </View>

          <TextField
            label="Email address"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />

          <View style={{ gap: spacing.xs }}>
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry
              autoComplete="new-password"
              placeholder="••••••••"
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
            secureTextEntry
            autoComplete="new-password"
            placeholder="••••••••"
          />

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

          <Button variant="primary" onPress={handleSubmit} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
            <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>Already have an account?</Text>
            <Link href="/(auth)/login">
              <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', color: colors.oxblood }}>
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
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
});
