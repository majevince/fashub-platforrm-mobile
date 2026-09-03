import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { getUserProfile, updateUserProfile, ApiError } from '@fashub/api-client';
import { TextField } from '../../../../components/TextField';
import { SettingsScreenShell } from '../../../../components/settings/SettingsScreenShell';

/**
 * Matches web's Social Media tab field set exactly (instagram/facebook/
 * twitter/website — no TikTok/Pinterest/YouTube/LinkedIn, confirmed those
 * don't exist anywhere in web's settings UI). Fixed at the source for
 * Individual accounts: web's own Individual Settings page never wires this
 * tab to the backend at all (no load, no save — entered values vanish), and
 * IndividualProfile had no social-media columns in the schema to persist to
 * even if it tried. Both are fixed (settings_parity_fields migration +
 * the PATCH route's individual branch), so this works correctly for every
 * role on mobile, not just designer/tailor as on web.
 */
export default function SocialMediaSettingsScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [website, setWebsite] = useState('');

  const load = () => {
    if (!user) return;
    getUserProfile(user.id, user.id).then((profile) => {
      const fields = profile.individualProfile ?? profile.designerProfile ?? profile.tailorProfile;
      setInstagram(fields?.instagram ?? '');
      setFacebook(fields?.facebook ?? '');
      setTwitter(fields?.twitter ?? '');
      setWebsite(fields?.website ?? '');
      setLoading(false);
    });
  };

  useEffect(load, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateUserProfile(user.id, {
        role: user.role,
        profileData: { socialMedia: { instagram, facebook, twitter, website } },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsScreenShell title="Social Media" loading={loading} error={error} onSave={handleSave} saving={saving}>
      <TextField label="Instagram" value={instagram} onChangeText={setInstagram} autoCapitalize="none" placeholder="@handle" />
      <TextField label="Facebook" value={facebook} onChangeText={setFacebook} autoCapitalize="none" placeholder="https://facebook.com/yourpage" />
      <TextField label="Twitter / X" value={twitter} onChangeText={setTwitter} autoCapitalize="none" placeholder="@handle" />
      <TextField label="Website" value={website} onChangeText={setWebsite} autoCapitalize="none" placeholder="https://" />
    </SettingsScreenShell>
  );
}
