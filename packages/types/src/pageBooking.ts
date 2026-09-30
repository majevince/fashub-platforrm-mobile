/**
 * "Book a Fitting" ticket — Page services/availability/bookings. Mirrors
 * fashub's Prisma models (PageService, PageAvailabilityRule,
 * PageAvailabilityOverride, PageBooking) exactly; see that repo's
 * prisma/schema.prisma for the full design rationale (why a new model
 * rather than reusing BusinessBooking, the hold/expiry concurrency pattern,
 * etc.) — not repeated here to avoid the two copies drifting.
 */

export type PageServiceLocationType = 'in_studio' | 'virtual';

export interface PageService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  locationType: PageServiceLocationType;
  price: number | null;
  currency: string;
  depositAmount: number | null;
  isActive: boolean;
  sortOrder: number;
  /** Only meaningful for locationType 'virtual' (Zoom, Google Meet, WhatsApp, etc. — any URL). Never shown to the client before a booking is confirmed. */
  meetingLink: string | null;
}

/**
 * A curated common subset (not the full ISO-4217 list) for the service
 * price currency picker — the admin's free choice at service-creation
 * time, not fixed to USD. Nothing server-side restricts a service to this
 * list; it's just what the picker offers.
 */
export const CURRENCY_OPTIONS: { code: string; name: string }[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'CHF', name: 'Swiss Franc' },
];

export interface PageAvailabilityRule {
  id: string;
  dayOfWeek: number; // 0 (Sunday) - 6 (Saturday)
  startTime: string; // "HH:MM"
  endTime: string;
}

export interface PageAvailabilityOverride {
  id: string;
  date: string;
  isClosed: boolean;
  startTime: string | null;
  endTime: string | null;
}

export interface AvailableSlot {
  startAt: string;
  endAt: string;
}

export type PageBookingStatus = 'held' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface PageBooking {
  id: string;
  status: PageBookingStatus;
  startAt: string;
  endAt: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  notes: string | null;
  holdExpiresAt: string | null;
  isReturningClient: boolean;
  /** Derived, not a stored field — see UpcomingBookingsWidget's doc comment
   * on the web side: whether a real signed-in platform account made this
   * booking (clientUserId set) vs. a guest. The actual "verified client"
   * source of truth, since no User.isVerified field exists anywhere. */
  isVerifiedUser: boolean;
  service: { id: string; name: string; durationMinutes: number; locationType: PageServiceLocationType; meetingLink: string | null };
  clientUser: { id: string; displayName: string; avatar: string | null } | null;
  page?: { name: string; handle: string };
}
