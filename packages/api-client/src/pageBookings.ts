import { apiGet, apiPost, apiPatch, apiDelete } from './http';
import type {
  PageService, PageAvailabilityRule, PageAvailabilityOverride, AvailableSlot, PageBooking,
} from '@fashub/types';

/** "Book a Fitting" ticket — matches fashub's app/api/pages/[handle]/services/route.ts etc. exactly. */

export function getPageServices(handle: string): Promise<{ services: PageService[] }> {
  return apiGet<{ services: PageService[] }>(`/api/pages/${encodeURIComponent(handle)}/services`);
}

export interface CreatePageServicePayload {
  name: string;
  description?: string;
  durationMinutes: number;
  locationType: 'in_studio' | 'virtual';
  price?: number | string;
  currency?: string;
  depositAmount?: number | string;
  meetingLink?: string;
}

export function createPageService(handle: string, payload: CreatePageServicePayload): Promise<{ service: PageService }> {
  return apiPost<{ service: PageService }>(`/api/pages/${encodeURIComponent(handle)}/services`, payload);
}

export function updatePageService(handle: string, serviceId: string, payload: Partial<CreatePageServicePayload & { isActive: boolean; sortOrder: number }>): Promise<{ service: PageService }> {
  return apiPatch<{ service: PageService }>(`/api/pages/${encodeURIComponent(handle)}/services/${serviceId}`, payload);
}

/** Soft-delete (isActive: false) server-side — see fashub's services/[serviceId]/route.ts DELETE handler. */
export function deletePageService(handle: string, serviceId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/pages/${encodeURIComponent(handle)}/services/${serviceId}`);
}

export function getPageAvailabilityRules(handle: string): Promise<{ rules: PageAvailabilityRule[] }> {
  return apiGet<{ rules: PageAvailabilityRule[] }>(`/api/pages/${encodeURIComponent(handle)}/availability/rules`);
}

export function createPageAvailabilityRule(handle: string, payload: { dayOfWeek: number; startTime: string; endTime: string }): Promise<{ rule: PageAvailabilityRule }> {
  return apiPost<{ rule: PageAvailabilityRule }>(`/api/pages/${encodeURIComponent(handle)}/availability/rules`, payload);
}

export function deletePageAvailabilityRule(handle: string, ruleId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/pages/${encodeURIComponent(handle)}/availability/rules/${ruleId}`);
}

export function getPageAvailabilityOverrides(handle: string, opts: { from?: string; to?: string } = {}): Promise<{ overrides: PageAvailabilityOverride[] }> {
  const params = new URLSearchParams();
  if (opts.from) params.set('from', opts.from);
  if (opts.to) params.set('to', opts.to);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiGet<{ overrides: PageAvailabilityOverride[] }>(`/api/pages/${encodeURIComponent(handle)}/availability/overrides${qs}`);
}

export function createPageAvailabilityOverride(handle: string, payload: { date: string; isClosed?: boolean; startTime?: string; endTime?: string }): Promise<{ override: PageAvailabilityOverride }> {
  return apiPost<{ override: PageAvailabilityOverride }>(`/api/pages/${encodeURIComponent(handle)}/availability/overrides`, payload);
}

