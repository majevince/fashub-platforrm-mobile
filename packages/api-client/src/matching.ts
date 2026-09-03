import { apiPost } from './http';
import type { MatchRequest, MatchResponse } from '@fashub/types';

/** Matches POST /api/search/match exactly — the Professionals matching feature's one and only endpoint (also used for the "Recommended for you" carousel, with broader default params). */
export function matchProfessionals(request: MatchRequest): Promise<MatchResponse> {
  return apiPost('/api/search/match', request);
}
