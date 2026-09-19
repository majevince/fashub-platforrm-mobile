import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { X, Plus } from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { createEvent, uploadFiles, ApiError, resolveMediaUrl } from '@fashub/api-client';
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from '@fashub/types';
import { toUploadableFile } from '../../lib/uploadableFile';
import { parseHashtags } from '../../lib/hashtags';
import { COUNTRIES } from '../../lib/countries';
import { HashtagTextInput } from '../portfolio/HashtagTextInput';
import { SelectRow, OptionPickerModal } from '../SelectRow';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const TIME_OPTIONS = (() => {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      opts.push(`${displayHour}:${m.toString().padStart(2, '0')} ${period}`);
    }
  }
  return opts;
})();

function to24Hour(label: string): string {
  const [time, period] = label.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

const CATEGORY_CHIPS = EVENT_CATEGORIES.map((c) => ({ value: c, label: EVENT_CATEGORY_LABELS[c] }));

const MIN_EVENT_DURATION_MS = 60 * 60 * 1000; // 1 hour — confirmed default gap
const AGENDA_STEP_MINUTES = 15;

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Combines a newly-picked calendar date with the previously-set time-of-day (or midnight, if none yet). */
function mergeDatePart(base: Date | null, dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number);
  const merged = new Date(y, m - 1, d);
  if (base) merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
  else merged.setHours(0, 0, 0, 0);
  return merged;
}

/** Combines a newly-picked "h:mm AM/PM" time label with the previously-set calendar date (or today, if none yet). */
function mergeTimePart(base: Date | null, timeLabel: string): Date {
  const merged = base ? new Date(base) : new Date();
  const [h, m] = to24Hour(timeLabel).split(':').map(Number);
  merged.setHours(h, m, 0, 0);
  return merged;
}

/** 15-minute time-of-day slots between two Dates — mirrors web's identical helper (separate repos, can't share the function directly). */
function buildAgendaSlots(start: Date, end: Date): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = [];
  const cursor = new Date(start);
  cursor.setSeconds(0, 0);
  const remainder = cursor.getMinutes() % AGENDA_STEP_MINUTES;
  if (remainder !== 0) cursor.setMinutes(cursor.getMinutes() + (AGENDA_STEP_MINUTES - remainder));
  while (cursor <= end) {
    slots.push({
      value: cursor.toISOString(),
      label: cursor.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    });
    cursor.setMinutes(cursor.getMinutes() + AGENDA_STEP_MINUTES);
  }
  return slots;
}

/**
 * Native-adapted port of web's redesigned CreateEventForm — same field set
 * and structure (photo strip with tap-to-set-cover, live hashtag detection,
 * agenda rows, location tabs, ticket/audience chips), not a scaled-down
 * form. RN has no native date/time picker without a dev-client native
 * module (this app's other native-module-avoidance precedent is the
 * WebView+Leaflet map, chosen for the same reason) — dates/times are
 * pick-from-a-list via the same SelectRow/OptionPickerModal pattern
 * already proven for Projects, not raw text entry.
 */
