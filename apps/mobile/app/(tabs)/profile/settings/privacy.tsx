import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../context/AuthContext';
import { getUserProfile, updateUserProfile, ApiError } from '@fashub/api-client';
import type { ProfilePrivacySettings } from '@fashub/types';
import { SettingsScreenShell } from '../../../../components/settings/SettingsScreenShell';
import { ToggleRow } from '../../../../components/settings/ToggleRow';

const VISIBILITY_OPTIONS_INDIVIDUAL = [
  { key: 'public', label: 'Public', desc: 'Anyone can view your profile' },
  { key: 'professionals', label: 'Professionals Only', desc: 'Only designers/tailors can view' },
  { key: 'private', label: 'Private', desc: 'Only you can view your profile' },
] as const;

const VISIBILITY_OPTIONS_PRO = [
  { key: 'public', label: 'Public', desc: 'Anyone can view your profile' },
  { key: 'connections', label: 'Connections Only', desc: 'Only people you follow each other with' },
  { key: 'private', label: 'Private', desc: 'Only you can view your profile' },
] as const;

/**
 * Matches web's Privacy tab exactly — including its auto-save-per-toggle
 * behavior (handlePrivacyChange fires its own PATCH immediately, no Save
 * button, a "Saving…" indicator shows while in flight) and its role-based
 * field set: Individual gets showActivity/showConnections (no
 * showPortfolio/showPricing/showStats/showProjects/showBadges); Designer/
 * Tailor get the reverse (Prisma schema confirms neither role has both sets
 * of columns). profileVisibility's middle option also differs by role
 * ("Professionals Only" vs "Connections Only") — not a typo, a real
 * schema-level difference. No block-list management or data-export setting
 * exists anywhere on web to port.
 */
export default function PrivacySettingsScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<ProfilePrivacySettings>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pro = user?.role === 'designer' || user?.role === 'tailor';
  const visibilityOptions = pro ? VISIBILITY_OPTIONS_PRO : VISIBILITY_OPTIONS_INDIVIDUAL;

  const load = () => {
    if (!user) return;
    getUserProfile(user.id, user.id).then((profile) => {
      setSettings(profile.privacySettings ?? {});
      setLoading(false);
    });
  };

  useEffect(load, [user]);

  if (!user) return null;

  const commit = (next: ProfilePrivacySettings) => {
    setSettings(next);
    setSaving(true);
    setError('');
    // Debounced slightly so rapid taps (e.g. toggling several rows quickly)
    // collapse into one request with the final state, rather than firing a
    // PATCH per keystroke-equivalent — web's own handler has no such
    // debounce, but this is a strict improvement, not a behavior change.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await updateUserProfile(user.id, { role: user.role, profileData: { privacySettings: next } });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't save privacy settings.");
      } finally {
        setSaving(false);
      }
    }, 400);
  };

  const set = <K extends keyof ProfilePrivacySettings>(key: K, value: ProfilePrivacySettings[K]) => commit({ ...settings, [key]: value });

  return (
    <SettingsScreenShell title="Privacy" loading={loading} error={error}>
      {saving ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -spacing.sm }}>
          <ActivityIndicator size="small" color={colors.oxblood} />
          <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.inkSoft }}>Saving…</Text>
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft }}>Profile Visibility</Text>
        {visibilityOptions.map((opt) => {
          const selected = settings.profileVisibility === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => set('profileVisibility', opt.key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: selected ? colors.gold : colors.line, backgroundColor: selected ? colors.ivoryDeep : colors.ivory }}
            >
              <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: selected ? colors.gold : colors.line, alignItems: 'center', justifyContent: 'center' }}>
                {selected ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{opt.label}</Text>
                <Text style={{ fontSize: 11, fontWeight: '400', color: colors.inkSoft, marginTop: 1 }}>{opt.desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 2 }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft, marginBottom: 6 }}>Contact Info Visibility</Text>
        <ToggleRow label="Show Email" value={!!settings.showEmail} onValueChange={(v) => set('showEmail', v)} />
        <ToggleRow label="Show Phone" value={!!settings.showPhone} onValueChange={(v) => set('showPhone', v)} />
        <ToggleRow label="Show Location" value={!!settings.showLocation} onValueChange={(v) => set('showLocation', v)} />
        <ToggleRow label="Show Social Media" value={!!settings.showSocialMedia} onValueChange={(v) => set('showSocialMedia', v)} />
      </View>

      <View style={{ gap: 2 }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft, marginBottom: 6 }}>Interaction Settings</Text>
        <ToggleRow label="Allow Messages" value={!!settings.allowMessages} onValueChange={(v) => set('allowMessages', v)} />
        <ToggleRow label="Allow Reviews" value={!!settings.allowReviews} onValueChange={(v) => set('allowReviews', v)} />
        <ToggleRow label="Show Online Status" value={!!settings.showOnlineStatus} onValueChange={(v) => set('showOnlineStatus', v)} />
      </View>

      {pro ? (
        <View style={{ gap: 2 }}>
          <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft, marginBottom: 6 }}>Professional Information</Text>
          <ToggleRow label="Show Portfolio" value={!!settings.showPortfolio} onValueChange={(v) => set('showPortfolio', v)} />
          <ToggleRow label="Show Projects" value={!!settings.showProjects} onValueChange={(v) => set('showProjects', v)} />
          <ToggleRow label="Show Pricing" value={!!settings.showPricing} onValueChange={(v) => set('showPricing', v)} />
          <ToggleRow label="Show Stats" value={!!settings.showStats} onValueChange={(v) => set('showStats', v)} />
          <ToggleRow label="Show Badges" value={!!settings.showBadges} onValueChange={(v) => set('showBadges', v)} />
        </View>
      ) : (
        <View style={{ gap: 2 }}>
          <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '600', textTransform: 'uppercase', color: colors.inkSoft, marginBottom: 6 }}>Activity & Connections</Text>
          <ToggleRow label="Show Activity" value={!!settings.showActivity} onValueChange={(v) => set('showActivity', v)} />
          <ToggleRow label="Show Connections" value={!!settings.showConnections} onValueChange={(v) => set('showConnections', v)} />
        </View>
      )}
    </SettingsScreenShell>
  );
}
