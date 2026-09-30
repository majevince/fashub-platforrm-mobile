import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView, ActivityIndicator, Linking, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, Clock, MapPin, Video, Check, CalendarDays } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { violetColors as V } from '@fashub/design-tokens';
import {
  getPageServices, getPageAvailabilityRules, getPageAvailabilityOverrides, getPageAvailableSlots,
  createPageBooking, confirmPageBooking, releasePageBooking, ApiError,
} from '@fashub/api-client';
import type { PageService, AvailableSlot, PageAvailabilityRule, PageAvailabilityOverride } from '@fashub/types';
import { CalendarPickerModal } from '../CalendarPickerModal';

function formatMoney(amount: number, currency: string): string {
  // currency defaults to 'USD' server-side (schema.prisma PageService.currency),
  // but Intl.NumberFormat throws a RangeError on an undefined/empty currency
  // code rather than falling back gracefully — a bare string interpolation
  // wouldn't survive that, so this stays explicit.
  return new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount);
}

// Local calendar-date components, not toISOString() — that converts to UTC
// first, which shifts the calendar date for anyone west/east of UTC. A bare
// "YYYY-MM-DD" is what the availability endpoints expect and parse as UTC
// midnight of THAT SAME calendar date, so this stays correct end to end.
function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MAX_DAYS_AHEAD = 90;

type Step = 1 | 2 | 3 | 'done';

/**
 * The 3-step "Book a Fitting" modal — service -> date/time -> contact +
 * confirm. Step 2's date field opens CalendarPickerModal, the exact same
 * react-native-calendars component the Events feature's date fields use
 * (components/feed/CreateEventModal.tsx) — not a re-implementation of it —
 * with dates outside the Page's configured availability (no weekly rule for
 * that day of week, or a closed override) disabled directly in the grid.
 * The time-slot grid stays a dedicated real-availability picker fed by the
 * server's actual open windows minus existing bookings.
 *
 * Picking a slot creates a `held` row immediately (DB partial unique index
 * makes this everyone-else-can't-double-book, not just a UI convention —
 * see fashub's lib/pages/availability.ts), so it's unavailable to every
 * other visitor right away. Backing out before finishing releases that hold
 * explicitly so it reopens immediately rather than sitting dead for the
 * rest of the hold window.
 *
 * Keyboard handling is driven by explicit Keyboard events, not
 * KeyboardAvoidingView — same reasoning as CommentsSheet/CreateEventModal/
 * CreatePostModal/InquiryComposer: this is a Modal, which renders in its
 * own native window on Android, and KeyboardAvoidingView's automatic
 * resize/pan behavior doesn't reliably reach into that window. Step 3's
 * contact fields (and the notes textarea specifically) stayed hidden behind
 * the keyboard regardless of `behavior` until this was added — shifting the
 * whole sheet up by the keyboard's own reported height sidesteps that.
 */
