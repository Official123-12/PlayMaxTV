import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/lib/auth';
import type { WatchHistory } from '@/types';

/**
 * Reactive hook that reads watch history from localStorage and syncs when it changes.
 */
export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistory[]>(() => {
    try {
      return getCurrentUser()?.watchHistory || [];
    } catch { return []; }
  });

  const refresh = useCallback(() => {
    try {
      setHistory(getCurrentUser()?.watchHistory || []);
    } catch { setHistory([]); }
  }, []);

  useEffect(() => {
    // Poll for changes every 10 seconds (localStorage doesn't have change events cross-tab in Safari)
    const interval = setInterval(refresh, 10_000);

    // Also listen for storage events (works in Chrome/Firefox across tabs)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'playmax_user') refresh();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  return { history, refresh };
}
