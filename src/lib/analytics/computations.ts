/**
 * Analytics computation functions
 * Pure functions for calculating streaks, rates, and trends
 */

import type { Habit } from '../../db/types';
import type { LogsMap, TrendStatus, HabitStats, OverviewStats, HabitRanking, HabitConnection } from './types';
import { 
  getToday, 
  getDaysAgo, 
  generateDateRange, 
  isScheduledDay, 
  getScheduledDatesInRange 
} from './dateUtils';

/**
 * Create a logs lookup map from log entries
 * Key: `${habitId}:${date}`, Value: status
 */
export function createLogsMap(
  logs: Array<{ habitId: string; date: string; status: 'completed' | 'skipped' }>
): LogsMap {
  const map = new Map<string, 'completed' | 'skipped'>();
  for (const log of logs) {
    map.set(`${log.habitId}:${log.date}`, log.status);
  }
  return map;
}

/**
 * Get log status for a habit on a date
 */
function getLogStatus(logsMap: LogsMap, habitId: string, date: string): 'completed' | 'skipped' | null {
  return logsMap.get(`${habitId}:${date}`) ?? null;
}

/**
 * Compute completion rate for a habit over a date range
 * Returns rate (0-1), scheduledDays count, and completed count
 */
export function computeRate(
  habit: Habit,
  logsMap: LogsMap,
  startDate: string,
  endDate: string
): { rate: number; scheduledDays: number; completed: number } {
  const scheduledDates = getScheduledDatesInRange(
    startDate,
    endDate,
    habit.scheduleDays,
    habit.startDate
  );
  
  const scheduledDays = scheduledDates.length;
  if (scheduledDays === 0) {
    return { rate: 0, scheduledDays: 0, completed: 0 };
  }
  
  let completed = 0;
  for (const date of scheduledDates) {
    if (getLogStatus(logsMap, habit.id, date) === 'completed') {
      completed++;
    }
  }
  
  return {
    rate: completed / scheduledDays,
    scheduledDays,
    completed,
  };
}

/**
 * Compute rates for 7, 30, and 90 day periods
 */
export function computeRates(
  habit: Habit,
  logsMap: LogsMap,
  today: string = getToday()
): {
  rate7: number;
  rate30: number;
  rate90: number;
  scheduledDays7: number;
  scheduledDays30: number;
  scheduledDays90: number;
  completedCount7: number;
  completedCount30: number;
  completedCount90: number;
} {
  const r7 = computeRate(habit, logsMap, getDaysAgo(6, today), today);
  const r30 = computeRate(habit, logsMap, getDaysAgo(29, today), today);
  const r90 = computeRate(habit, logsMap, getDaysAgo(89, today), today);
  
  return {
    rate7: r7.rate,
    rate30: r30.rate,
    rate90: r90.rate,
    scheduledDays7: r7.scheduledDays,
    scheduledDays30: r30.scheduledDays,
    scheduledDays90: r90.scheduledDays,
    completedCount7: r7.completed,
    completedCount30: r30.completed,
    completedCount90: r90.completed,
  };
}

/**
 * Compute current streak (consecutive scheduled days completed)
 * 
 * Rules:
 * - Count backwards from most recent completed scheduled day
 * - If today is scheduled and completed, include it
 * - If today is scheduled but unlogged, don't break streak (check from yesterday)
 * - Skipped breaks streak
 */
export function computeCurrentStreak(
  habit: Habit,
  logsMap: LogsMap,
  today: string = getToday()
): number {
  // Get scheduled dates going back 365 days
  const startDate = getDaysAgo(365, today);
  const scheduledDates = getScheduledDatesInRange(
    startDate,
    today,
    habit.scheduleDays,
    habit.startDate
  ).reverse(); // Most recent first
  
  if (scheduledDates.length === 0) return 0;
  
  let streak = 0;
  let startedCounting = false;
  
  for (const date of scheduledDates) {
    const status = getLogStatus(logsMap, habit.id, date);
    
    if (status === 'completed') {
      startedCounting = true;
      streak++;
    } else if (status === 'skipped') {
      // Skipped breaks the streak
      if (startedCounting) break;
      // If we haven't started counting yet, skip this day
      break;
    } else {
      // No log (empty)
      if (date === today) {
        // Today is unlogged - don't break streak, just skip
        continue;
      }
      // Past day is unlogged - breaks streak
      if (startedCounting) break;
      break;
    }
  }
  
  return streak;
}