export function CreateEventModal({ visible, onClose, onCreated }: Props) {
  const { colors, fontFamilies } = useTheme();
  // Modal is its own native presentation surface, unreached by any
  // SafeAreaView/SafeAreaProvider further up the tree (same root cause
  // documented in PhotoLightbox.tsx/StoryViewer.tsx) — insets read
  // directly and added to the existing base padding instead.
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  // Combined date+time per boundary, matching web's identical model — makes
  // the Start/End comparison and auto-adjustment a plain Date comparison.
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [endDateTime, setEndDateTime] = useState<Date | null>(null);
  const [dateError, setDateError] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('United States');
  const [virtualLink, setVirtualLink] = useState('');
  const [capacity, setCapacity] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [dresscode, setDresscode] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'invite_only'>('public');
  // `time` holds an ISO slot value (a buildAgendaSlots() value) while
  // editing, converted to a friendly label at submit time.
  const [agendaItems, setAgendaItems] = useState<{ time: string; description: string }[]>([]);

  const [coverImage, setCoverImage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Keyboard events, not KeyboardAvoidingView — this Modal renders in its
  // own native window on Android, which KeyboardAvoidingView's automatic
  // resize/pan behavior doesn't reliably reach (same root cause already
  // documented and fixed in components/feed/CommentsSheet.tsx). This form
  // didn't exist yet when that fix was applied elsewhere — same gap, same fix.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const [picker, setPicker] = useState<'country' | 'startDate' | 'startTime' | 'endDate' | 'endTime' | null>(null);
  const [agendaPickerIdx, setAgendaPickerIdx] = useState<number | null>(null);

  // Auto-adjust End forward when Start moves past it, matching web exactly.
  useEffect(() => {
    if (startDateTime && endDateTime && endDateTime.getTime() < startDateTime.getTime()) {
      setEndDateTime(new Date(startDateTime.getTime() + MIN_EVENT_DURATION_MS));
    }
  }, [startDateTime, endDateTime]);

  const agendaSlots = useMemo(
    () => (startDateTime && endDateTime ? buildAgendaSlots(startDateTime, endDateTime) : []),
    [startDateTime, endDateTime]
  );

  const detectedTags = useMemo(() => parseHashtags(description), [description]);
  const countryCode = useMemo(() => COUNTRIES.find((c) => c.name === country)?.code ?? 'US', [country]);

  const reset = () => {
    setTitle(''); setDescription(''); setCategory(''); setStartDateTime(null); setEndDateTime(null);
    setIsVirtual(false); setVenueName(''); setCity(''); setState('');
    setCountry('United States'); setVirtualLink(''); setCapacity(''); setIsFree(true); setPrice('');
    setDresscode(''); setVisibility('public'); setAgendaItems([]); setCoverImage(''); setImages([]);
    setError(''); setDateError('');
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsMultipleSelection: true });
    if (result.canceled || !result.assets.length) return;
    setUploading(true);
    try {
      const uploaded = await uploadFiles(result.assets.map((a) => toUploadableFile(a.uri)), 'events');
      setImages((prev) => [...prev, ...uploaded.urls]);
      if (!coverImage && uploaded.urls.length) setCoverImage(uploaded.urls[0]);
    } catch {
      setError('Some photos failed to upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    const removed = images[idx];
    const next = images.filter((_, i) => i !== idx);
    setImages(next);
    if (removed === coverImage) setCoverImage(next[0] ?? '');
  };

  const addAgendaItem = () => setAgendaItems((prev) => [...prev, { time: '', description: '' }]);
  const updateAgendaItem = (idx: number, field: 'time' | 'description', value: string) => {
    setAgendaItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };
  const removeAgendaItem = (idx: number) => setAgendaItems((prev) => prev.filter((_, i) => i !== idx));

  const canSubmit = title.trim().length >= 3 && category !== '' && startDateTime !== null && (isVirtual || city.trim().length > 0) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !user || !startDateTime) return;

    // Defense in depth — the picker's minDate/auto-adjust effect above
    // should make this unreachable, but never trust client state alone.
    if (endDateTime && endDateTime.getTime() < startDateTime.getTime()) {
      setDateError('End must be after Start.');
      return;
    }
    setDateError('');
    setSubmitting(true);
    setError('');
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        shortDescription: description.trim().slice(0, 150) || undefined,
        category,
        customCategory: category === 'other' ? customCategory.trim() || undefined : undefined,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime ? endDateTime.toISOString() : undefined,
        isVirtual,
        venueName: venueName || undefined,
        address: address || undefined,
        city: city || (isVirtual ? 'Online' : ''),
        state: state || undefined,
        country,
        countryCode,
        virtualLink: virtualLink || undefined,
        image: coverImage || undefined,
        images,
        videos: [],
        organizerId: user.id,
        organizerName: user.displayName,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        isFree,
        price: !isFree && price ? parseFloat(price) : undefined,
        currency: 'USD',
        tags: detectedTags,
        dresscode: dresscode || undefined,
        // Stored `time` is the friendly label, matching what the event
        // detail screen renders verbatim — agendaItems.time holds the ISO
        // slot value only while editing, converted back here.
        agenda: agendaItems.length > 0
          ? agendaItems
              .filter((a) => a.time.trim() && a.description.trim())
              .map((a) => ({
                time: agendaSlots.find((s) => s.value === a.time)?.label ?? a.time,
                description: a.description,
              }))
          : undefined,
        visibility,
      });
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  const softInput = { backgroundColor: colors.ivory, borderRadius: 14, padding: 13, fontFamily: fontFamilies.sans, fontSize: 14, color: colors.ink };
  const fieldLabel = { fontFamily: fontFamilies.sansBold, fontSize: 12.5, color: colors.inkSoft, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.3 };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: colors.paper, marginBottom: keyboardHeight }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14 + insets.top, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <Pressable onPress={handleClose} hitSlop={8}><Text style={{ fontSize: 18, color: colors.inkSoft }}>←</Text></Pressable>
          <Text style={{ fontFamily: fontFamilies.serif, fontSize: 18, color: colors.ink }}>Create Event</Text>
          <Pressable onPress={handleClose} hitSlop={8}><X size={18} color={colors.inkSoft} /></Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 18 }} keyboardShouldPersistTaps="handled">
          {/* Event Photos */}
          <View>
            <Text style={fieldLabel}>Event Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {images.map((img, idx) => (
                <Pressable key={img + idx} onPress={() => setCoverImage(img)} style={{ width: 150, height: 150, borderRadius: 10, overflow: 'hidden' }}>
                  <Image source={{ uri: resolveMediaUrl(img) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  {img === coverImage ? (
                    <View style={{ position: 'absolute', bottom: 5, left: 5, backgroundColor: colors.gold, borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9.5, fontFamily: fontFamilies.sansBold, color: '#fff' }}>Cover</Text>
                    </View>
                  ) : null}
                  <Pressable onPress={() => removeImage(idx)} hitSlop={6} style={{ position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(20,18,16,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={11} color="#fff" />
                  </Pressable>
                </Pressable>
              ))}
              <Pressable onPress={pickPhotos} style={{ width: 150, height: 150, borderRadius: 10, backgroundColor: colors.ivory, borderWidth: 1.5, borderColor: colors.gold, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
                {uploading ? <ActivityIndicator color={colors.gold} /> : (
                  <>
                    <Plus size={20} color={colors.gold} />
                    <Text style={{ fontSize: 10.5, fontFamily: fontFamilies.sansBold, color: colors.gold, marginTop: 2 }}>Add</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
            <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 8, fontFamily: fontFamilies.sans }}>Upload as many photos as you'd like — tap any one to set it as your event's cover.</Text>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Event name"
            placeholderTextColor={colors.inkSoft}
            style={{ fontFamily: fontFamilies.serif, fontSize: 20, color: colors.ink, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.line }}
          />

          {/* Event Type */}
          <View>
            <Text style={fieldLabel}>Event Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORY_CHIPS.map((c) => {
                const active = category === c.value;
                return (
                  <Pressable
                    key={c.value}
                    onPress={() => setCategory(c.value)}
                    style={{ borderWidth: 1, borderColor: active ? colors.gold : colors.line, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: active ? colors.ivory : 'transparent' }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: fontFamilies.sansSemiBold, color: active ? colors.oxblood : colors.inkSoft }}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {category === 'other' ? (
              <TextInput
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="Custom event type..."
                placeholderTextColor={colors.inkSoft}
                style={{ ...softInput, marginTop: 10 }}
              />
            ) : null}
          </View>

          {/* Description with hashtag detection */}
          <View>
            <Text style={fieldLabel}>Description</Text>
            <HashtagTextInput value={description} onChange={setDescription} placeholder="Describe your event…" />
            {detectedTags.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {detectedTags.map((t) => (
                  <View key={t} style={{ backgroundColor: colors.ivory, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, fontFamily: fontFamilies.sansBold, color: colors.oxblood }}>#{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 8, fontFamily: fontFamilies.sans }}>Add a # anywhere in your text — it's tagged automatically, no separate tag field needed.</Text>
          </View>

          {/* Agenda */}
          <View>
            <Text style={fieldLabel}>Agenda (optional)</Text>
            {agendaSlots.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 10, fontFamily: fontFamilies.sans }}>Set your event's Start and End date/time below to build the agenda time options.</Text>
            ) : null}
            {agendaItems.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <View style={{ width: 130 }}>
                  <SelectRow
                    label={agendaSlots.find((s) => s.value === item.time)?.label ?? (agendaSlots.length === 0 ? 'Set times first' : 'Select')}
                    onPress={() => agendaSlots.length > 0 && setAgendaPickerIdx(idx)}
                  />
                </View>
                <TextInput value={item.description} onChangeText={(v) => updateAgendaItem(idx, 'description', v)} placeholder="Doors open & registration" placeholderTextColor={colors.inkSoft} style={{ ...softInput, flex: 1 }} />
                <Pressable onPress={() => removeAgendaItem(idx)} hitSlop={8} style={{ justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: colors.inkSoft }}>✕</Text>
                </Pressable>
                <OptionPickerModal
                  visible={agendaPickerIdx === idx}
                  title="Agenda time"
                  options={agendaSlots.map((s) => s.label)}
                  selected={agendaSlots.find((s) => s.value === item.time)?.label ?? ''}
                  onSelect={(label) => { updateAgendaItem(idx, 'time', agendaSlots.find((s) => s.label === label)?.value ?? ''); setAgendaPickerIdx(null); }}
                  onClose={() => setAgendaPickerIdx(null)}
                />
              </View>
            ))}
            <Pressable onPress={addAgendaItem} style={{ alignSelf: 'flex-start', backgroundColor: colors.ivory, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 12.5, color: colors.oxblood }}>+ Add agenda item</Text>
            </Pressable>
          </View>

          {/* Date/Time — Calendar grid for date, scrollable list for time,
              matching web + LinkedIn's pattern. End's calendar minDate is
              constrained to Start (the auto-adjust effect + handleSubmit's
              check are the defense-in-depth backstops). */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={fieldLabel}>Start date</Text>
              <SelectRow label={startDateTime ? startDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select'} onPress={() => setPicker('startDate')} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fieldLabel}>Start time</Text>
              <SelectRow label={startDateTime ? startDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Select'} onPress={() => setPicker('startTime')} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={fieldLabel}>End date</Text>
              <SelectRow label={endDateTime ? endDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select'} onPress={() => setPicker('endDate')} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fieldLabel}>End time</Text>
              <SelectRow label={endDateTime ? endDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Select'} onPress={() => setPicker('endTime')} />
            </View>
          </View>
          {dateError ? <Text style={{ color: colors.oxblood, fontSize: 12.5, fontFamily: fontFamilies.sans, marginTop: -8 }}>{dateError}</Text> : null}

          <View style={{ height: 1, backgroundColor: colors.line }} />

          {/* Location tabs */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line }}>
            {(['in_person', 'virtual'] as const).map((tab) => {
              const active = (tab === 'virtual') === isVirtual;
              return (
                <Pressable key={tab} onPress={() => setIsVirtual(tab === 'virtual')} style={{ paddingVertical: 9, marginRight: 20, borderBottomWidth: 2, borderBottomColor: active ? colors.gold : 'transparent' }}>
                  <Text style={{ fontSize: 13.5, fontFamily: fontFamilies.sansSemiBold, color: active ? colors.oxblood : colors.inkSoft }}>{tab === 'in_person' ? 'In person' : 'Virtual'}</Text>
                </Pressable>
              );
            })}
          </View>

          {isVirtual ? (
            <View>
              <Text style={fieldLabel}>Virtual link</Text>
              <TextInput value={virtualLink} onChangeText={setVirtualLink} placeholder="Zoom, Google Meet, etc." placeholderTextColor={colors.inkSoft} style={softInput} />
            </View>
          ) : (
            <>
              <View>
                <Text style={fieldLabel}>Venue name</Text>
                <TextInput value={venueName} onChangeText={setVenueName} placeholder="e.g. Civic Center Hall" placeholderTextColor={colors.inkSoft} style={softInput} />
              </View>
              <View>
                <Text style={fieldLabel}>Address (optional)</Text>
                <TextInput value={address} onChangeText={setAddress} placeholder="e.g. 123 Main St" placeholderTextColor={colors.inkSoft} style={softInput} />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.inkSoft} style={{ ...softInput, flex: 1 }} />
                <TextInput value={state} onChangeText={setState} placeholder="State" placeholderTextColor={colors.inkSoft} style={{ ...softInput, flex: 1 }} />
              </View>
              <View>
                <Text style={fieldLabel}>Country</Text>
                <SelectRow label={country} onPress={() => setPicker('country')} />
              </View>
            </>
          )}

          <View style={{ height: 1, backgroundColor: colors.line }} />

          {/* Tickets */}
          <View>
            <Text style={fieldLabel}>Tickets</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['free', 'paid'] as const).map((t) => {
                const active = (t === 'free') === isFree;
                return (
                  <Pressable key={t} onPress={() => setIsFree(t === 'free')} style={{ borderWidth: 1, borderColor: active ? colors.gold : colors.line, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: active ? colors.ivory : 'transparent' }}>
                    <Text style={{ fontSize: 13, fontFamily: fontFamilies.sansSemiBold, color: active ? colors.oxblood : colors.inkSoft, textTransform: 'capitalize' }}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>
            {!isFree ? (
              <TextInput value={price} onChangeText={setPrice} placeholder="Price (USD)" placeholderTextColor={colors.inkSoft} keyboardType="decimal-pad" style={{ ...softInput, marginTop: 10 }} />
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={fieldLabel}>Capacity</Text>
              <TextInput value={capacity} onChangeText={setCapacity} placeholder="Max attendees" placeholderTextColor={colors.inkSoft} keyboardType="number-pad" style={softInput} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fieldLabel}>Dress code</Text>
              <TextInput value={dresscode} onChangeText={setDresscode} placeholder="e.g. Smart Casual" placeholderTextColor={colors.inkSoft} style={softInput} />
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.line }} />

          {/* Audience */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontFamily: fontFamilies.sansSemiBold, color: colors.ink }}>Who can see this event?</Text>
              <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 1 }}>Anyone on FaSHub, or invite-only</Text>
            </View>
            <Pressable
              onPress={() => setVisibility(visibility === 'public' ? 'invite_only' : 'public')}
              style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 13, fontFamily: fontFamilies.sansSemiBold, color: colors.ink }}>
                {visibility === 'public' ? '🌐 Public' : '🔒 Invite only'}
              </Text>
            </Pressable>
          </View>

          {error ? <Text style={{ color: colors.oxblood, fontSize: 12.5, fontFamily: fontFamilies.sans }}>{error}</Text> : null}
        </ScrollView>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Pressable onPress={handleClose}>
            <Text style={{ fontFamily: fontFamilies.sansSemiBold, fontSize: 14, color: colors.inkSoft, paddingVertical: 10, paddingHorizontal: 8 }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={{ backgroundColor: colors.gold, borderRadius: 100, paddingVertical: 12, paddingHorizontal: 26, opacity: canSubmit ? 1 : 0.5, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            {submitting ? <ActivityIndicator color="#fff" size="small" /> : null}
            <Text style={{ color: '#fff', fontFamily: fontFamilies.sansBold, fontSize: 14 }}>{submitting ? 'Creating…' : 'Create event'}</Text>
          </Pressable>
        </View>
      </View>

      <OptionPickerModal visible={picker === 'country'} title="Country" options={COUNTRIES.map((c) => c.name)} selected={country} onSelect={(v) => { setCountry(v); setPicker(null); }} onClose={() => setPicker(null)} />
      <CalendarPickerModal
        visible={picker === 'startDate'}
        title="Start date"
        selectedDate={startDateTime ? toDateString(startDateTime) : undefined}
        minDate={toDateString(new Date())}
        onSelect={(dateString) => { setStartDateTime(mergeDatePart(startDateTime, dateString)); setPicker(null); }}
        onClose={() => setPicker(null)}
      />
      <CalendarPickerModal
        visible={picker === 'endDate'}
        title="End date"
        selectedDate={endDateTime ? toDateString(endDateTime) : undefined}
        minDate={toDateString(startDateTime ?? new Date())}
        onSelect={(dateString) => { setEndDateTime(mergeDatePart(endDateTime, dateString)); setPicker(null); }}
        onClose={() => setPicker(null)}
      />
      <OptionPickerModal visible={picker === 'startTime'} title="Start time" options={TIME_OPTIONS} selected={startDateTime ? startDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''} onSelect={(v) => { setStartDateTime(mergeTimePart(startDateTime, v)); setPicker(null); }} onClose={() => setPicker(null)} />
      <OptionPickerModal visible={picker === 'endTime'} title="End time" options={TIME_OPTIONS} selected={endDateTime ? endDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''} onSelect={(v) => { setEndDateTime(mergeTimePart(endDateTime, v)); setPicker(null); }} onClose={() => setPicker(null)} />
    </Modal>
  );
}

/** Calendar-grid date picker in the same bottom-sheet shell as OptionPickerModal — react-native-calendars is pure JS (no native linking), consistent with this app's avoidance of native modules that would need a dev-client rebuild. */
function CalendarPickerModal({
  visible, title, selectedDate, minDate, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  selectedDate?: string;
  minDate?: string;
  onSelect: (dateString: string) => void;
  onClose: () => void;
}) {
  const { colors, fontFamilies } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,18,16,0.4)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable style={{ backgroundColor: colors.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text style={{ fontFamily: fontFamilies.sansBold, fontSize: 15, color: colors.ink }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}><X size={18} color={colors.inkSoft} /></Pressable>
          </View>
          <Calendar
            current={selectedDate ?? minDate}
            minDate={minDate}
            markedDates={selectedDate ? { [selectedDate]: { selected: true, selectedColor: colors.gold } } : {}}
            onDayPress={(day: DateData) => onSelect(day.dateString)}
            theme={{
              todayTextColor: colors.gold,
              arrowColor: colors.gold,
              selectedDayBackgroundColor: colors.gold,
              textDayFontFamily: fontFamilies.sans,
              textMonthFontFamily: fontFamilies.sansBold,
              textDayHeaderFontFamily: fontFamilies.sansSemiBold,
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
