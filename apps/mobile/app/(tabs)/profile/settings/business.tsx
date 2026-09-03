import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../context/AuthContext';
import { getUserProfile, updateUserProfile, ApiError } from '@fashub/api-client';
import { TextField } from '../../../../components/TextField';
import { SettingsScreenShell } from '../../../../components/settings/SettingsScreenShell';

const SPECIALTIES: Record<'designer' | 'tailor', string[]> = {
  designer: ['Wedding Dresses', 'Business Suits', 'Evening Gowns', 'Casual Wear', 'Streetwear', 'Formal Wear', 'Custom Tailoring', 'Haute Couture'],
  tailor: ['Suit Alterations', 'Dress Hemming', 'Custom Fit', 'Repairs', 'Wedding Alterations', 'Formal Wear', 'Denim Alterations', 'Leather Work'],
};

/** Web-role-gated (designer/tailor only — this screen is never linked to for
 * individual accounts). Matches app/settings/{designer,tailor}/page.tsx's
 * Business Info tab: years of experience, a fixed specialty checklist
 * (different options per role), certifications (free-text list),
 * and awards (designer only — no `awards` column exists on TailorProfile). */
export default function BusinessInfoSettingsScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [awards, setAwards] = useState<string[]>([]);
  const [certInput, setCertInput] = useState('');
  const [awardInput, setAwardInput] = useState('');

  const role = user?.role === 'tailor' ? 'tailor' : 'designer';
  const isDesigner = user?.role === 'designer';

  const load = () => {
    if (!user) return;
    getUserProfile(user.id, user.id).then((profile) => {
      const fields = profile.designerProfile ?? profile.tailorProfile;
      setYearsOfExperience(fields?.yearsOfExperience != null ? String(fields.yearsOfExperience) : '');
      setSpecialties(fields?.specialties ?? []);
      setCertifications(fields?.certifications ?? []);
      setAwards(fields?.awards ?? []);
      setLoading(false);
    });
  };

  useEffect(load, [user]);

  if (!user) return null;

  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const addTag = (list: string[], setList: (v: string[]) => void, value: string, clear: () => void) => {
    const trimmed = value.trim();
    if (!trimmed || list.includes(trimmed)) return;
    setList([...list, trimmed]);
    clear();
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateUserProfile(user.id, {
        role: user.role,
        profileData: {
          yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) || 0 : 0,
          specialties,
          certifications,
          ...(isDesigner ? { awards } : {}),
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const tagList = (label: string, items: string[], input: string, setInput: (v: string) => void, onAdd: () => void, onRemove: (i: number) => void) => (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <View style={{ flex: 1 }}>
          <TextField value={input} onChangeText={setInput} placeholder={`Add ${label.toLowerCase()}…`} onSubmitEditing={onAdd} returnKeyType="done" />
        </View>
        <Pressable onPress={onAdd} style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={18} color={colors.ivory} />
        </Pressable>
      </View>
      {items.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {items.map((item, i) => (
            <View key={`${item}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.ink }}>{item}</Text>
              <Pressable onPress={() => onRemove(i)} hitSlop={6}>
                <X size={12} color={colors.inkSoft} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <SettingsScreenShell title="Business Info" loading={loading} error={error} onSave={handleSave} saving={saving}>
      <TextField
        label="Years of Experience"
        value={yearsOfExperience}
        onChangeText={(t) => setYearsOfExperience(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder="0"
      />

      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>Specialties</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SPECIALTIES[role].map((s) => {
            const selected = specialties.includes(s);
            return (
              <Pressable
                key={s}
                onPress={() => toggleSpecialty(s)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: selected ? colors.gold : colors.ivory,
                  borderWidth: 1,
                  borderColor: selected ? colors.gold : colors.line,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? colors.ivory : colors.inkSoft }}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {tagList('Certifications', certifications, certInput, setCertInput, () => addTag(certifications, setCertifications, certInput, () => setCertInput('')), (i) => setCertifications(certifications.filter((_, idx) => idx !== i)))}

      {isDesigner
        ? tagList('Awards & Recognition', awards, awardInput, setAwardInput, () => addTag(awards, setAwards, awardInput, () => setAwardInput('')), (i) => setAwards(awards.filter((_, idx) => idx !== i)))
        : null}
    </SettingsScreenShell>
  );
}
