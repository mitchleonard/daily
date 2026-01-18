/**
 * Constants for habit management
 */

/**
 * Color palette for habits (10 colors)
 */
export const HABIT_COLORS = [
  { id: 'green', hex: '#22c55e', name: 'Green' },
  { id: 'emerald', hex: '#10b981', name: 'Emerald' },
  { id: 'teal', hex: '#14b8a6', name: 'Teal' },
  { id: 'cyan', hex: '#06b6d4', name: 'Cyan' },
  { id: 'blue', hex: '#3b82f6', name: 'Blue' },
  { id: 'indigo', hex: '#6366f1', name: 'Indigo' },
  { id: 'purple', hex: '#8b5cf6', name: 'Purple' },
  { id: 'pink', hex: '#ec4899', name: 'Pink' },
  { id: 'orange', hex: '#f97316', name: 'Orange' },
  { id: 'amber', hex: '#f59e0b', name: 'Amber' },
] as const;

/**
 * Weekday configuration
 */
export const WEEKDAYS = [
  { id: 0, short: 'S', name: 'Sunday' },
  { id: 1, short: 'M', name: 'Monday' },
  { id: 2, short: 'T', name: 'Tuesday' },
  { id: 3, short: 'W', name: 'Wednesday' },
  { id: 4, short: 'T', name: 'Thursday' },
  { id: 5, short: 'F', name: 'Friday' },
  { id: 6, short: 'S', name: 'Saturday' },
] as const;

/**
 * Default start date per spec
 */
export const DEFAULT_START_DATE = '2025-12-17';

/**
 * Common emoji suggestions for habits
 */
export const EMOJI_SUGGESTIONS = [
  '🏋️', '🧘', '📚', '💧', '💊', '✍️', '🚶', '🎸', '🥗', '🧹',
  '💤', '🌅', '🧠', '💪', '🏃', '🚴', '🧘‍♀️', '📝', '🎯', '✅',
];

/**
 * Format schedule days for display
 */
export function formatSchedule(scheduleDays: number[] | 'everyday'): string {
  if (scheduleDays === 'everyday') return 'Daily';
  
  if (scheduleDays.length === 0) return 'No days';
  if (scheduleDays.length === 7) return 'Daily';
  
  // Check for weekdays only (Mon-Fri)
  const weekdaysOnly = [1, 2, 3, 4, 5];
  if (
    scheduleDays.length === 5 &&
    weekdaysOnly.every((d) => scheduleDays.includes(d))
  ) {
    return 'Weekdays';
  }
  
  // Check for weekends only
  const weekendsOnly = [0, 6];
  if (
    scheduleDays.length === 2 &&
    weekendsOnly.every((d) => scheduleDays.includes(d))
  ) {
    return 'Weekends';
  }
  
  // Format as day abbreviations
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sorted = [...scheduleDays].sort((a, b) => a - b);
  return sorted.map((d) => dayNames[d]).join(' ');
}
