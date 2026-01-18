/**
 * Analytics types
 */

export interface HabitStats {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  rate7: number;  // 0-1
  rate30: number; // 0-1
  rate90: number; // 0-1
  scheduledDays7: number;
  scheduledDays30: number;
  scheduledDays90: number;
  completedCount7: number;
  completedCount30: number;
  completedCount90: number;
  trend: TrendStatus;
  trendDelta: number; // -1 to 1
}

export type TrendStatus = 'improving' | 'slipping' | 'stable';

export interface OverviewStats {
  overallRate7: number;
  overallRate30: number;
  todayCompleted: number;
  todayScheduled: number;
  todayScore: number; // 0-1
  mostConsistent: HabitRanking[];
  slipping: HabitRanking[];
}

export interface HabitRanking {
  habitId: string;
  name: string;
  icon: string;
  color: string;
  value: number; // rate or delta
}

export interface HabitConnection {
  habitAId: string;
  habitAName: string;
  habitAIcon: string;
  habitBId: string;
  habitBName: string;
  habitBIcon: string;
  lift: number; // e.g., 0.22 means 22% more likely
  pWithA: number;
  pWithoutA: number;
}

/**
 * Logs lookup map: key is `${habitId}:${date}`, value is status
 */
export type LogsMap = Map<string, 'completed' | 'skipped'>;