export function BookingModal({
  visible,
  pageHandle,
  pageName,
  initialServiceId,
  onClose,
}: {
  visible: boolean;
  pageHandle: string;
  pageName: string;
  initialServiceId?: string;
  onClose: () => void;
}) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>(1);
  const [services, setServices] = useState<PageService[] | null>(null);
  const [selectedService, setSelectedService] = useState<PageService | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [rules, setRules] = useState<PageAvailabilityRule[] | null>(null);
  const [overrides, setOverrides] = useState<PageAvailabilityOverride[] | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [slots, setSlots] = useState<AvailableSlot[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [finalStatus, setFinalStatus] = useState<'confirmed' | 'pending' | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Cleanup-effect friendly refs — see the unmount effect below.
  const bookingIdRef = useRef<string | null>(null);
  const bookingConfirmedRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setStep(1);
    setError('');
    setSelectedService(null);
    setSelectedSlot(null);
    setBookingId(null);
    bookingIdRef.current = null;
    bookingConfirmedRef.current = false;
    setFinalStatus(null);
    setClientName(''); setClientEmail(''); setClientPhone(''); setNotes('');

    getPageServices(pageHandle)
      .then(({ services: list }) => {
        setServices(list);
        if (initialServiceId) {
          const svc = list.find((s) => s.id === initialServiceId);
          if (svc) {
            setSelectedService(svc);
            setStep(2);
          }
        }
      })
      .catch(() => setServices([]));

    getPageAvailabilityRules(pageHandle).then(({ rules: list }) => setRules(list)).catch(() => setRules([]));
    const today = toLocalISODate(new Date());
    const horizon = toLocalISODate(new Date(Date.now() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000));
    getPageAvailabilityOverrides(pageHandle, { from: today, to: horizon }).then(({ overrides: list }) => setOverrides(list)).catch(() => setOverrides([]));
  }, [visible, pageHandle, initialServiceId]);

  useEffect(() => {
    if (step !== 2 || !selectedService) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    getPageAvailableSlots(pageHandle, selectedService.id, toLocalISODate(selectedDate))
      .then(({ slots: list }) => setSlots(list))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [step, selectedService, selectedDate, pageHandle]);

  // Release an abandoned hold when the modal disappears (closed, or the
  // parent stops rendering it) without confirming.
  useEffect(() => {
    if (visible) return;
    if (bookingIdRef.current && !bookingConfirmedRef.current) {
      releaseHold(bookingIdRef.current);
      bookingIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const releaseHold = (id: string) => {
    releasePageBooking(pageHandle, id).catch(() => {});
  };

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

  // A day-of-week check is timezone-safe here: a calendar date's weekday
  // doesn't change with timezone, only its instant does, and both this and
  // the server (which parses the plain YYYY-MM-DD this component sends)
  // agree on the SAME calendar date.
  const disabledDates: string[] = React.useMemo(() => {
    if (rules === null || overrides === null) return [];
    const out: string[] = [];
    const overrideByDate = new Map(overrides.map((o) => [o.date.slice(0, 10), o]));
    for (let i = 0; i < MAX_DAYS_AHEAD; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const key = toLocalISODate(d);
      const override = overrideByDate.get(key);
      const available = override ? !override.isClosed : rules.some((r) => r.dayOfWeek === d.getDay());
      if (!available) out.push(key);
    }
    return out;
  }, [rules, overrides]);

  const pickService = (s: PageService) => {
    setSelectedService(s);
    setStep(2);
  };

  const pickSlot = async (slot: AvailableSlot) => {
    if (!selectedService) return;
    setError('');
    setSubmitting(true);
    try {
      const { booking } = await createPageBooking(pageHandle, { serviceId: selectedService.id, startAt: slot.startAt });
      setBookingId(booking.id);
      bookingIdRef.current = booking.id;
      setSelectedSlot(slot);
      setStep(3);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That slot is no longer available');
      setSlots((prev) => prev?.filter((s) => s.startAt !== slot.startAt) ?? null);
    } finally {
      setSubmitting(false);
    }
  };

  const confirm = async () => {
    if (!bookingId) return;
    if (!clientName.trim() || !clientEmail.trim()) {
      setError('Name and email are required');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const { booking } = await confirmPageBooking(pageHandle, bookingId, {
        clientName, clientEmail, clientPhone: clientPhone || undefined, notes: notes || undefined,
      });
      bookingConfirmedRef.current = true;
      setFinalStatus(booking.status === 'confirmed' ? 'confirmed' : 'pending');
      setStep('done');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not confirm this booking');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    setError('');
    if (step === 3) {
      // Give up the held slot right away rather than letting it sit dead
      // for the rest of the hold window.
      if (bookingId) releaseHold(bookingId);
      setBookingId(null);
      bookingIdRef.current = null;
      setSelectedSlot(null);
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleClose = () => {
    if (bookingId && !bookingConfirmedRef.current) {
      releaseHold(bookingId);
      bookingIdRef.current = null;
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,15,20,0.55)' }}>
        <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%', paddingBottom: insets.bottom + spacing.md, marginBottom: keyboardHeight }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {(step === 2 || step === 3) ? (
                <Pressable onPress={goBack} hitSlop={8}>
                  <ChevronLeft size={20} color={colors.inkSoft} />
                </Pressable>
              ) : null}
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>Book a Fitting</Text>
                <Text style={{ fontSize: 11.5, color: colors.inkSoft }}>with {pageName}</Text>
              </View>
            </View>
            <Pressable onPress={handleClose} hitSlop={8}>
              <X size={20} color={colors.inkSoft} />
            </Pressable>
          </View>

          {step !== 'done' ? (
            <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
              {[1, 2, 3].map((n) => (
                <View key={n} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: (typeof step === 'number' ? step : 3) >= n ? colors.gold : colors.line }} />
              ))}
            </View>
          ) : null}

          <ScrollView style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }} contentContainerStyle={{ paddingBottom: spacing.lg }}>
            {error ? (
              <View style={{ backgroundColor: V.pinkSoft, borderRadius: 10, padding: 10, marginBottom: spacing.md }}>
                <Text style={{ fontSize: 13, color: V.pink }}>{error}</Text>
              </View>
            ) : null}

            {step === 1 ? (
              services === null ? (
                <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.xl }} />
              ) : services.length === 0 ? (
                <Text style={{ fontSize: 13, color: colors.inkSoft, textAlign: 'center', paddingVertical: spacing.xl }}>This Page hasn't added any bookable services yet.</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {services.map((s) => (
                    <Pressable key={s.id} onPress={() => pickService(s)} style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink, flex: 1 }}>{s.name}</Text>
                        {s.price != null ? <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gold }}>{formatMoney(s.price, s.currency)}</Text> : null}
                      </View>
                      {s.description ? <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 4 }} numberOfLines={2}>{s.description}</Text> : null}
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} color={colors.inkSoft} />
                          <Text style={{ fontSize: 11, color: colors.inkSoft }}>{s.durationMinutes} min</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {s.locationType === 'virtual' ? <Video size={11} color={colors.inkSoft} /> : <MapPin size={11} color={colors.inkSoft} />}
                          <Text style={{ fontSize: 11, color: colors.inkSoft }}>{s.locationType === 'virtual' ? 'Virtual' : 'In studio'}</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )
            ) : null}

            {step === 2 && selectedService ? (
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>{selectedService.name}</Text>

                <Pressable
                  onPress={() => setCalendarOpen(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 14 }}
                >
                  <CalendarDays size={15} color={colors.gold} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
                    {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                </Pressable>

                {loadingSlots ? (
                  <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.xl }} />
                ) : !slots || slots.length === 0 ? (
                  <Text style={{ fontSize: 13, color: colors.inkSoft, textAlign: 'center', paddingVertical: spacing.xl }}>No open times on this date — try another day.</Text>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {slots.map((slot) => (
                      <Pressable
                        key={slot.startAt}
                        disabled={submitting}
                        onPress={() => pickSlot(slot)}
                        style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, opacity: submitting ? 0.5 : 1 }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{new Date(slot.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            {step === 3 && selectedService && selectedSlot ? (
              <View>
                <View style={{ backgroundColor: colors.ivoryDeep, borderRadius: 12, padding: 12, marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{selectedService.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 2 }}>
                    {new Date(selectedSlot.startAt).toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: V.amber, marginTop: 4 }}>This time is held for you for a few minutes while you finish booking.</Text>
                </View>

                <View style={{ gap: 10 }}>
                  <TextInput placeholder="Full name" value={clientName} onChangeText={setClientName} style={inputStyle(colors)} placeholderTextColor={colors.inkSoft} />
                  <TextInput placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={clientEmail} onChangeText={setClientEmail} style={inputStyle(colors)} placeholderTextColor={colors.inkSoft} />
                  <TextInput placeholder="Phone (optional)" keyboardType="phone-pad" value={clientPhone} onChangeText={setClientPhone} style={inputStyle(colors)} placeholderTextColor={colors.inkSoft} />
                  <TextInput placeholder="Anything we should know? (optional)" value={notes} onChangeText={setNotes} multiline numberOfLines={2} style={[inputStyle(colors), { height: 64, textAlignVertical: 'top' }]} placeholderTextColor={colors.inkSoft} />
                </View>

                {selectedService.depositAmount != null ? (
                  <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 10 }}>
                    A {formatMoney(selectedService.depositAmount, selectedService.currency)} deposit may be required to hold this appointment — {pageName} will follow up with payment details.
                  </Text>
                ) : null}

                <Pressable disabled={submitting} onPress={confirm} style={{ marginTop: 18, backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 13, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{submitting ? 'Confirming…' : 'Confirm booking'}</Text>
                </Pressable>
              </View>
            ) : null}

            {step === 'done' ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg, gap: 10 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: V.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={26} color={V.green} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{finalStatus === 'confirmed' ? 'Booking confirmed' : 'Booking request sent'}</Text>
                <Text style={{ fontSize: 13, color: colors.inkSoft, textAlign: 'center', maxWidth: 280 }}>
                  {finalStatus === 'confirmed'
                    ? `You're all set — a confirmation has been sent to ${clientEmail}.`
                    : `${pageName} reviews new-client requests before confirming — we'll notify ${clientEmail} as soon as it's approved.`}
                </Text>
                {finalStatus === 'confirmed' && selectedService?.locationType === 'virtual' && selectedService.meetingLink ? (
                  <Pressable
                    onPress={() => Linking.openURL(selectedService.meetingLink!)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ivoryDeep, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, maxWidth: 280 }}
                  >
                    <Video size={14} color={colors.gold} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gold }}>Join virtual appointment</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={onClose} style={{ marginTop: 6, backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 11 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#fff' }}>Done</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>

      <CalendarPickerModal
        visible={calendarOpen}
        title="Select a date"
        selectedDate={toLocalISODate(selectedDate)}
        minDate={toLocalISODate(new Date())}
        maxDate={toLocalISODate(new Date(Date.now() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000))}
        disabledDates={disabledDates}
        onSelect={(dateString) => {
          const [y, m, d] = dateString.split('-').map(Number);
          setSelectedDate(new Date(y, m - 1, d));
          setCalendarOpen(false);
        }}
        onClose={() => setCalendarOpen(false)}
      />
    </Modal>
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
