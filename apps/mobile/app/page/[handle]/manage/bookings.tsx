import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Trash2, Clock, MapPin, Video, Check, X, Copy, Globe, Link2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../../theme/ThemeProvider';
import { violetColors as V } from '@fashub/design-tokens';
import { usePage } from '../../../../hooks/usePage';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/ErrorState';
import { hasPagePermission, CURRENCY_OPTIONS } from '@fashub/types';
import type { PageService, PageAvailabilityRule, PageAvailabilityOverride, PageBooking } from '@fashub/types';
import {
  getPageServices, createPageService, deletePageService,
  getPageAvailabilityRules, createPageAvailabilityRule, deletePageAvailabilityRule,
  getPageAvailabilityOverrides, createPageAvailabilityOverride, deletePageAvailabilityOverride,
  getPageBookings, approvePageBooking, cancelPageBooking, generateBookingFeedUrl,
  getPageTimezone, setPageTimezone, getPageBookingWaitlist, ApiError,
  type PageBookingWaitlistEntry,
} from '@fashub/api-client';

type SubTab = 'requests' | 'services' | 'availability' | 'sync';
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Monday-first display order (matches the reviewed web mock) — underlying
// dayOfWeek values stay 0=Sunday..6=Saturday, this just controls row order.
const DISPLAY_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_START = '10:00';
const DEFAULT_END = '18:00';

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  pending: { bg: V.amberSoft, fg: V.amber },
  confirmed: { bg: V.greenSoft, fg: V.green },
  completed: { bg: V.canvas, fg: V.inkSoft },
  cancelled: { bg: V.pinkSoft, fg: V.pink },
};

/**
 * Mobile admin "Manage booking calendar" — mirrors fashub web's
 * app/page/[handle]/manage/bookings/page.tsx exactly (same 4 sub-tabs,
 * same API surface), in RN idioms.
 */
