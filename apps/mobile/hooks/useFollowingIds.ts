import { useEffect, useState } from 'react';
import { getUserProfile } from '@fashub/api-client';

/**
 * Web derives `isFollowing` from localStorage (`getUserSocialData`), even
 * though the real `following: string[]` array already exists on the
 * caller's own profile record and comes back from GET /api/users/[userId]
 * for your own profile (no privacy filtering applied to self) — confirmed
 * by reading prisma/schema.prisma directly. Using that real field instead
 * of a local-only cache is a deliberate, small improvement over web's own
 * behavior here (multi-device consistent), not a guess.
 */
export function useFollowingIds(currentUserId: string | undefined) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const reload = () => {
    if (!currentUserId) return;
    getUserProfile(currentUserId, currentUserId)
      .then((profile) => {
        const following = profile.individualProfile?.following ?? profile.designerProfile?.following ?? profile.tailorProfile?.following ?? [];
        setIds(new Set(following));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  };

  useEffect(reload, [currentUserId]);

  return { followingIds: ids, loaded, reload, setFollowing: (targetId: string, isFollowing: boolean) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.add(targetId);
      else next.delete(targetId);
      return next;
    });
  } };
}
