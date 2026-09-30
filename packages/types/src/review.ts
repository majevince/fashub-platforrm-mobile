/** Matches GET /api/reviews exactly (app/api/reviews/route.ts). Exactly one of revieweeId or pageId is set — Page reviews ticket extended this same model/endpoint to also target a Page. */
export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string | null;
  reviewerRole?: string | null;
  revieweeId?: string | null;
  revieweeRole?: string | null;
  pageId?: string | null;
  overallRating: number;
  qualityRating: number;
  serviceRating: number;
  valueRating: number;
  timelinessRating: number;
  communicationRating: number;
  title?: string | null;
  comment: string;
  images?: string[];
  isVerified: boolean;
  helpfulCount?: number;
  createdAt: string;
}

/** Matches POST /api/reviews's required + accepted fields exactly. workflowId/workflowTitle/workflowCoverImage are omitted here — this ticket's review composer is launched from the Public Profile page directly, not from a project workflow context. Exactly one of revieweeId/revieweeRole or pageId — Page reviews ticket. */
export type CreateReviewPayload = {
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string | null;
  reviewerRole?: string | null;
  revieweeId?: string;
  revieweeRole?: string | null;
  pageId?: string;
  qualityRating: number;
  serviceRating: number;
  valueRating: number;
  timelinessRating: number;
  communicationRating: number;
  title?: string;
  comment: string;
};
