import { useEffect, useState } from 'react';
import { getOnlineStatus } from '@fashub/api-client';

/** Polls one user's presence at the given interval — matches web's per-partner polling (15s in the inbox, 10s in an open thread). */
export function useOnlineStatus(userId: string | undefined, intervalMs: number) {
  const [status, setStatus] = useState<{ isOnline: boolean; lastActive: string | null }>({ isOnline: false, lastActive: null });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const poll = () => {
      getOnlineStatus(userId)
        .then((res) => {
          if (!cancelled) setStatus(res);
        })
        .catch(() => {});
    };

    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userId, intervalMs]);

  return status;
}
