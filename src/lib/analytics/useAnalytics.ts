import { useState, useEffect, useCallback } from 'react';
import { cloudHabitsRepository as habitsRepository, cloudLogsRepository as logsRepository } from '../../db';
import type { Habit } from '../../db/types';
import type { HabitStats, OverviewStats, HabitConnection, LogsMap } from './types';
import {
  createLogsMap,
  computeHabitStats,
  computeOverviewStats,
  computeHabitConnections,
} from './computations';
import { getToday, getDaysAgo } from './dateUtils';

interface UseAnalyticsResult {
  loading: boolean;
  error: string | null;
  habits: Habit[];
  habitStats: Map<string, HabitStats>;
  overview: OverviewStats | null;
  connections: HabitConnection[];
  includeArchived: boolean;
  setIncludeArchived: (value: boolean) => void;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and compute analytics data
 */
export function useAnalytics(): UseAnalyticsResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitStats, setHabitStats] = useState<Map<string, HabitStats>>(new Map());
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [connections, setConnections] = useState<HabitConnection[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = getToday();
      
      // Fetch habits
      const allHabits = await habitsRepository.getAll(includeArchived);
      setHabits(allHabits);
      
      if (allHabits.length === 0) {
        setHabitStats(new Map());
        setOverview(null);
        setConnections([]);
        setLoading(false);
        return;
      }
      
      // Fetch logs for last 120 days (covers 90-day rates + 28-day trend calculation)
      const startDate = getDaysAgo(120, today);
      const logs = await logsRepository.getByDateRange(startDate, today);
      
      // Create lookup map
      const logsMap: LogsMap = createLogsMap(logs);
      
      // Compute stats for each habit
      const stats = new Map<string, HabitStats>();
      for (const habit of allHabits) {
        stats.set(habit.id, computeHabitStats(habit, logsMap, today));
      }
      setHabitStats(stats);
      
      // Compute overview
      const overviewStats = computeOverviewStats(allHabits, stats, logsMap, today);
      setOverview(overviewStats);
      
      // Compute connections (only for active habits, limited compute)
      const activeHabits = allHabits.filter(h => h.archivedAt === null);
      if (activeHabits.length >= 2 && activeHabits.length <= 15) {
        const conns = computeHabitConnections(activeHabits, logsMap, today);
        setConnections(conns);
      } else {
        setConnections([]);
      }
      
    } catch (err) {
      console.error('Analytics error:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  // Load on mount and when includeArchived changes
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    loading,
    error,
    habits,
    habitStats,
    overview,
    connections,
    includeArchived,
    setIncludeArchived,
    refresh: loadAnalytics,
  };
}