/**
 * Compute longest streak within a date range
 */
export function computeLongestStreak(
  habit: Habit,
  logsMap: LogsMap,
  startDate: string,
  endDate: string
): number {
  const scheduledDates = getScheduledDatesInRange(
    startDate,
    endDate,
    habit.scheduleDays,
    habit.startDate
  );
  
  if (scheduledDates.length === 0) return 0;
  
  let longest = 0;
  let current = 0;
  
  for (const date of scheduledDates) {
    const status = getLogStatus(logsMap, habit.id, date);
    
    if (status === 'completed') {
      current++;
      longest = Math.max(longest, current);
    } else {
      // Skipped or empty breaks streak
      current = 0;
    }
  }
  
  return longest;
}

/**
 * Compute trend by comparing last 14 days vs previous 14 days
 */
export function computeTrend(
  habit: Habit,
  logsMap: LogsMap,
  today: string = getToday()
): { trend: TrendStatus; delta: number } {
  // Last 14 days (today - 13 to today)
  const last14End = today;
  const last14Start = getDaysAgo(13, today);
  
  // Previous 14 days (today - 27 to today - 14)
  const prev14End = getDaysAgo(14, today);
  const prev14Start = getDaysAgo(27, today);
  
  const last14Rate = computeRate(habit, logsMap, last14Start, last14End);
  const prev14Rate = computeRate(habit, logsMap, prev14Start, prev14End);
  
  // Handle cases where there's no data
  if (last14Rate.scheduledDays === 0 && prev14Rate.scheduledDays === 0) {
    return { trend: 'stable', delta: 0 };
  }
  
  const delta = last14Rate.rate - prev14Rate.rate;
  
  let trend: TrendStatus = 'stable';
  if (delta >= 0.20) {
    trend = 'improving';
  } else if (delta <= -0.20) {
    trend = 'slipping';
  }
  
  return { trend, delta };
}

/**
 * Compute all stats for a single habit
 */
export function computeHabitStats(
  habit: Habit,
  logsMap: LogsMap,
  today: string = getToday()
): HabitStats {
  const rates = computeRates(habit, logsMap, today);
  const currentStreak = computeCurrentStreak(habit, logsMap, today);
  const longestStreak = computeLongestStreak(
    habit,
    logsMap,
    getDaysAgo(365, today),
    today
  );
  const { trend, delta } = computeTrend(habit, logsMap, today);
  
  return {
    habitId: habit.id,
    currentStreak,
    longestStreak,
    ...rates,
    trend,
    trendDelta: delta,
  };
}

/**
 * Compute overview statistics across all habits
 */
