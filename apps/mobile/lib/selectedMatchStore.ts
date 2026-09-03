import type { MatchedProfessional } from '@fashub/types';

/**
 * There is no "get one matched professional by id" endpoint on web — a
 * match result only exists in the context of the search request that
 * produced it (score/reasons are query-specific). Since Expo Router can't
 * pass a full object through navigation params, the compact grid card
 * stashes the already-fetched match object here right before navigating to
 * the full detail screen, which reads it back on mount. A direct deep-link
 * to /professional/[id] with nothing stashed (e.g. app relaunched into the
 * link) has nothing to hydrate from and shows an explicit "go back" state
 * rather than silently fetching a different, non-matching data shape.
 */
let selected: MatchedProfessional | null = null;

export function setSelectedMatch(match: MatchedProfessional) {
  selected = match;
}

export function getSelectedMatch(): MatchedProfessional | null {
  return selected;
}
