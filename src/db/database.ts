import Dexie, { type Table } from 'dexie';
import type { Habit, LogEntry } from './types';

/**
 * Daily IndexedDB Database
 * 
 * Schema:
 * - habits: Habit entities with sortOrder index
 * - logs: LogEntry entities with compound unique index on [habitId+date]
 */
export class DailyDatabase extends Dexie {
  habits!: Table<Habit, string>;
  logs!: Table<LogEntry, string>;

  constructor() {
    super('HabitGridDB');

    // Schema version 1
    this.version(1).stores({
      // Primary key is id, indexed by sortOrder and archivedAt for queries
      habits: 'id, sortOrder, archivedAt, startDate',
      // Primary key is id, compound unique index on [habitId+date], indexed by date and habitId
      logs: 'id, [habitId+date], habitId, date, status',
    });
  }
}

// Singleton database instance
export const db = new DailyDatabase();

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}
