import { useState, useEffect, useCallback, useRef } from 'react';
import { cloudHabitsRepository as habitsRepository, cloudLogsRepository as logsRepository } from '../../db';
import type { Habit, LogEntry } from '../../db/types';
import { getGridDates, getToday, getTodayIndex } from './utils';

export type LogsMap = Map<string, LogEntry>; // key: `${habitId}:${date}`

function makeLogKey(habitId: string, date: string): string {
  return `${habitId}:${date}`;
}

/**
 * Hook to manage grid data (habits + logs)
 */
export function useGridData() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [logsMap, setLogsMap] = useState<LogsMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track loaded date range to avoid redundant fetches
  const loadedRangeRef = useRef<{ start: string; end: string } | null>(null);

  /**
   * Load habits and initialize dates
   */
  const loadHabits = useCallback(async () => {
    try {
      const activeHabits = await habitsRepository.getAll(false);
      setHabits(activeHabits);
      
      const gridDates = getGridDates();
      setDates(gridDates);
      
      return { habits: activeHabits, dates: gridDates };
    } catch (err) {
      console.error('Failed to load habits:', err);
      setError('Failed to load habits');
      return null;
    }
  }, []);

  /**
   * Load logs for a date range
   */
  const loadLogsForRange = useCallback(async (
    habitList: Habit[],
    startDate: string,
    endDate: string
  ) => {
    if (habitList.length === 0) return;

    try {
      const logs = await logsRepository.getByDateRange(startDate, endDate);
      
      setLogsMap((prev) => {
        const newMap = new Map(prev);
        for (const log of logs) {
          newMap.set(makeLogKey(log.habitId, log.date), log);
        }
        return newMap;
      });
      
      loadedRangeRef.current = { start: startDate, end: endDate };
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  }, []);

  /**
   * Initial load
   */
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const result = await loadHabits();
      
      if (result) {
        // Load all logs for the full range initially
        // For better performance, could load in chunks as user scrolls
        const { habits: h, dates: d } = result;
        if (d.length > 0) {
          await loadLogsForRange(h, d[0], d[d.length - 1]);
        }
      }
      
      setLoading(false);
    };
    
    init();
  }, [loadHabits, loadLogsForRange]);

  /**
   * Refresh when page becomes visible or focused (e.g., after adding habits)
   */
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Reload habits to catch any new ones added
        const result = await loadHabits();
        if (result) {
          const { habits: h, dates: d } = result;
          if (d.length > 0) {
            await loadLogsForRange(h, d[0], d[d.length - 1]);
          }
        }
      }
    };

    const handleFocus = async () => {
      // Reload habits when window regains focus
      const result = await loadHabits();
      if (result) {
        const { habits: h, dates: d } = result;
        if (d.length > 0) {
          await loadLogsForRange(h, d[0], d[d.length - 1]);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadHabits, loadLogsForRange]);

  /**
   * Get log for a specific habit and date
   */
  const getLog = useCallback((habitId: string, date: string): LogEntry | undefined => {
    return logsMap.get(makeLogKey(habitId, date));
  }, [logsMap]);

  /**
   * Optimistic update for a log entry
   */
  const updateLogOptimistic = useCallback((
    habitId: string,
    date: string,
    log: LogEntry | null
  ) => {
    setLogsMap((prev) => {
      const newMap = new Map(prev);
      const key = makeLogKey(habitId, date);
      if (log) {
        newMap.set(key, log);
      } else {
        newMap.delete(key);
      }
      return newMap;
    });
  }, []);

  /**
   * Handle single tap (toggle completed)
   */
  const handleSingleTap = useCallback(async (habitId: string, date: string) => {
    const existing = logsMap.get(makeLogKey(habitId, date));
    
    // Optimistic update
    if (!existing) {
      // Empty → completed
      const optimisticLog: LogEntry = {
        id: 'temp-' + Date.now(),
        habitId,
        date,
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updateLogOptimistic(habitId, date, optimisticLog);
      
      try {
        const realLog = await logsRepository.upsert({ habitId, date, status: 'completed' });
        updateLogOptimistic(habitId, date, realLog);
      } catch (err) {
        console.error('Failed to save log:', err);
        updateLogOptimistic(habitId, date, null); // Revert
      }
    } else if (existing.status === 'completed') {
      // Completed → empty
      updateLogOptimistic(habitId, date, null);
      
      try {
        await logsRepository.deleteByHabitAndDate(habitId, date);
      } catch (err) {
        console.error('Failed to delete log:', err);
        updateLogOptimistic(habitId, date, existing); // Revert
      }
    } else {
      // Skipped → completed (replace)
      const optimisticLog: LogEntry = { ...existing, status: 'completed' };
      updateLogOptimistic(habitId, date, optimisticLog);
      
      try {
        const realLog = await logsRepository.upsert({ habitId, date, status: 'completed' });
        updateLogOptimistic(habitId, date, realLog);
      } catch (err) {
        console.error('Failed to update log:', err);
        updateLogOptimistic(habitId, date, existing); // Revert
      }
    }
  }, [logsMap, updateLogOptimistic]);

  /**
   * Handle double tap (toggle skipped)
   */
  const handleDoubleTap = useCallback(async (habitId: string, date: string) => {
    const existing = logsMap.get(makeLogKey(habitId, date));
    
    if (!existing) {
      // Empty → skipped
      const optimisticLog: LogEntry = {
        id: 'temp-' + Date.now(),
        habitId,
        date,
        status: 'skipped',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updateLogOptimistic(habitId, date, optimisticLog);
      
      try {
        const realLog = await logsRepository.upsert({ habitId, date, status: 'skipped' });
        updateLogOptimistic(habitId, date, realLog);
      } catch (err) {
        console.error('Failed to save log:', err);
        updateLogOptimistic(habitId, date, null); // Revert
      }
    } else if (existing.status === 'skipped') {
      // Skipped → empty
      updateLogOptimistic(habitId, date, null);
      
      try {
        await logsRepository.deleteByHabitAndDate(habitId, date);
      } catch (err) {
        console.error('Failed to delete log:', err);
        updateLogOptimistic(habitId, date, existing); // Revert
      }
    } else {
      // Completed → skipped (replace)
      const optimisticLog: LogEntry = { ...existing, status: 'skipped' };
      updateLogOptimistic(habitId, date, optimisticLog);
      
      try {
        const realLog = await logsRepository.upsert({ habitId, date, status: 'skipped' });
        updateLogOptimistic(habitId, date, realLog);
      } catch (err) {
        console.error('Failed to update log:', err);
        updateLogOptimistic(habitId, date, existing); // Revert
      }
    }
  }, [logsMap, updateLogOptimistic]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await loadHabits();
    if (result) {
      const { habits: h, dates: d } = result;
      // Clear and reload logs
      setLogsMap(new Map());
      if (d.length > 0) {
        await loadLogsForRange(h, d[0], d[d.length - 1]);
      }
    }
    setLoading(false);
  }, [loadHabits, loadLogsForRange]);

  return {
    habits,
    dates,
    loading,
    error,
    getLog,
    handleSingleTap,
    handleDoubleTap,
    refresh,
    todayIndex: getTodayIndex(dates),
    today: getToday(),
  };
}
