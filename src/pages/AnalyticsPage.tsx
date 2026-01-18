import { useState, useEffect, useCallback } from 'react';
import { habitsRepository, logsRepository } from '../db';
import type { Habit } from '../db/types';
import type { HabitStats, OverviewStats, HabitConnection, LogsMap } from '../lib/analytics';
import {
  createLogsMap,
  computeHabitStats,
  computeOverviewStats,
  computeHabitConnections,
  getToday,
  getDaysAgo,
} from '../lib/analytics';
import {
  OverviewCard,
  HabitStatsCard,
  ConnectionsCard,
  HabitDetailModal,
} from '../components/analytics';

type SortOption = 'default' | 'streak' | 'rate30' | 'slipping';

/**
 * Analytics Page - View habit statistics and trends
 */
export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitStats, setHabitStats] = useState<Map<string, HabitStats>>(new Map());
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [connections, setConnections] = useState<HabitConnection[]>([]);
  const [logsMap, setLogsMap] = useState<LogsMap>(new Map());
  
  // UI state
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

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
        setLogsMap(new Map());
        setLoading(false);
        return;
      }
      
      // Fetch logs for last 120 days
      const startDate = getDaysAgo(120, today);
      const logs = await logsRepository.getByDateRange(startDate, today);
      
      // Create lookup map
      const lMap: LogsMap = createLogsMap(logs);
      setLogsMap(lMap);
      
      // Compute stats for each habit
      const stats = new Map<string, HabitStats>();
      for (const habit of allHabits) {
        stats.set(habit.id, computeHabitStats(habit, lMap, today));
      }
      setHabitStats(stats);
      
      // Compute overview
      const overviewStats = computeOverviewStats(allHabits, stats, lMap, today);
      setOverview(overviewStats);
      
      // Compute connections (only for active habits, limited count)
      const activeHabits = allHabits.filter(h => h.archivedAt === null);
      if (activeHabits.length >= 2 && activeHabits.length <= 15) {
        const conns = computeHabitConnections(activeHabits, lMap, today);
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

  // Sort habits
  const sortedHabits = [...habits].sort((a, b) => {
    const statsA = habitStats.get(a.id);
    const statsB = habitStats.get(b.id);
    
    if (!statsA || !statsB) return 0;
    
    switch (sortBy) {
      case 'streak':
        return statsB.currentStreak - statsA.currentStreak;
      case 'rate30':
        return statsB.rate30 - statsA.rate30;
      case 'slipping':
        return statsA.trendDelta - statsB.trendDelta; // Most negative first
      default:
        return a.sortOrder - b.sortOrder;
    }
  });

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container p-4">
        <div className="card text-center py-8">
          <span className="text-3xl mb-3 block">⚠️</span>
          <p className="text-accent-error mb-4">{error}</p>
          <button
            onClick={loadAnalytics}
            className="text-accent-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="page-container p-4">
        <div className="card text-center py-8">
          <span className="text-4xl mb-4 block">📊</span>
          <h2 className="text-xl font-semibold mb-2">No Data Yet</h2>
          <p className="text-gray-400 mb-4">
            Add some habits and log your progress to see analytics.
          </p>
          <a
            href="/habits"
            className="inline-block px-4 py-2 bg-accent-primary hover:bg-accent-primary/80
                       text-white font-medium rounded-lg transition-colors"
          >
            Add Habits
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <button
          onClick={loadAnalytics}
          className="text-sm text-gray-400 hover:text-white transition-colors"
          title="Refresh"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Overview */}
      {overview && <OverviewCard overview={overview} />}

      {/* Connections */}
      {connections.length > 0 && <ConnectionsCard connections={connections} />}

      {/* Habits List */}
      <div>
        {/* List Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-300">All Habits</h2>
          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-xs bg-dark-elevated border border-dark-border rounded-lg 
                         px-2 py-1 text-gray-300 focus:outline-none focus:border-accent-primary"
            >
              <option value="default">Default</option>
              <option value="streak">By Streak</option>
              <option value="rate30">By 30d Rate</option>
              <option value="slipping">Needs Work</option>
            </select>
          </div>
        </div>

        {/* Archived toggle */}
        <label className="flex items-center gap-2 mb-3 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="w-4 h-4 rounded bg-dark-elevated border-dark-border 
                       text-accent-primary focus:ring-accent-primary focus:ring-offset-0"
          />
          <span>Include archived</span>
        </label>

        {/* Habit cards */}
        <div className="space-y-3">
          {sortedHabits.map((habit) => {
            const stats = habitStats.get(habit.id);
            if (!stats) return null;
            
            return (
              <HabitStatsCard
                key={habit.id}
                habit={habit}
                stats={stats}
                onClick={() => setSelectedHabit(habit)}
              />
            );
          })}
        </div>
      </div>

      {/* Habit Detail Modal */}
      {selectedHabit && habitStats.get(selectedHabit.id) && (
        <HabitDetailModal
          habit={selectedHabit}
          stats={habitStats.get(selectedHabit.id)!}
          logsMap={logsMap}
          onClose={() => setSelectedHabit(null)}
        />
      )}
    </div>
  );
}
