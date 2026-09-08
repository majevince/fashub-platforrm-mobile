import { apiPost } from './http';
import type { InviteResult } from '@fashub/types';

/** Matches POST /api/invite exactly. Up to 20 emails per call, up to 20 sends per day per user — both enforced server-side. */
export function sendInvites(emails: string[]): Promise<InviteResult> {
  return apiPost<InviteResult>('/api/invite', { emails });
}