export function deletePageAvailabilityOverride(handle: string, overrideId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/pages/${encodeURIComponent(handle)}/availability/overrides/${overrideId}`);
}

/** Booking flow step 2's real slot picker — server is the single source of truth (no client-side slot math). */
export function getPageAvailableSlots(handle: string, serviceId: string, date: string): Promise<{ slots: AvailableSlot[] }> {
  return apiGet<{ slots: AvailableSlot[] }>(`/api/pages/${encodeURIComponent(handle)}/availability/slots?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`);
}

export function getPageBookings(handle: string, opts: { status?: string; upcoming?: boolean; limit?: number } = {}): Promise<{ bookings: PageBooking[] }> {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.upcoming === false) params.set('upcoming', 'false');
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiGet<{ bookings: PageBooking[] }>(`/api/pages/${encodeURIComponent(handle)}/bookings${qs}`);
}

/** Step 2 of the booking flow: reserves a slot (creates a `held` row) the instant it's picked, before contact details are known. Works unauthenticated (guest booking). */
export function createPageBooking(handle: string, payload: { serviceId: string; startAt: string }): Promise<{ booking: PageBooking }> {
  return apiPost<{ booking: PageBooking }>(`/api/pages/${encodeURIComponent(handle)}/bookings`, payload);
}

export function getPageBooking(handle: string, bookingId: string): Promise<{ booking: PageBooking }> {
  return apiGet<{ booking: PageBooking }>(`/api/pages/${encodeURIComponent(handle)}/bookings/${bookingId}`);
}

/** Step 3: submits contact details, moving `held` -> `confirmed` (returning client, auto-confirm) or `pending` (new client, needs admin approval). */
export function confirmPageBooking(handle: string, bookingId: string, payload: { clientName: string; clientEmail: string; clientPhone?: string; notes?: string }): Promise<{ booking: PageBooking }> {
  return apiPatch<{ booking: PageBooking }>(`/api/pages/${encodeURIComponent(handle)}/bookings/${bookingId}`, { action: 'confirm', ...payload });
}

export function approvePageBooking(handle: string, bookingId: string): Promise<{ booking: PageBooking }> {
  return apiPatch<{ booking: PageBooking }>(`/api/pages/${encodeURIComponent(handle)}/bookings/${bookingId}`, { action: 'approve' });
}

export function cancelPageBooking(handle: string, bookingId: string): Promise<{ booking: PageBooking }> {
  return apiPatch<{ booking: PageBooking }>(`/api/pages/${encodeURIComponent(handle)}/bookings/${bookingId}`, { action: 'cancel' });
}

/**
 * Releases the visitor's OWN still-`held` slot (step 2 back/abandon) so it's
 * open again immediately instead of sitting dead for the rest of the hold
 * window. Distinct from cancelPageBooking, which is the admin action on a
 * pending/confirmed booking.
 */
export function releasePageBooking(handle: string, bookingId: string): Promise<{ success: boolean }> {
  return apiPatch<{ success: boolean }>(`/api/pages/${encodeURIComponent(handle)}/bookings/${bookingId}`, { action: 'release' });
}

export function reschedulePageBooking(handle: string, bookingId: string, startAt: string): Promise<{ booking: PageBooking }> {
  return apiPatch<{ booking: PageBooking }>(`/api/pages/${encodeURIComponent(handle)}/bookings/${bookingId}`, { action: 'reschedule', startAt });
}

/** Settings > Booking calendar > Calendar sync — generates/regenerates the Page's private iCal subscription link. */
export function generateBookingFeedUrl(handle: string): Promise<{ feedUrl: string }> {
  return apiPost<{ feedUrl: string }>(`/api/pages/${encodeURIComponent(handle)}/bookings/ical-token`, {});
}

/**
 * The Availability screen's "Time zone detected automatically" banner. Real
 * IANA identifier, not a display placeholder — the server converts
 * PageAvailabilityRule/Override wall-clock hours to real UTC instants using
 * this zone (see fashub's lib/pages/availability.ts). GET is public; PATCH
 * (auto-called once, the first time this screen loads with none saved yet)
 * is gated canManageBookings.
 */
export function getPageTimezone(handle: string): Promise<{ timezone: string | null }> {
  return apiGet<{ timezone: string | null }>(`/api/pages/${encodeURIComponent(handle)}/availability/timezone`);
}

export function setPageTimezone(handle: string, timezone: string): Promise<{ timezone: string | null }> {
  return apiPatch<{ timezone: string | null }>(`/api/pages/${encodeURIComponent(handle)}/availability/timezone`, { timezone });
}

/**
 * Live Availability Status ticket — the one shared calculation behind both
 * the Page header's status line and the Feed byline's compact dot. Always
 * live; never cached server-side or snapshotted.
 */
export function getPageAvailabilityStatus(handle: string): Promise<AvailabilityStatusData> {
  return apiGet<AvailabilityStatusData>(`/api/pages/${encodeURIComponent(handle)}/availability/status`);
}

export interface AvailabilityStatusData {
  status: 'open' | 'almost_booked' | 'fully_booked';
  openSlotsThisWeek: number;
  nextOpeningDate: string | null;
}

/** The "Join waitlist" CTA's real capture — a data-only mechanism, no automated "notify when a slot opens" flow exists yet. */
export function joinPageBookingWaitlist(handle: string, payload: { name: string; email: string; phone?: string; notes?: string }): Promise<{ entry: PageBookingWaitlistEntry }> {
  return apiPost<{ entry: PageBookingWaitlistEntry }>(`/api/pages/${encodeURIComponent(handle)}/bookings/waitlist`, payload);
}

export interface PageBookingWaitlistEntry {
  id: string; name: string; email: string; phone: string | null; notes: string | null; createdAt: string;
}

/** Admin view — gated canManageBookings server-side. */
export function getPageBookingWaitlist(handle: string): Promise<{ entries: PageBookingWaitlistEntry[] }> {
  return apiGet<{ entries: PageBookingWaitlistEntry[] }>(`/api/pages/${encodeURIComponent(handle)}/bookings/waitlist`);
}
