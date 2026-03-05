import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Client } from '../types';
import { computeHealthScore } from '../utils/healthScore';
import { useSLAStatuses } from './useSLA';

export interface HealthSnapshot {
  date: string; // YYYY-MM-DD
  score: number;
}

type HealthHistoryStore = Record<string, HealthSnapshot[]>; // clientId -> snapshots

const MAX_SNAPSHOTS = 8; // ~2 months of weekly snapshots

export function useHealthHistory(clients: Client[]) {
  const [history, setHistory] = useLocalStorage<HealthHistoryStore>('embark-health-history', {});
  const slaStatuses = useSLAStatuses(clients);

  // Write today's snapshot on mount (if not already written today)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setHistory(prev => {
      const next = { ...prev };
      let changed = false;
      for (const client of clients) {
        if (client.archived) continue;
        const existing = next[client.id] ?? [];
        if (existing.length > 0 && existing[existing.length - 1].date === today) continue;
        const score = computeHealthScore(client, slaStatuses).total;
        const updated = [...existing, { date: today, score }].slice(-MAX_SNAPSHOTS);
        next[client.id] = updated;
        changed = true;
      }
      return changed ? next : prev;
    });
  // Only on mount — clients/slaStatuses are stable enough for daily snapshot
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getHistory = useCallback(
    (clientId: string): HealthSnapshot[] => history[clientId] ?? [],
    [history]
  );

  const getTrend = useCallback(
    (clientId: string): 'up' | 'down' | 'stable' => {
      const snapshots = history[clientId] ?? [];
      if (snapshots.length < 2) return 'stable';
      const oldest = snapshots[0].score;
      const newest = snapshots[snapshots.length - 1].score;
      const delta = newest - oldest;
      if (delta >= 5) return 'up';
      if (delta <= -5) return 'down';
      return 'stable';
    },
    [history]
  );

  const getDelta = useCallback(
    (clientId: string): number => {
      const snapshots = history[clientId] ?? [];
      if (snapshots.length < 2) return 0;
      return snapshots[snapshots.length - 1].score - snapshots[0].score;
    },
    [history]
  );

  return { getHistory, getTrend, getDelta };
}
