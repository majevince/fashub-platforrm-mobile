import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { sendHeartbeat } from '@fashub/api-client';

const HEARTBEAT_INTERVAL_MS = 5000;

/**
 * Matches web's lib/chat/onlineStatus.ts heartbeat exactly (POST
 * /api/online-status every 5s while active). Web additionally marks itself
 * offline via navigator.sendBeacon on beforeunload — there's no native RN
 * equivalent (no reliable "about to be killed" hook), so a backgrounded/
 * killed mobile session degrades to the server's own 15s staleness
 * threshold instead of an explicit offline ping. Flagged as an accepted
 * native limitation, not silently different behavior.
 */
export function useOnlineHeartbeat(userId: string | undefined) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const ping = () => {
      sendHeartbeat(userId, true).catch(() => {});
    };

    ping();
    intervalRef.current = setInterval(ping, HEARTBEAT_INTERVAL_MS);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') ping();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [userId]);
}
