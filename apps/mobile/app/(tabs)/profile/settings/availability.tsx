import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../context/AuthContext';
import { getUserProfile, updateUserProfile, ApiError } from '@fashub/api-client';
import type { WorkingHours, DayOfWeek } from '@fashub/types';
import { TextField } from '../../../../components/TextField';
import { SettingsScreenShell } from '../../../../components/settings/SettingsScreenShell';

const STATUSES = [
  { key: 'available', label: 'Available', color: '#15803D' },
  { key: 'busy', label: 'Busy', color: '#B45309' },
  { key: 'unavailable', label: 'Unavailable', color: '#DC2626' },
] as const;

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const DEFAULT_HOURS = { open: '09:00', close: '17:00' };

/** Web-role-gated (designer/tailor only). Matches app/settings/{role}/page.tsx's
 * Availability tab exactly: a status (available/busy/unavailable), a free-text
 * "time until delivery" field (leadTime for designer, turnaroundTime for
 * tailor — different semantics, not the same field renamed), a static weekly
 * working-hours template (no calendar/date-specific overrides), and designer's
 * maxActiveProjects (rendered on web but never persisted there — fixed here,
 * same as Pricing's fee fields). Web has no buffer-time, advance-notice,
 * max-bookings-per-day, or timezone settings anywhere in this tab — none of
 * that exists to port. Times are plain HH:MM text (matching web's own
 * unvalidated native time input) rather than a native time-picker component. */
export default function AvailabilitySettingsScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [status, setStatus] = useState<string>('available');
  const [timeField, setTimeField] = useState(''); // leadTime or turnaroundTime
  const [maxActiveProjects, setMaxActiveProjects] = useState('');
  const [hours, setHours] = useState<WorkingHours>({});

  const isTailor = user?.role === 'tailor';
  const timeLabel = isTailor ? 'Turnaround Time' : 'Lead Time';
  const timePlaceholder = isTailor ? 'e.g. 1-3 days' : 'e.g. 2-3 weeks';

  const load = () => {
    if (!user) return;
    getUserProfile(user.id, user.id).then((profile) => {
      const fields = profile.designerProfile ?? profile.tailorProfile;
      setStatus(fields?.availabilityStatus ?? 'available');
      setTimeField((isTailor ? fields?.turnaroundTime : fields?.leadTime) ?? '');
      setMaxActiveProjects(fields?.maxActiveProjects != null ? String(fields.maxActiveProjects) : '');
      setHours(
        fields?.workingHours ?? {
          monday: DEFAULT_HOURS,
          tuesday: DEFAULT_HOURS,
          wednesday: DEFAULT_HOURS,
          thursday: DEFAULT_HOURS,
          friday: DEFAULT_HOURS,
          saturday: { open: '10:00', close: '14:00' },
          sunday: null,
        }
      );
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          availability: {
            status,
            workingHours: hours,
            ...(isTailor ? { turnaroundTime: timeField } : { leadTime: timeField, maxActiveProjects: maxActiveProjects ? parseInt(maxActiveProjects, 10) || 5 : 5 }),
          },
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsScreenShell title="Availability" loading={loading} error={error} onSave={handleSave} saving={saving}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>Status</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {STATUSES.map((s) => {
            const selected = status === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setStatus(s.key)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: selected ? s.color + '22' : colors.ivory, borderWidth: 1.5, borderColor: selected ? s.color : colors.line, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: selected ? s.color : colors.inkSoft }}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextField label={timeLabel} value={timeField} onChangeText={setTimeField} placeholder={timePlaceholder} />

      {!isTailor ? (
        <TextField
          label="Max Active Projects"
          value={maxActiveProjects}
          onChangeText={(t) => setMaxActiveProjects(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="5"
        />
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '500', color: colors.ink }}>Working Hours</Text>
        {DAYS.map((d) => {
          const dayHours = hours[d.key];
          return (
            <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 }}>
              <Text style={{ width: 84, fontSize: 12.5, fontWeight: '500', color: colors.ink }}>{d.label}</Text>
              {dayHours ? (
                <>
                  <View style={{ flex: 1 }}>
                    <TextField value={dayHours.open} onChangeText={(t) => setHours((prev) => ({ ...prev, [d.key]: { open: t, close: dayHours.close } }))} placeholder="09:00" />
                  </View>
                  <Text style={{ color: colors.inkSoft }}>–</Text>
                  <View style={{ flex: 1 }}>
                    <TextField value={dayHours.close} onChangeText={(t) => setHours((prev) => ({ ...prev, [d.key]: { open: dayHours.open, close: t } }))} placeholder="17:00" />
                  </View>
                  <Pressable onPress={() => setHours((prev) => ({ ...prev, [d.key]: null }))} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.ivoryDeep }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.oxblood }}>Closed</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => setHours((prev) => ({ ...prev, [d.key]: DEFAULT_HOURS }))}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.ivoryDeep, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.inkSoft }}>Closed · Set Hours</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </SettingsScreenShell>
  );
}
