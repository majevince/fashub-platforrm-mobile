/** Matches app/api/workflows/**{route.ts} exactly. */
export interface WorkflowUpdateEntry {
  id: string;
  stageId: string;
  userId: string;
  userRole: 'creator' | 'client';
  type: 'status_change' | 'feedback' | 'note';
  content: string;
  createdAt: string;
}

export interface WorkflowStage {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  stageOrder: number;
  status: 'pending' | 'active' | 'completed';
  startedAt?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  updates?: WorkflowUpdateEntry[];
}

export type WorkflowStatus = 'agreement' | 'requirements' | 'in_progress' | 'review' | 'finalization' | 'delivered' | 'completed' | 'cancelled';

export interface WorkflowParticipant {
  id: string;
  displayName: string;
  avatar?: string | null;
  role: string;
  subscriptionTier?: string | null;
}

export interface Workflow {
  id: string;
  conversationId: string;
  clientId: string;
  creatorId: string;
  creatorRole: 'designer' | 'tailor';
  title: string;
  description?: string | null;
  projectType: string;
  projectId?: string | null;
  category?: string | null;
  coverImage?: string | null;
  agreedPrice?: number | null;
  currency: string;
  estimatedDelivery?: string | null;
  status: WorkflowStatus;
  currentStageOrder: number;
  clientApproved?: boolean;
  clientApprovedAt?: string | null;
  cancellationReason?: string | null;
  cancellationNote?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  stages: WorkflowStage[];
  client?: WorkflowParticipant | null;
  creator?: WorkflowParticipant | null;
  completedStages: number;
  totalStages: number;
  activeStage?: WorkflowStage | null;
  relatedWorkflowCount?: number;
}

export const CANCELLATION_REASONS = [
  { value: 'scope_change', label: 'Scope change' },
  { value: 'communication_issue', label: 'Communication issue' },
  { value: 'unresponsive', label: 'Client unresponsive' },
  { value: 'terms_violated', label: 'Terms violated' },
  { value: 'mutual_agreement', label: 'Mutual agreement' },
  { value: 'other', label: 'Other' },
] as const;
