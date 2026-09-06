import { apiGet, apiPost, apiDelete } from './http';
import type { EventsListResponse, EventDetail, RecommendedEventsResponse, RelatedEventsResponse } from '@fashub/types';

/** Matches GET /api/events exactly (app/api/events/route.ts). Server always excludes past events (startDate >= now); distance/isAttending only populate when latitude+longitude / userId are passed. */
export function getEvents(opts: {
  latitude?: number;
  longitude?: number;
  radius?: number;
  category?: string;
  status?: string;
  isFree?: boolean;
  isVirtual?: boolean;
  featured?: boolean;
  userId?: string;
  page?: number;
  limit?: number;
} = {}): Promise<EventsListResponse> {
  const params = new URLSearchParams();
  if (opts.latitude != null) params.set('latitude', String(opts.latitude));
  if (opts.longitude != null) params.set('longitude', String(opts.longitude));
  if (opts.radius != null) params.set('radius', String(opts.radius));
  if (opts.category) params.set('category', opts.category);
  if (opts.status) params.set('status', opts.status);
  if (opts.isFree != null) params.set('isFree', String(opts.isFree));
  if (opts.isVirtual != null) params.set('isVirtual', String(opts.isVirtual));
  if (opts.featured != null) params.set('featured', String(opts.featured));
  if (opts.userId) params.set('userId', opts.userId);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return apiGet(`/api/events${qs ? `?${qs}` : ''}`);
}

/**
 * Matches GET /api/events/[eventId] exactly — server increments `views` as
 * a side effect of this call, same as web. The route wraps its payload as
 * `{ event: {...} }` (unlike the list/recommended/related routes, which
 * are flat `{ events: [...] }`) — unwrapped here so callers get the event
 * object directly, matching every other resource in this client.
 */
export async function getEvent(eventId: string, userId?: string): Promise<EventDetail> {
  const res = await apiGet<{ event: EventDetail }>(`/api/events/${eventId}${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`);
  return res.event;
}

/** Matches POST /api/events/[eventId]/attend exactly — returns the created/updated EventAttendee row, not a message. */
export function attendEvent(eventId: string, userId: string, status: string = 'attending'): Promise<{ attendance: { id: string; eventId: string; userId: string; status: string; registeredAt: string } }> {
  return apiPost(`/api/events/${eventId}/attend`, { userId, status });
}

/** Matches DELETE /api/events/[eventId]/attend?userId= exactly. */
export function unattendEvent(eventId: string, userId: string): Promise<{ success: boolean }> {
  return apiDelete(`/api/events/${eventId}/attend?userId=${encodeURIComponent(userId)}`);
}

/** Matches GET /api/events/recommended?userId=&limit= exactly. */
export function getRecommendedEvents(userId: string, limit: number = 8): Promise<RecommendedEventsResponse> {
  return apiGet(`/api/events/recommended?userId=${encodeURIComponent(userId)}&limit=${limit}`);
}

/** Matches GET /api/events/related/[eventId] exactly. */
export function getRelatedEvents(eventId: string): Promise<RelatedEventsResponse> {
  return apiGet(`/api/events/related/${eventId}`);
}
