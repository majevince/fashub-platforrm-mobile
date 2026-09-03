/** Matches GET /api/trending exactly. */
export interface TrendingTag {
  id: string;
  trend: string;
  postCount: number;
  lastUsedAt: string;
}
