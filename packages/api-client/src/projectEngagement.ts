import { apiPost } from './http';
import type { ProjectEngagementType } from '@fashub/types';

/**
 * Matches POST /api/projects/[projectId]/engagement exactly — mirrors web's
 * lib/recommendations/trackProjectEngagement.ts (same fire-and-forget,
 * silent-catch-never-breaks-UX shape), pointed at the same shared endpoint.
 * This is the single logging path the mobile Project tab and detail screen
 * fire through.
 */
export async function trackProjectEngagement(
  projectId: string,
  type: ProjectEngagementType,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await apiPost(`/api/projects/${projectId}/engagement`, {
      ...(userId ? { userId } : {}),
      type,
      ...(metadata ? { metadata } : {}),
    });
  } catch {
    // Silent fail — engagement tracking should never break the UX.
  }
}
