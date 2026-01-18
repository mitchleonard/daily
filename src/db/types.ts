/**
 * Database types matching spec.md data model
 */

/**
 * Habit entity
 * Represents a trackable habit with schedule and display properties
 */
export interface Habit {
  id: string; // UUID
  name: string;
  icon: string; // Emoji
  color: string; // Hex color (e.g., "#22c55e")
  scheduleDays: number[] | 'everyday'; // 0-6 for Sun-Sat, or 'everyday'
  startDate: string; // YYYY-MM-DD
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  archivedAt: string | null; // ISO timestamp or null
  sortOrder: number;
}

/**
 * LogEntry entity
 * Represents a single habit log for a specific date
 * Constraint: Unique (habitId, date)
 */
export interface LogEntry {
  id: string; // UUID
  habitId: string; // References Habit.id
  date: string; // YYYY-MM-DD (local date)
  status: 'completed' | 'skipped';
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Helper type for creating new habits (without auto-generated fields)
 */
export type NewHabit = Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>;

/**
 * Helper type for creating new log entries
 */
export type NewLogEntry = Omit<LogEntry, 'id' | 'createdAt' | 'updatedAt'>;
