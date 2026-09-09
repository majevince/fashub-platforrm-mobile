import { apiGet, apiPost } from './http';
import type { PortfolioProject, PortfolioProjectDetail } from '@fashub/types';

/** Matches GET /api/portfolio/projects exactly. */
export function getPortfolioProjects(userId: string, role?: 'designer' | 'tailor', visibility: 'public' | 'all' = 'public'): Promise<{ projects: PortfolioProject[] }> {
  const params = new URLSearchParams({ userId, visibility });
  if (role) params.set('role', role);
  return apiGet(`/api/portfolio/projects?${params.toString()}`);
}

/**
 * Matches GET /api/portfolio/projects/[projectId] exactly — the real
 * single-project detail endpoint (distinct from the discover/list endpoint
 * the Project tab list uses). Now includes the owner join (see that route's
 * comment), so this one call is enough for both the full project fields and
 * the owner-contact panel.
 */
export function getPortfolioProject(projectId: string): Promise<{ project: PortfolioProjectDetail }> {
  return apiGet(`/api/portfolio/projects/${projectId}`);
}

/** Matches POST /api/portfolio/projects/[projectId]/view exactly — fired on project open. */
export function trackProjectView(projectId: string): Promise<{ success: boolean }> {
  return apiPost(`/api/portfolio/projects/${projectId}/view`, {});
}

/**
 * Matches POST /api/portfolio/projects/[projectId]/share exactly — web's
 * "Send to User" flow (components/portfolio/ProjectShareModal.tsx). Creates
 * (or reuses) a direct conversation per recipient and posts a real message
 * with attachmentType: 'project', which the shared inbox already knows how
 * to render (components/messages/MessageCards.tsx's ProjectMessageCard) —
 * this is the send-side call only, no new rendering needed.
 */
export function shareProject(
  projectId: string,
  payload: { senderId: string; recipientIds: string[]; note?: string }
): Promise<{ success: boolean; sharedCount: number; failedCount: number }> {
  return apiPost(`/api/portfolio/projects/${projectId}/share`, payload);
}
