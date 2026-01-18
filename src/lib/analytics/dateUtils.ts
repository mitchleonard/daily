/**
 * Date utilities for analytics computations
 */

/**
 * Format a Date to YYYY-MM-DD string
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
 * Get a date N days ago from today (or from a reference date)
 */
export function getDaysAgo(days: number, from?: string): string {
  const date = from ? new Date(from + 'T00:00:00') : new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
}

/**
 * Generate array of date strings from startDate to endDate (inclusive)
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
 * Get day of week from date string (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay();
}

/**
 * Check if a date matches the schedule
 */
export function isScheduledDay(
  dateStr: string,
  scheduleDays: number[] | 'everyday'
): boolean {
  if (scheduleDays === 'everyday') return true;
  return scheduleDays.includes(getDayOfWeek(dateStr));
}

/**
 * Get dates that are scheduled within a range for a habit
 */
export function getScheduledDatesInRange(
  startDate: string,
  endDate: string,
  scheduleDays: number[] | 'everyday',
  habitStartDate: string
): string[] {
  const allDates = generateDateRange(startDate, endDate);
  return allDates.filter(date => 
    date >= habitStartDate && isScheduledDay(date, scheduleDays)
  );
}
