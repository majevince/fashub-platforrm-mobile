import { useCallback, useEffect, useState } from 'react';
import { secureStorage } from '../lib/secureStorage';

const KEY_PREFIX = 'fashub_profile_likes_';

/**
 * Profile "favorite" (heart icon) is confirmed 100% client-only on web too
 * — `lib/social/socialUtils.ts`'s `toggleLike` never calls an API, it's
 * pure localStorage. This is a real, deliberate web feature (not mock data
 * masquerading as real), so it's ported the same way here — a local,
 * per-device set of liked profile IDs, keyed per logged-in user.
 */
export function useLocalFavorites(currentUserId: string | undefined) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const key = currentUserId ? `${KEY_PREFIX}${currentUserId}` : null;

  useEffect(() => {
    if (!key) return;
    secureStorage
      .getItemAsync(key)
      .then((raw) => setIds(new Set(raw ? (JSON.parse(raw) as string[]) : [])))
      .catch(() => setIds(new Set()));
  }, [key]);

  const toggle = useCallback(
    (profileId: string) => {
      if (!key) return;
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(profileId)) next.delete(profileId);
        else next.add(profileId);
        secureStorage.setItemAsync(key, JSON.stringify(Array.from(next))).catch(() => {});
        return next;
      });
    },
    [key]
  );

  return { likedIds: ids, toggleLike: toggle };
}
