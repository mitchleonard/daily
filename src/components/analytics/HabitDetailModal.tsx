import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Habit } from '../../db/types';
import type { HabitStats, LogsMap } from '../../lib/analytics';
import { getDaysAgo, getToday, generateDateRange, isScheduledDay } from '../../lib/analytics';
import { formatSchedule } from '../habits/constants';

interface HabitDetailModalProps {
  habit: Habit;
  stats: HabitStats;
  logsMap: LogsMap;
  onClose: () => void;
}

/**
 * Detailed habit analytics modal
 */
export function HabitDetailModal({ habit, stats, logsMap, onClose }: HabitDetailModalProps) {
  const today = getToday();
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
  
  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Generate 90-day heat strip data
  const heatStripData = useMemo(() => {
    const dates = generateDateRange(getDaysAgo(89, today), today);
    return dates.map(date => {
      const status = logsMap.get(`${habit.id}:${date}`);
      const isScheduled = isScheduledDay(date, habit.scheduleDays) && date >= habit.startDate;
      return { date, status, isScheduled };
    });
  }, [habit, logsMap, today]);

  const [showMoreActivity, setShowMoreActivity] = useState(false);

  // Last 10 logs from 30 days (default); when expanded, up to 90 days
  const { recentLogs, hasMore, totalInWindow } = useMemo(() => {
    const entries: Array<{ date: string; status: 'completed' | 'skipped' }> = [];
    const startDate = showMoreActivity ? getDaysAgo(89, today) : getDaysAgo(29, today);
    const dates = generateDateRange(startDate, today).reverse();
    const limit = showMoreActivity ? 999 : 10;

    for (const date of dates) {
      const status = logsMap.get(`${habit.id}:${date}`);
      if (status) {
        entries.push({ date, status });
        if (entries.length >= limit) break;
      }
    }

    // Check if there are more entries in the 31-90 day range (only relevant when collapsed)
    let hasMoreEntries = false;
    if (!showMoreActivity) {
      const olderDates = generateDateRange(getDaysAgo(89, today), getDaysAgo(30, today));
      hasMoreEntries = olderDates.some(
        (d) => logsMap.get(`${habit.id}:${d}`) === 'completed' || logsMap.get(`${habit.id}:${d}`) === 'skipped'
      );
    }

    return {
      recentLogs: entries,
      hasMore: hasMoreEntries,
      totalInWindow: entries.length,
    };
  }, [habit.id, logsMap, today, showMoreActivity]);

  // Format schedule
  const scheduleText = formatSchedule(habit.scheduleDays);

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop - fixed with full viewport coverage to avoid blur sliver */}
      <div 
        className="fixed inset-0 min-h-screen min-h-[100dvh] bg-black/60 backdrop-blur-sm"
        aria-hidden
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto overflow-x-hidden
                   bg-dark-surface border-t sm:border border-dark-border 
                   sm:rounded-2xl rounded-t-2xl p-5 touch-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${habit.color}20` }}
          >
            {habit.icon}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{habit.name}</h2>
            <div className="text-sm text-gray-400">{scheduleText}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-dark-elevated flex items-center justify-center
                       text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div className="bg-dark-elevated rounded-lg py-2 text-center">
            <div className="text-xl font-bold text-accent-primary">{stats.currentStreak}</div>
            <div className="text-[10px] text-gray-500">Current</div>
          </div>
          <div className="bg-dark-elevated rounded-lg py-2 text-center">
            <div className="text-xl font-bold text-gray-300">{stats.longestStreak}</div>
            <div className="text-[10px] text-gray-500">Longest</div>
          </div>
          <div className="bg-dark-elevated rounded-lg py-2 text-center">
            <div className="text-xl font-bold text-gray-300">
              {stats.scheduledDays30 > 0 ? formatPercent(stats.rate30) : '—'}
            </div>
            <div className="text-[10px] text-gray-500">30d Rate</div>
          </div>
          <div className="bg-dark-elevated rounded-lg py-2 text-center">
            <div className="text-xl font-bold text-gray-300">
              {stats.scheduledDays90 > 0 ? formatPercent(stats.rate90) : '—'}
            </div>
            <div className="text-[10px] text-gray-500">90d Rate</div>
          </div>
        </div>
        <p className="text-[9px] text-gray-600 mb-4 leading-tight">
          Streaks = consecutive scheduled days. Rates = completed ÷ scheduled days.
        </p>

        {/* 90-Day Heat Strip */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Last 90 Days</h3>
          <div className="flex flex-wrap gap-[2px]">
            {heatStripData.map(({ date, status, isScheduled }) => {
              let bg = 'bg-dark-border/50';
              if (status === 'completed') {
                bg = '';
              } else if (status === 'skipped') {
                bg = 'bg-gray-600';
              } else if (!isScheduled) {
                bg = 'bg-dark-border/20';
              }
              
              return (
                <div
                  key={date}
                  className={`w-2 h-2 rounded-sm ${bg}`}
                  style={status === 'completed' ? { backgroundColor: habit.color } : undefined}
                  title={`${date}: ${status || (isScheduled ? 'empty' : 'off-schedule')}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-gray-600">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Recent Logs */}
        {recentLogs.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Recent Activity</h3>
            <p className="text-[11px] text-gray-500 mb-2">
              {showMoreActivity
                ? `Showing all entries from the last 90 days (${totalInWindow} total)`
                : 'Showing 10 most recent entries from the last 30 days'}
            </p>
            <div className="space-y-1">
              {recentLogs.map(({ date, status }) => {
                const d = new Date(date + 'T00:00:00');
                const formatted = d.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={date}
                    className="flex items-center justify-between py-1.5 px-2
                               bg-dark-elevated rounded-lg text-sm"
                  >
                    <span className="text-gray-400">{formatted}</span>
                    <span className={status === 'completed' ? 'text-accent-success' : 'text-gray-500'}>
                      {status === 'completed' ? '✓ Completed' : '— Skipped'}
                    </span>
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <button
                type="button"
                onClick={() => setShowMoreActivity(true)}
                className="mt-2 w-full py-2 text-sm text-accent-primary hover:text-accent-primary/80
                           border border-dark-border rounded-lg hover:bg-dark-elevated transition-colors"
              >
                Show more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
