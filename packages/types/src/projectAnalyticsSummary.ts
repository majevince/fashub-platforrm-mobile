/** Matches GET /api/analytics/projects?userId= (summary mode, no projectId)
 * exactly — real Prisma-backed data. Server 403s if the user's
 * subscriptionTier isn't 'pro'/'business'; callers should treat a 403 as
 * "not eligible", not an error. */
export interface ProjectAnalyticsSummary {
  window: { from: string; to: string; days: number };
  kpis: {
    views: { value: number; delta: number };
    likes: { value: number; delta: number };
    saves: { value: number; delta: number };
    shares: { value: number; delta: number };
    inquiries: { value: number; delta: number };
  };
  projectRanking: {
    id: string;
    title: string;
    type: 'post' | 'portfolio';
    thumbnail: string | null;
    category: string | null;
    createdAt: string;
    views: number;
    likes: number;
    saves: number;
    shares: number;
    inquiries: number;
    score: number;
  }[];
  totalProjects: number;
  insights: string[];
}
