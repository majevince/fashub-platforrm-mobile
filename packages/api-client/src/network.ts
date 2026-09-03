import { apiGet } from './http';
import type { NetworkProfile } from '@fashub/types';

/** Matches GET /api/users?enriched=1 exactly — the Network page's single data source. */
export function getNetworkProfiles(): Promise<NetworkProfile[]> {
  return apiGet('/api/users?enriched=1');
}
