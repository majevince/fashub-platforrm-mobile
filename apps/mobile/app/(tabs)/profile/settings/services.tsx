import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../context/AuthContext';
import { getUserProfile, updateUserProfile, ApiError } from '@fashub/api-client';
import { TextField } from '../../../../components/TextField';
import { SettingsScreenShell } from '../../../../components/settings/SettingsScreenShell';
import { ToggleRow } from '../../../../components/settings/ToggleRow';

const DESIGNER_SERVICES = [
  { key: 'customDesign', label: 'Custom Design', description: 'One-of-a-kind pieces designed to spec' },
  { key: 'alterations', label: 'Alterations', description: 'Adjusting existing garments' },
  { key: 'consulting', label: 'Design Consulting', description: 'Style and design advice sessions' },
  { key: 'onlineOrders', label: 'Online Orders', description: 'Accept orders without an in-person visit' },
  { key: 'inPersonConsultation', label: 'In-Person Consultation', description: 'Meet clients face to face' },
] as const;

const TAILOR_SERVICES = [
  { key: 'alterations', label: 'Alterations', description: 'Adjusting existing garments' },
  { key: 'customTailoring', label: 'Custom Tailoring', description: 'Made-to-measure garments' },
  { key: 'repairs', label: 'Repairs', description: 'Fixing damaged or worn garments' },
  { key: 'urgentService', label: 'Urgent Service', description: 'Rush turnaround available' },
  { key: 'pickupDelivery', label: 'Pickup & Delivery', description: 'Collect and return garments' },
] as const;

/** Web-role-gated (designer/tailor only). Matches app/settings/{role}/page.tsx's
 * Services tab exactly: NOT itemized service CRUD — a fixed set of boolean
 * "service type" toggles per role, plus a free-text custom-tags list. Web has
 * no name/category/description/duration/images per service; that concept
 * doesn't exist in the data model. */
export default function ServicesSettingsScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [customServices, setCustomServices] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');

  const isTailor = user?.role === 'tailor';
  const list = isTailor ? TAILOR_SERVICES : DESIGNER_SERVICES;

  const load = () => {
    if (!user) return;
    getUserProfile(user.id, user.id).then((profile) => {
      const fields = profile.designerProfile ?? profile.tailorProfile;
      const next: Record<string, boolean> = {};
      for (const s of list) next[s.key] = Boolean((fields as Record<string, unknown> | undefined)?.[s.key]);
      setFlags(next);
      setCustomServices(fields?.customServices ?? []);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };

  useEffect(load, [user]);

  if (!user) return null;

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || customServices.includes(trimmed)) return;
    setCustomServices([...customServices, trimmed]);
    setCustomInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateUserProfile(user.id, {
        role: user.role,
        profileData: { services: { ...flags, customServices } },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsScreenShell title="Services" loading={loading} error={error} onSave={handleSave} saving={saving}>
      <View style={{ gap: 4 }}>
        {list.map((s) => (
          <ToggleRow
            key={s.key}
            label={s.label}
            description={s.description}
            value={!!flags[s.key]}
            onValueChange={(v) => setFlags((prev) => ({ ...prev, [s.key]: v }))}
          />
        ))}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>Custom Services</Text>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <View style={{ flex: 1 }}>
            <TextField value={customInput} onChangeText={setCustomInput} placeholder="Add a custom service…" onSubmitEditing={addCustom} returnKeyType="done" />
          </View>
          <Pressable onPress={addCustom} style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={18} color={colors.ivory} />
          </Pressable>
        </View>
        {customServices.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {customServices.map((item, i) => (
              <View key={`${item}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.ivoryDeep, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.ink }}>{item}</Text>
                <Pressable onPress={() => setCustomServices(customServices.filter((_, idx) => idx !== i))} hitSlop={6}>
                  <X size={12} color={colors.inkSoft} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </SettingsScreenShell>
  );
}
