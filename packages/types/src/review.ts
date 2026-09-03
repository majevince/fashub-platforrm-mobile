/** Matches GET /api/reviews exactly (app/api/reviews/route.ts). */
export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string | null;
  reviewerRole?: string | null;
  revieweeId: string;
  revieweeRole?: string | null;
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

/** Matches POST /api/reviews's required + accepted fields exactly. workflowId/workflowTitle/workflowCoverImage are omitted here — this ticket's review composer is launched from the Public Profile page directly, not from a project workflow context. */
export type CreateReviewPayload = {
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string | null;
  reviewerRole?: string | null;
  revieweeId: string;
  revieweeRole?: string | null;
  qualityRating: number;
  serviceRating: number;
  valueRating: number;
  timelinessRating: number;
  communicationRating: number;
  title?: string;
  comment: string;
};
