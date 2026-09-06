/**
 * Ports web's buildLocationLine() (app/events/[eventId]/page.tsx) — merges
 * venueName, address, city+state+postalCode, and country, dropping any
 * candidate that's a substring of one already added. Handles a real data
 * bug where `address` sometimes already contains the full composite string.
 */
export function buildEventLocationLine(event: {
  venueName?: string | null;
  address?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
}): string {
  const candidates = [
    event.venueName,
    event.address,
    [event.city, event.state, event.postalCode].filter(Boolean).join(', '),
    event.country,
  ];

  const result: string[] = [];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    if (result.some((r) => r.includes(trimmed) || trimmed.includes(r))) continue;
    result.push(trimmed);
  }
  return result.join(' · ');
}