export default function ManageBookingsScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<SubTab>('requests');

  const { page, viewer, loading, error, reload } = usePage(handle);

  if (loading && !page) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <LoadingState label="Loading…" />
      </SafeAreaView>
    );
  }
  if (error || !page || !viewer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message={error ?? 'Page not found'} onRetry={reload} />
      </SafeAreaView>
    );
  }
  if (!hasPagePermission(viewer.role, 'canManageBookings')) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
        <ErrorState message="You don't have permission to manage bookings for this Page." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={20} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>Booking calendar</Text>
      </View>

      {/* Real tab bar — bottom-border active indicator, same pattern as the
          Page profile screen's own tabs (app/page/[handle]/index.tsx) and
          the Settings hub, rather than a standalone row of pill buttons.
          Fixed-height row with vertically centered labels so 1- and
          2-word tab labels (e.g. "Bookings" vs "Calendar sync") sit on the
          same baseline instead of drifting per label width. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, alignItems: 'center' }}
      >
        {([
          { key: 'requests', label: 'Bookings' },
          { key: 'services', label: 'Services' },
          { key: 'availability', label: 'Availability' },
          { key: 'sync', label: 'Calendar sync' },
        ] as { key: SubTab; label: string }[]).map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{ paddingVertical: 12, marginRight: 22, borderBottomWidth: 2, borderBottomColor: active ? colors.gold : 'transparent' }}
            >
              <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? colors.gold : colors.inkSoft }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 4 }} showsVerticalScrollIndicator={false}>
        {tab === 'requests' ? <BookingsPanel handle={page.handle} /> : null}
        {tab === 'services' ? <ServicesPanel handle={page.handle} /> : null}
        {tab === 'availability' ? <AvailabilityPanel handle={page.handle} /> : null}
        {tab === 'sync' ? <SyncPanel handle={page.handle} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function BookingsPanel({ handle }: { handle: string }) {
  const { colors, spacing } = useTheme();
  const [bookings, setBookings] = useState<PageBooking[] | null>(null);
  const [filter, setFilter] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [waitlist, setWaitlist] = useState<PageBookingWaitlistEntry[] | null>(null);

  const load = () => {
    getPageBookings(handle, filter ? { status: filter } : {}).then(({ bookings: list }) => setBookings(list)).catch(() => setBookings([]));
  };
  useEffect(load, [handle, filter]);

  useEffect(() => {
    getPageBookingWaitlist(handle).then(({ entries }) => setWaitlist(entries)).catch(() => setWaitlist([]));
  }, [handle]);

  const act = async (id: string, action: 'approve' | 'cancel') => {
    setActingId(id);
    try {
      if (action === 'approve') await approvePageBooking(handle, id);
      else await cancelPageBooking(handle, id);
      load();
    } catch {
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
        {['', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
          <Pressable
            key={s}
            onPress={() => setFilter(s)}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: filter === s ? colors.gold : 'transparent', borderWidth: filter === s ? 0 : 1, borderColor: colors.line }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: filter === s ? '#fff' : colors.inkSoft, textTransform: 'capitalize' }}>{s || 'All upcoming'}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {bookings === null ? (
        <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.lg }} />
      ) : bookings.length === 0 ? (
        <Text style={{ fontSize: 13, color: colors.inkSoft, textAlign: 'center', paddingVertical: spacing.lg }}>No bookings here yet.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {bookings.map((b) => {
            const sc = STATUS_COLOR[b.status] || { bg: colors.ivoryDeep, fg: colors.inkSoft };
            return (
              <View key={b.id} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink }}>{b.clientName || b.clientUser?.displayName}</Text>
                      <Pill bg={b.isReturningClient ? V.greenSoft : V.primarySoft} fg={b.isReturningClient ? V.green : V.primaryDeep} label={b.isReturningClient ? 'Returning' : 'New client'} />
                      {b.isVerifiedUser ? <Pill bg={colors.ivoryDeep} fg={colors.inkSoft} label="Verified" /> : null}
                      <Pill bg={sc.bg} fg={sc.fg} label={b.status} />
                    </View>
                    <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 3 }}>
                      {b.service.name} · {new Date(b.startAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </Text>
                    {b.clientEmail ? <Text style={{ fontSize: 11, color: colors.inkSoft }}>{b.clientEmail}</Text> : null}
                    {b.service.locationType === 'virtual' && b.service.meetingLink && (b.status === 'confirmed' || b.status === 'completed') ? (
                      <Text style={{ fontSize: 11, color: colors.gold, marginTop: 2 }} numberOfLines={1}>{b.service.meetingLink}</Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {b.status === 'pending' ? (
                      <Pressable disabled={actingId === b.id} onPress={() => act(b.id, 'approve')} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: V.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={13} color={V.green} />
                      </Pressable>
                    ) : null}
                    {b.status === 'pending' || b.status === 'confirmed' ? (
                      <Pressable disabled={actingId === b.id} onPress={() => act(b.id, 'cancel')} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: V.pinkSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <X size={13} color={V.pink} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Live Availability Status ticket: who joined the waitlist while this
          Page was fully booked — a real capture, not an automated "notify
          when a slot opens" flow (separate, unbuilt scope). */}
      {waitlist && waitlist.length > 0 ? (
        <View style={{ marginTop: 28 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 10 }}>Waitlist ({waitlist.length})</Text>
          <View style={{ gap: 8 }}>
            {waitlist.map((w) => (
              <View key={w.id} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{w.name}</Text>
                <Text style={{ fontSize: 11, color: colors.inkSoft }}>{w.email}{w.phone ? ` · ${w.phone}` : ''}</Text>
                {w.notes ? <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 2, fontStyle: 'italic' }}>"{w.notes}"</Text> : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Pill({ bg, fg, label }: { bg: string; fg: string; label: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontSize: 9.5, fontWeight: '700', color: fg, textTransform: 'capitalize' }}>{label}</Text>
    </View>
  );
}

function ServicesPanel({ handle }: { handle: string }) {
  const { colors, spacing } = useTheme();
  const [services, setServices] = useState<PageService[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [locationType, setLocationType] = useState<'in_studio' | 'virtual'>('in_studio');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [depositAmount, setDepositAmount] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    getPageServices(handle).then(({ services: list }) => setServices(list)).catch(() => setServices([]));
  };
  useEffect(load, [handle]);

  const create = async () => {
    if (!name.trim() || !durationMinutes) {
      setFormError('Name and duration are required');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await createPageService(handle, {
        name, description: description || undefined, durationMinutes: parseInt(durationMinutes, 10), locationType,
        price: price || undefined, currency, depositAmount: depositAmount || undefined,
        meetingLink: locationType === 'virtual' ? meetingLink || undefined : undefined,
      });
      setName(''); setDescription(''); setDurationMinutes('60'); setPrice(''); setCurrency('USD'); setDepositAmount(''); setMeetingLink(''); setShowForm(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not create service');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = (id: string) => {
    Alert.alert('Remove service?', 'Clients will no longer be able to book it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deletePageService(handle, id).then(load) },
    ]);
  };

  return (
    <View>
      {services === null ? (
        <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.lg }} />
      ) : (
        <View style={{ gap: 10, marginBottom: 14 }}>
          {services.filter((s) => s.isActive).map((s) => (
            <View key={s.id} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink }}>{s.name}</Text>
                {s.description ? <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 2 }}>{s.description}</Text> : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Clock size={10} color={colors.inkSoft} /><Text style={{ fontSize: 10.5, color: colors.inkSoft }}>{s.durationMinutes} min</Text></View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{s.locationType === 'virtual' ? <Video size={10} color={colors.inkSoft} /> : <MapPin size={10} color={colors.inkSoft} />}<Text style={{ fontSize: 10.5, color: colors.inkSoft }}>{s.locationType === 'virtual' ? 'Virtual' : 'In studio'}</Text></View>
                  {s.price != null ? <Text style={{ fontSize: 10.5, color: colors.inkSoft }}>{formatMoney(s.price, s.currency)}</Text> : null}
                </View>
                {s.locationType === 'virtual' && s.meetingLink ? (
                  <Text style={{ fontSize: 10.5, color: colors.gold, marginTop: 4 }} numberOfLines={1}>{s.meetingLink}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => deactivate(s.id)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: V.pinkSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={13} color={V.pink} />
              </Pressable>
            </View>
          ))}
          {services.filter((s) => s.isActive).length === 0 ? <Text style={{ fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', paddingVertical: 10 }}>No bookable services yet.</Text> : null}
        </View>
      )}

      {!showForm ? (
        <Pressable onPress={() => setShowForm(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Plus size={14} color="#fff" />
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#fff' }}>Add service</Text>
        </Pressable>
      ) : (
        <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, gap: 10 }}>
          {formError ? <Text style={{ fontSize: 12, color: V.pink }}>{formError}</Text> : null}
          <TextInput placeholder="Service name" value={name} onChangeText={setName} style={inputStyle(colors)} placeholderTextColor={colors.inkSoft} />
          <TextInput placeholder="Description (optional)" value={description} onChangeText={setDescription} multiline style={[inputStyle(colors), { height: 56, textAlignVertical: 'top' }]} placeholderTextColor={colors.inkSoft} />
          <TextInput placeholder="Duration (minutes)" keyboardType="numeric" value={durationMinutes} onChangeText={setDurationMinutes} style={inputStyle(colors)} placeholderTextColor={colors.inkSoft} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setLocationType('in_studio')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: locationType === 'in_studio' ? colors.gold : colors.ivoryDeep, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: locationType === 'in_studio' ? '#fff' : colors.inkSoft }}>In studio</Text>
            </Pressable>
            <Pressable onPress={() => setLocationType('virtual')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: locationType === 'virtual' ? colors.gold : colors.ivoryDeep, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: locationType === 'virtual' ? '#fff' : colors.inkSoft }}>Virtual</Text>
            </Pressable>
          </View>
          <TextInput placeholder="Price (optional)" keyboardType="numeric" value={price} onChangeText={setPrice} style={inputStyle(colors)} placeholderTextColor={colors.inkSoft} />
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkSoft, marginBottom: 6 }}>Currency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {CURRENCY_OPTIONS.map((c) => (
                <Pressable key={c.code} onPress={() => setCurrency(c.code)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: currency === c.code ? colors.gold : colors.ivoryDeep }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: currency === c.code ? '#fff' : colors.inkSoft }}>{c.code}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <TextInput placeholder="Deposit (optional)" keyboardType="numeric" value={depositAmount} onChangeText={setDepositAmount} style={inputStyle(colors)} placeholderTextColor={colors.inkSoft} />
          {locationType === 'virtual' ? (
            <View>
              <TextInput placeholder="Meeting link — Zoom, Google Meet, WhatsApp, etc." value={meetingLink} onChangeText={setMeetingLink} autoCapitalize="none" style={inputStyle(colors)} placeholderTextColor={colors.inkSoft} />
              <Text style={{ fontSize: 10, color: colors.inkSoft, marginTop: 4 }}>Shared with the client once their booking is confirmed, not before.</Text>
            </View>
          ) : null}
          <Text style={{ fontSize: 10.5, color: colors.inkSoft }}>Price and deposit are informational only — no payment is collected through FasHub yet.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable disabled={saving} onPress={create} style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, opacity: saving ? 0.6 : 1 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#fff' }}>{saving ? 'Saving…' : 'Save service'}</Text>
            </Pressable>
            <Pressable onPress={() => setShowForm(false)} style={{ paddingVertical: 10, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkSoft }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

interface DayRow {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

/**
 * Weekly hours: one row per calendar day (Monday-first, matching the
 * reviewed web redesign) — a checkbox toggling whether the Page takes
 * bookings that day, and a single start–end range when enabled. Mirrors
 * fashub web's AvailabilityPanel model exactly, including the "Save" diff
 * logic: PageAvailabilityRule can hold more than one window per day, but
 * nothing in this feature ever exposed that, so this collapses to one row
 * per day and cleans up any extra rules it finds beyond the one shown.
 */
function AvailabilityPanel({ handle }: { handle: string }) {
  const { colors, spacing } = useTheme();
  const [days, setDays] = useState<DayRow[] | null>(null);
  const [ruleIdsByDay, setRuleIdsByDay] = useState<Record<number, string[]>>({});
  const [overrides, setOverrides] = useState<PageAvailabilityOverride[] | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [blackoutDate, setBlackoutDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = () => {
    getPageAvailabilityRules(handle).then(({ rules: list }) => {
      const byDay: Record<number, string[]> = {};
      const rows: DayRow[] = DISPLAY_DAY_ORDER.map((dow) => {
        const dayRules = list.filter((r) => r.dayOfWeek === dow);
        byDay[dow] = dayRules.map((r) => r.id);
        const first = dayRules[0];
        return { dayOfWeek: dow, enabled: !!first, startTime: first?.startTime ?? DEFAULT_START, endTime: first?.endTime ?? DEFAULT_END };
      });
      setRuleIdsByDay(byDay);
      setDays(rows);
    }).catch(() => setDays(DISPLAY_DAY_ORDER.map((dow) => ({ dayOfWeek: dow, enabled: false, startTime: DEFAULT_START, endTime: DEFAULT_END }))));

    getPageAvailabilityOverrides(handle).then(({ overrides: list }) => setOverrides(list)).catch(() => setOverrides([]));

    getPageTimezone(handle).then(({ timezone: tz }) => {
      if (tz) { setTimezone(tz); return; }
      // Not set yet — detect the admin's own device zone and save it, same
      // "detected automatically" behavior as web. Real Intl detection, not
      // a placeholder: the server converts weekly-hours times using this
      // zone from here on (see fashub's lib/pages/availability.ts).
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setPageTimezone(handle, detected).then(({ timezone: saved2 }) => setTimezone(saved2 ?? detected)).catch(() => setTimezone(detected));
    }).catch(() => {});
  };
  useEffect(load, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDay = (dayOfWeek: number, patch: Partial<DayRow>) => {
    setDays((prev) => prev?.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)) ?? null);
  };

  const saveAvailability = async () => {
    if (!days) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const { rules: currentRules } = await getPageAvailabilityRules(handle);
      const currentById = new Map(currentRules.map((r) => [r.id, r]));

      for (const day of days) {
        const existingIds = ruleIdsByDay[day.dayOfWeek] ?? [];

        if (!day.enabled) {
          for (const id of existingIds) await deletePageAvailabilityRule(handle, id);
          continue;
        }

        if (existingIds.length === 1) {
          const current = currentById.get(existingIds[0]);
          if (current && current.startTime === day.startTime && current.endTime === day.endTime) continue;
        }

        for (const id of existingIds) await deletePageAvailabilityRule(handle, id);
        await createPageAvailabilityRule(handle, { dayOfWeek: day.dayOfWeek, startTime: day.startTime, endTime: day.endTime });
      }
      load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save availability');
    } finally {
      setSaving(false);
    }
  };

  const addBlackout = async () => {
    if (!blackoutDate) return;
    try {
      await createPageAvailabilityOverride(handle, { date: blackoutDate, isClosed: true });
      setBlackoutDate('');
      load();
    } catch {
      Alert.alert('Invalid date', 'Use the format YYYY-MM-DD.');
    }
  };

  const removeOverride = (id: string) => deletePageAvailabilityOverride(handle, id).then(load);

  if (!days) {
    return <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.lg }} />;
  }

  return (
    <View>
      {timezone ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: V.primarySoft, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Globe size={14} color={V.primary} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: V.primary }}>Time zone detected automatically</Text>
          </View>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{timezone}</Text>
        </View>
      ) : null}

      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 10 }}>Weekly hours</Text>
      <View style={{ gap: 8, marginBottom: 24 }}>
        {days.map((d) => (
          <View key={d.dayOfWeek} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => updateDay(d.dayOfWeek, { enabled: !d.enabled })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 100 }}
            >
              <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: d.enabled ? colors.gold : colors.line, backgroundColor: d.enabled ? colors.gold : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {d.enabled ? <Check size={12} color="#fff" /> : null}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{DAY_LABELS[d.dayOfWeek]}</Text>
            </Pressable>
            {d.enabled ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 160 }}>
                <TextInput value={d.startTime} onChangeText={(v) => updateDay(d.dayOfWeek, { startTime: v })} style={[inputStyle(colors), { flex: 1 }]} placeholder="10:00" placeholderTextColor={colors.inkSoft} />
                <Text style={{ color: colors.inkSoft }}>–</Text>
                <TextInput value={d.endTime} onChangeText={(v) => updateDay(d.dayOfWeek, { endTime: v })} style={[inputStyle(colors), { flex: 1 }]} placeholder="18:00" placeholderTextColor={colors.inkSoft} />
              </View>
            ) : (
              <Text style={{ fontSize: 12.5, color: colors.inkSoft, flex: 1 }}>Closed</Text>
            )}
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>Blocked dates</Text>
      <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 2, marginBottom: 10 }}>No bookings will be taken on these days</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <TextInput placeholder="YYYY-MM-DD" value={blackoutDate} onChangeText={setBlackoutDate} style={[inputStyle(colors), { flex: 1 }]} placeholderTextColor={colors.inkSoft} />
        <Pressable onPress={addBlackout} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>Block date</Text>
        </Pressable>
      </View>
      {overrides && overrides.filter((o) => o.isClosed).length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {overrides.filter((o) => o.isClosed).map((o) => (
            <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: V.pinkSoft }}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: V.pink }}>{new Date(o.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
              <Pressable onPress={() => removeOverride(o.id)} hitSlop={6}><X size={11} color={V.pink} /></Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {error ? <Text style={{ fontSize: 12, color: V.pink, marginBottom: 8 }}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable disabled={saving} onPress={saveAvailability} style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 11, opacity: saving ? 0.6 : 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{saving ? 'Saving…' : 'Save availability'}</Text>
        </Pressable>
        {saved ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Check size={13} color={V.green} />
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: V.green }}>Saved</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SyncPanel({ handle }: { handle: string }) {
  const { colors, spacing } = useTheme();
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const { feedUrl: url } = await generateBookingFeedUrl(handle);
      setFeedUrl(url);
    } catch {
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!feedUrl) return;
    await Clipboard.setStringAsync(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14 }}>
      <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink, marginBottom: 4 }}>Subscribe from your calendar app</Text>
      <Text style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 14, lineHeight: 17 }}>
        Generate a private link and add it to Google Calendar, Apple Calendar, or Outlook as a "subscribe by URL" calendar — it updates automatically as bookings change. This is a read-only export; FasHub doesn't sync changes back from your calendar app.
      </Text>

      {feedUrl ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.ivoryDeep, borderRadius: 10, padding: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 11, color: colors.ink, flex: 1 }} numberOfLines={1}>{feedUrl}</Text>
          <Pressable onPress={copy} hitSlop={8}>
            {copied ? <Check size={15} color={V.green} /> : <Copy size={15} color={colors.inkSoft} />}
          </Pressable>
        </View>
      ) : null}

      <Pressable disabled={generating} onPress={generate} style={{ alignSelf: 'flex-start', backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, opacity: generating ? 0.6 : 1 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#fff' }}>{generating ? 'Generating…' : feedUrl ? 'Regenerate link' : 'Generate calendar link'}</Text>
      </Pressable>
      {feedUrl ? <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 8 }}>Regenerating invalidates the old link.</Text> : null}
    </View>
  );
}

function inputStyle(colors: ReturnType<typeof useTheme>['colors']) {
  return {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
  } as const;
}
