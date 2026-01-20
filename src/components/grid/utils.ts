import { GRID_START_DATE, DAYS_AHEAD } from './constants';
import type { Schedule } from '../../db/types';
import { isFrequencySchedule } from '../../db/types';

/**
 * Generate an array of date strings from startDate to endDate
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getToday(): string {
  return formatDate(new Date());
}

/**
 * Get the end date for the grid (today + DAYS_AHEAD)
 */
export function getGridEndDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + DAYS_AHEAD);
  return formatDate(date);
}

/**
 * Get the full date range for the grid
 */
export function getGridDates(): string[] {
  return generateDateRange(GRID_START_DATE, getGridEndDate());
}

/**
 * Get the index of today in the dates array
 */
export function getTodayIndex(dates: string[]): number {
  const today = getToday();
  return dates.indexOf(today);
}

/**
 * Parse a date string to Date object
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Get day of week from date string (0 = Sunday)
 */
export function getDayOfWeek(dateStr: string): number {
  return parseDate(dateStr).getDay();
}

/**
 * Check if a date is scheduled for a habit
 * For frequency-based schedules, all days are considered "scheduled" 
 * (user chooses when to complete)
 */
export function isScheduledDay(
  dateStr: string, 
  scheduleDays: Schedule
): boolean {
  if (scheduleDays === 'everyday') return true;
  if (isFrequencySchedule(scheduleDays)) return true; // All days are valid for frequency habits
  const dayOfWeek = getDayOfWeek(dateStr);
  return scheduleDays.includes(dayOfWeek);
}

/**
 * Format date for header display (e.g., "Thu 16")
 */
export function formatHeaderDate(dateStr: string): { 
  dayAbbrev: string; 
  dayNum: number;
  monthAbbrev: string;
  isFirstOfMonth: boolean;
} {
  const date = parseDate(dateStr);
  const dayAbbrev = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
  const dayNum = date.getDate();
  const monthAbbrev = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
  const isFirstOfMonth = dayNum === 1;
  return { dayAbbrev, dayNum, monthAbbrev, isFirstOfMonth };
}

/**
 * Check if a date string is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getToday();
}

/**
 * Get date index in dates array, clamped to valid range
 */
export function getDateIndex(dates: string[], dateStr: string): number {
  const index = dates.indexOf(dateStr);
  if (index === -1) {
    // Date not in range - find closest
    if (dateStr < dates[0]) return 0;
    if (dateStr > dates[dates.length - 1]) return dates.length - 1;
    // Binary search for closest
    for (let i = 0; i < dates.length - 1; i++) {
      if (dateStr >= dates[i] && dateStr < dates[i + 1]) {
        return i;
      }
    }
    return dates.length - 1;
  }
  return index;
}
