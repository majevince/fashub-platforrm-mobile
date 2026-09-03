import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../context/AuthContext';
import { getUserProfile, updateUserProfile, ApiError } from '@fashub/api-client';
import { TextField } from '../../../../components/TextField';
import { SettingsScreenShell } from '../../../../components/settings/SettingsScreenShell';

/**
 * Matches web's Location tab field set exactly (components/shared/LocationInput.tsx):
 * address line 1/2, city, state/province, postal code, district, country.
 * Web drives which of these render (and applies select-vs-text, postal regex
 * hints, state dropdown lists) per-country via a large country-config table
 * (lib/location/countries.ts) — but per that same source, the HTML5
 * required/pattern attributes it produces are never actually enforced
 * (no <form onSubmit>, no validation gate), so the country-driven behavior
 * is cosmetic, not functional. This exposes the same full field set as
 * plain text inputs rather than porting that whole country-config engine —
 * a deliberate simplification, flagged rather than silently done. No map
 * or geolocation picker and no service-area-radius field exist anywhere on
 * web's Location tab to port.
 */
export default function LocationSettingsScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  const load = () => {
    if (!user) return;
    getUserProfile(user.id, user.id).then((profile) => {
      const fields = profile.individualProfile ?? profile.designerProfile ?? profile.tailorProfile;
      setAddressLine1(fields?.addressLine1 ?? '');
      setAddressLine2(fields?.addressLine2 ?? '');
      setCity(fields?.city ?? '');
      setState(fields?.state ?? '');
      setProvince(fields?.province ?? '');
      setDistrict(fields?.district ?? '');
      setPostalCode(fields?.postalCode ?? '');
      setCountry(fields?.country ?? '');
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
        profileData: {
          location: { addressLine1, addressLine2, city, state, province, district, postalCode, country },
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsScreenShell title="Location" loading={loading} error={error} onSave={handleSave} saving={saving}>
      <TextField label="Country" value={country} onChangeText={setCountry} placeholder="United States" />
      <TextField label="Address Line 1" value={addressLine1} onChangeText={setAddressLine1} placeholder="Street address" />
      <TextField label="Address Line 2" value={addressLine2} onChangeText={setAddressLine2} placeholder="Apt, suite, etc. (optional)" />
      <TextField label="City" value={city} onChangeText={setCity} />
      <TextField label="State" value={state} onChangeText={setState} />
      <TextField label="Province (Optional)" value={province} onChangeText={setProvince} />
      <TextField label="District (Optional)" value={district} onChangeText={setDistrict} />
      <TextField label="Postal Code" value={postalCode} onChangeText={setPostalCode} />
    </SettingsScreenShell>
  );
}