export function computeOverviewStats(
  habits: Habit[],
  habitStats: Map<string, HabitStats>,
  logsMap: LogsMap,
  today: string = getToday()
): OverviewStats {
  // Compute overall rates
  let totalScheduled7 = 0;
  let totalCompleted7 = 0;
  let totalScheduled30 = 0;
  let totalCompleted30 = 0;
  
  for (const stats of habitStats.values()) {
    totalScheduled7 += stats.scheduledDays7;
    totalCompleted7 += stats.completedCount7;
    totalScheduled30 += stats.scheduledDays30;
    totalCompleted30 += stats.completedCount30;
  }
  
  const overallRate7 = totalScheduled7 > 0 ? totalCompleted7 / totalScheduled7 : 0;
  const overallRate30 = totalScheduled30 > 0 ? totalCompleted30 / totalScheduled30 : 0;
  
  // Today's score
  let todayCompleted = 0;
  let todayScheduled = 0;
  
  for (const habit of habits) {
    if (isScheduledDay(today, habit.scheduleDays) && today >= habit.startDate) {
      todayScheduled++;
      if (logsMap.get(`${habit.id}:${today}`) === 'completed') {
        todayCompleted++;
      }
    }
  }
  
  const todayScore = todayScheduled > 0 ? todayCompleted / todayScheduled : 0;
  
  // Most consistent (top 3 by 30-day rate, min 6 scheduled days)
  const mostConsistent: HabitRanking[] = habits
    .filter(h => {
      const stats = habitStats.get(h.id);
      return stats && stats.scheduledDays30 >= 6;
    })
    .map(h => {
      const stats = habitStats.get(h.id)!;
      return {
        habitId: h.id,
        name: h.name,
        icon: h.icon,
        color: h.color,
        value: stats.rate30,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  
  // Slipping (top 3 negative delta, min 6 scheduled days)
  const slipping: HabitRanking[] = habits
    .filter(h => {
      const stats = habitStats.get(h.id);
      return stats && stats.scheduledDays30 >= 6 && stats.trendDelta < 0;
    })
    .map(h => {
      const stats = habitStats.get(h.id)!;
      return {
        habitId: h.id,
        name: h.name,
        icon: h.icon,
        color: h.color,
        value: stats.trendDelta,
      };
    })
    .sort((a, b) => a.value - b.value) // Most negative first
    .slice(0, 3);
  
  return {
    overallRate7,
    overallRate30,
    todayCompleted,
    todayScheduled,
    todayScore,
    mostConsistent,
    slipping,
  };
}

/**
 * Compute habit connections (correlations)
 * "On days you complete A, you complete B X% more often"
 */
export function computeHabitConnections(
  habits: Habit[],
  logsMap: LogsMap,
  today: string = getToday()
): HabitConnection[] {
  if (habits.length < 2) return [];
  
  const startDate = getDaysAgo(29, today);
  const dates = generateDateRange(startDate, today);
  const connections: HabitConnection[] = [];
  
  // For each pair of habits
  for (let i = 0; i < habits.length; i++) {
    for (let j = 0; j < habits.length; j++) {
      if (i === j) continue;
      
      const habitA = habits[i];
      const habitB = habits[j];
      
      let daysACompleted = 0;
      let daysBCompletedWhenACompleted = 0;
      let daysANotCompleted = 0;
      let daysBCompletedWhenANotCompleted = 0;
      
      for (const date of dates) {
        // Only consider days where both habits are scheduled
        const aScheduled = isScheduledDay(date, habitA.scheduleDays) && date >= habitA.startDate;
        const bScheduled = isScheduledDay(date, habitB.scheduleDays) && date >= habitB.startDate;
        
        if (!aScheduled || !bScheduled) continue;
        
        const aStatus = logsMap.get(`${habitA.id}:${date}`);
        const bStatus = logsMap.get(`${habitB.id}:${date}`);
        
        if (aStatus === 'completed') {
          daysACompleted++;
          if (bStatus === 'completed') {
            daysBCompletedWhenACompleted++;
          }
        } else {
          daysANotCompleted++;
          if (bStatus === 'completed') {
            daysBCompletedWhenANotCompleted++;
          }
        }
      }
      
      // Require at least 10 days where A was completed for statistical validity
      if (daysACompleted < 10 || daysANotCompleted < 5) continue;
      
      const pWithA = daysBCompletedWhenACompleted / daysACompleted;
      const pWithoutA = daysBCompletedWhenANotCompleted / daysANotCompleted;
      const lift = pWithA - pWithoutA;
      
      // Only include if there's a meaningful positive correlation
      if (lift >= 0.15) {
        connections.push({
          habitAId: habitA.id,
          habitAName: habitA.name,
          habitAIcon: habitA.icon,
          habitBId: habitB.id,
          habitBName: habitB.name,
          habitBIcon: habitB.icon,
          lift,
          pWithA,
          pWithoutA,
        });
      }
    }
  }
  
  // Return top 3 by lift
  return connections.sort((a, b) => b.lift - a.lift).slice(0, 3);
}
