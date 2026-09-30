import { useState } from 'react';
import { followPage, unfollowPage } from '@fashub/api-client';

/** Optimistic follow/unfollow, matching the app's other follow-toggle UIs — reverts on a failed request rather than leaving the UI lying about server state. */
export function usePageFollow(handle: string, initialFollowing: boolean, initialCount: number) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (pending) return;
    const next = !isFollowing;
    setPending(true);
    setIsFollowing(next);
    setFollowerCount((c) => c + (next ? 1 : -1));
    try {
      const res = next ? await followPage(handle) : await unfollowPage(handle);
      setIsFollowing(res.following);
      setFollowerCount(res.followerCount);
    } catch {
      setIsFollowing(!next);
      setFollowerCount((c) => c + (next ? -1 : 1));
    } finally {
      setPending(false);
    }
  };

  return { isFollowing, followerCount, toggle, pending };
}
