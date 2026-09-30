import { useEffect, useState } from 'react';
import { getMyPages } from '@fashub/api-client';
import type { MyPageSummary, FollowedPageSummary } from '@fashub/types';

/** Feeds both the drawer's "Pages" list screen and the drawer widget (one row per admined Page) — same data, so the two can never show different numbers for the same Page. */
export function useMyPages(enabled: boolean) {
  const [pages, setPages] = useState<MyPageSummary[]>([]);
  const [followedPages, setFollowedPages] = useState<FollowedPageSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = () => {
    if (!enabled) return;
    setLoading(true);
    getMyPages()
      .then((res) => {
        setPages(res.pages);
        setFollowedPages(res.followedPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(reload, [enabled]);

  return { pages, followedPages, loading, reload };
}
