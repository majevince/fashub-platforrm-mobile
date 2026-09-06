/**
 * Matches web's Event model and /api/events* routes exactly (read directly
 * from prisma/schema.prisma and app/api/events/**). `dresscode`/
 * `ageRestriction`/`accessibilityInfo`/`parkingInfo` ARE rendered on web's
 * detail page (an "Additional Information" section, hidden when all four
 * are empty) — confirmed by reading app/events/[eventId]/page.tsx directly
 * after an earlier pass incorrectly assumed they weren't surfaced.
 */
export type EventCategory =
  | 'fashion_show'
  | 'exhibition'
  | 'workshop'
  | 'conference'
  | 'networking'
  | 'trunk_show'
  | 'sample_sale'
  | 'launch_event'
  | 'award_ceremony'
  | 'other';

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'postponed' | 'completed';

/**
 * Web's UI labels diverge from the Prisma enum names (components/events/
 * EventCard.tsx's CATEGORIES const) — e.g. `trunk_show` displays as
 * "Tailoring Session", `conference` as "Cultural Fashion". Copied verbatim,
 * not title-cased from the enum.
 */
export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  fashion_show: 'Fashion Show',
  workshop: 'Workshop',
  trunk_show: 'Tailoring Session',
  sample_sale: 'Pop-up Shop',
  exhibition: 'Designer Showcase',
  conference: 'Cultural Fashion',
  networking: 'Virtual Styling',
  launch_event: 'Launch Event',
  award_ceremony: 'Award Ceremony',
  other: 'Other',
};

export const EVENT_CATEGORIES: EventCategory[] = [
  'fashion_show',
  'workshop',
  'trunk_show',
  'sample_sale',
  'exhibition',
  'conference',
  'networking',
  'launch_event',
  'award_ceremony',
  'other',
];

/** Ordered `{ time, description }` list — a JSON blob on Event, not a relation. */
export interface EventAgendaItem {
  time: string;
  description: string;
}

export interface EventOrganizerSummary {
  id: string;
  displayName: string;
  avatar: string | null;
  subscriptionTier?: string | null;
}

/** Matches GET /api/events (and the shape embedded in recommended/related responses) exactly. */
export interface EventListItem {
  id: string;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  category: EventCategory;
  status: EventStatus;
  startDate: string;
  endDate?: string | null;
  timezone: string;
  isAllDay: boolean;
  venueName?: string | null;
  address?: string | null;
  city: string;
  state?: string | null;
  country: string;
  countryCode?: string | null;
  postalCode?: string | null;
  latitude: number;
  longitude: number;
  isVirtual: boolean;
  virtualLink?: string | null;
  image?: string | null;
  images: string[];
  organizerId?: string | null;
  organizerName?: string | null;
  organizer?: EventOrganizerSummary | null;
  externalUrl?: string | null;
  capacity?: number | null;
  attendeeCount: number;
  requiresRegistration: boolean;
  registrationUrl?: string | null;
  isFree: boolean;
  price?: number | null;
  currency: string;
  tags: string[];
  dresscode?: string | null;
  ageRestriction?: string | null;
  accessibilityInfo?: string | null;
  parkingInfo?: string | null;
  agenda?: EventAgendaItem[] | null;
  featured: boolean;
  views: number;
  /** Only present when the request included latitude/longitude (Haversine query). */
  distance?: number;
  /** Only present when the request included userId. */
  isAttending?: boolean;
}

/** Matches GET /api/events/[eventId] — same shape plus a fuller organizer (adds email). */
export interface EventDetail extends EventListItem {
  organizer?: (EventOrganizerSummary & { email?: string | null }) | null;
}

export interface EventsListResponse {
  events: EventListItem[];
  pagination: { page?: number; limit?: number; total?: number; totalPages?: number };
}

export interface RecommendedEvent extends EventListItem {
  matchScore?: number | null;
}

/** Matches GET /api/events/recommended exactly. */
export interface RecommendedEventsResponse {
  events: RecommendedEvent[];
  personalized: boolean;
  displayName: string;
  role: string;
  locationLabel: string;
}

/** Matches GET /api/events/related/[eventId] exactly. */
export interface RelatedEventsResponse {
  events: EventListItem[];
}

export type EventSort = 'date' | 'popular' | 'price_asc' | 'price_free';
