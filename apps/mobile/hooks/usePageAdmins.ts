import { useEffect, useState } from 'react';
import { getPage } from '@fashub/api-client';
import type { PageAdminUser } from '@fashub/types';

/**
 * A thin, separately-named hook per the ticket's spec (rather than every
 * Manage-screen consumer reaching into usePage()'s page.admins directly) —
 * there's no dedicated /admins endpoint yet, so this reuses GET
 * /api/pages/[handle] and just exposes the admins slice. If a dedicated
 * admins endpoint (add/remove admin, change role) gets built later, only
 * this hook needs to change, not every screen that calls it.
 */
export function usePageAdmins(handle: string | undefined) {
  const [admins, setAdmins] = useState<PageAdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    if (!handle) return;
    setLoading(true);
    getPage(handle)
      .then((res) => setAdmins(res.page.admins))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(reload, [handle]);

  return { admins, loading, reload };
}
