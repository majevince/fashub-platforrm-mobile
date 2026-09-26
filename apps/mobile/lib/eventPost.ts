/**
 * Event announcement posts carry their event metadata inside the post's
 * `description`, after a sentinel:
 *
 *     <caption text>\n\n---EVENT_DATA---\n{"eventId":"…","category":"Fashion Show",…}
 *
 * (written by web's CreateEventForm, parsed by web's PostCard). Mobile used to
 * render `description` verbatim, so users saw the raw JSON. This ports web's
 * parsing so the caption and the event block render separately.
 */

export interface EventPostMeta {
  eventId?: string | null;
  /** Display label of the event type ("Fashion Show", or the creator's custom type). */
  category: string;
  venueName?: string | null;
  /** "City, State, Country" as snapshotted at post time. */
  location?: string | null;
  countryCode?: string | null;
  date?: string | null;
  time?: string | null;
  startDateTime?: string | null;
  isFree?: boolean;
  /** "Free admission", or a numeric string in `currency`. */
  price?: string | null;
  currency?: string | null;
  attendeeCount?: number;
  capacity?: number | string | null;
  isVirtual?: boolean;
}

const SEPARATOR = '---EVENT_DATA---';

export function parseEventPost(description: string | null | undefined): { text: string; event: EventPostMeta | null } {
  const raw = description ?? '';
  const idx = raw.indexOf(SEPARATOR);
  if (idx === -1) return { text: raw, event: null };

  const text = raw.slice(0, idx).trim();
  try {
    const parsed = JSON.parse(raw.slice(idx + SEPARATOR.length).trim());
    if (parsed && typeof parsed === 'object') return { text, event: parsed as EventPostMeta };
  } catch {
    // Unparseable metadata: still never show the raw blob to the user.
  }
  return { text, event: null };
}
