import { apiGet, apiPatch } from './http';
import type { Workflow, WorkflowStatus } from '@fashub/types';

/** Matches GET /api/workflows?userId= exactly. */
export function getWorkflows(userId: string, opts: { status?: WorkflowStatus | 'all'; projectId?: string } = {}): Promise<{ workflows: Workflow[] }> {
  const params = new URLSearchParams({ userId });
  if (opts.status) params.set('status', opts.status);
  if (opts.projectId) params.set('projectId', opts.projectId);
  return apiGet(`/api/workflows?${params.toString()}`);
}

/** Matches GET /api/workflows/[workflowId]?userId= exactly — access-controlled to participants only. */
export function getWorkflow(workflowId: string, userId: string): Promise<{ workflow: Workflow }> {
  return apiGet(`/api/workflows/${workflowId}?userId=${userId}`);
}

/** Matches PATCH .../[workflowId] action:'advance_stage' — creator-only, enforced server-side. */
export function advanceWorkflowStage(workflowId: string, userId: string): Promise<{ workflow: Workflow }> {
  return apiPatch(`/api/workflows/${workflowId}`, { userId, action: 'advance_stage' });
}

/** Matches PATCH .../[workflowId] action:'client_approve' — client-only, enforced server-side. */
export function approveWorkflowDelivery(workflowId: string, userId: string): Promise<{ workflow: Workflow }> {
  return apiPatch(`/api/workflows/${workflowId}`, { userId, action: 'client_approve' });
}

/** Matches PATCH .../[workflowId] action:'request_revision' — client-only, enforced server-side. */
export function requestWorkflowRevision(workflowId: string, userId: string, feedback?: string): Promise<{ workflow: Workflow }> {
  return apiPatch(`/api/workflows/${workflowId}`, { userId, action: 'request_revision', feedback });
}

/** Matches PATCH .../[workflowId] action:'cancel' — creator-only, enforced server-side. */
export function cancelWorkflow(workflowId: string, userId: string, cancellationReason: string, cancellationNote?: string): Promise<{ workflow: Workflow }> {
  return apiPatch(`/api/workflows/${workflowId}`, { userId, action: 'cancel', cancellationReason, cancellationNote });
}
