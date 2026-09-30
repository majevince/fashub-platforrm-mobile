import { useEffect, useState } from 'react';
import { getPage } from '@fashub/api-client';
import type { PageDetail, PageViewerState } from '@fashub/types';

/**
 * Every Pages screen reads through this (or usePageFollow/usePageAdmins/
 * useMyPages below) rather than calling getPage() directly — same
 * shared-hook rule the rest of the app's profile screens already follow
 * (see useFollowingIds.ts).
 */
export function usePage(handle: string | undefined) {
  const [page, setPage] = useState<PageDetail | null>(null);
  const [viewer, setViewer] = useState<PageViewerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    if (!handle) return;
    setLoading(true);
    setError(null);
    getPage(handle)
      .then((res) => {
        setPage(res.page);
        setViewer(res.viewer);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load Page'))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [handle]);

  return { page, viewer, loading, error, reload };
}
