import { db, generateId, now } from './database';
import type { LogEntry, NewLogEntry } from './types';

/**
 * Logs Repository
 * CRUD operations for LogEntry entities
 * Enforces unique constraint on (habitId, date)
 */
export const logsRepository = {
  /**
   * Get log entry for a specific habit and date
   * Returns undefined if no log exists (empty cell)
   */
  async getByHabitAndDate(habitId: string, date: string): Promise<LogEntry | undefined> {
    return db.logs.where('[habitId+date]').equals([habitId, date]).first();
  },

  /**
   * Get all logs for a specific date
   */
  async getByDate(date: string): Promise<LogEntry[]> {
    return db.logs.where('date').equals(date).toArray();
  },

  /**
   * Get all logs for a specific habit
   */
  async getByHabit(habitId: string): Promise<LogEntry[]> {
    return db.logs.where('habitId').equals(habitId).toArray();
  },

  /**
   * Get all logs within a date range (inclusive)
   */
  async getByDateRange(startDate: string, endDate: string): Promise<LogEntry[]> {
    return db.logs
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  },

  /**
   * Get all logs for a habit within a date range
   */
  async getByHabitAndDateRange(
    habitId: string,
    startDate: string,
    endDate: string
  ): Promise<LogEntry[]> {
    return db.logs
      .where('habitId')
      .equals(habitId)
      .and((log) => log.date >= startDate && log.date <= endDate)
      .toArray();
  },

  /**
   * Create or update a log entry (upsert)
   * Enforces unique constraint on (habitId, date)
   */
  async upsert(data: NewLogEntry): Promise<LogEntry> {
    const existing = await this.getByHabitAndDate(data.habitId, data.date);
    const timestamp = now();

    if (existing) {
      // Update existing log
      const updated: LogEntry = {
        ...existing,
        status: data.status,
        updatedAt: timestamp,
      };
      await db.logs.put(updated);
      return updated;
    }

    // Create new log
    const log: LogEntry = {
      id: generateId(),
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.logs.add(log);
    return log;
  },

  /**
   * Toggle a log entry status
   * - If no log exists: create as completed
   * - If completed: remove the log (back to empty)
   * - If skipped: remove the log (back to empty)
   */
  async toggleComplete(habitId: string, date: string): Promise<LogEntry | null> {
    const existing = await this.getByHabitAndDate(habitId, date);

    if (!existing) {
      // No log → create as completed
      return this.upsert({ habitId, date, status: 'completed' });
    }

    if (existing.status === 'completed') {
      // Completed → remove (empty)
      await this.delete(existing.id);
      return null;
    }

    // Skipped → remove (empty)
    await this.delete(existing.id);
    return null;
  },

  /**
   * Toggle skipped status (double-tap behavior)
   * - If no log exists: create as skipped
   * - If skipped: remove the log (back to empty)
   * - If completed: keep as completed (no change)
   */
  async toggleSkip(habitId: string, date: string): Promise<LogEntry | null> {
    const existing = await this.getByHabitAndDate(habitId, date);

    if (!existing) {
      // No log → create as skipped
      return this.upsert({ habitId, date, status: 'skipped' });
    }

    if (existing.status === 'skipped') {
      // Skipped → remove (empty)
      await this.delete(existing.id);
      return null;
    }

    // Completed → no change on double-tap
    return existing;
  },

  /**
   * Delete a log entry by ID
   */
  async delete(id: string): Promise<boolean> {
    const log = await db.logs.get(id);
    if (!log) return false;
    await db.logs.delete(id);
    return true;
  },

  /**
   * Delete log by habit and date
   */
  async deleteByHabitAndDate(habitId: string, date: string): Promise<boolean> {
    const count = await db.logs.where('[habitId+date]').equals([habitId, date]).delete();
    return count > 0;
  },

  /**
   * Get total log count
   */
  async count(): Promise<number> {
    return db.logs.count();
  },

  /**
   * Clear all logs (for testing/reset)
   */
  async clear(): Promise<void> {
    await db.logs.clear();
  },

  /**
   * Bulk insert logs (for seeding)
   */
  async bulkCreate(logs: LogEntry[]): Promise<void> {
    await db.logs.bulkAdd(logs);
  },

  /**
   * Get logs grouped by date for a list of habits
   * Useful for grid rendering
   */
  async getLogsMap(
    habitIds: string[],
    startDate: string,
    endDate: string
  ): Promise<Map<string, Map<string, LogEntry>>> {
    const logs = await db.logs
      .where('date')
      .between(startDate, endDate, true, true)
      .and((log) => habitIds.includes(log.habitId))
      .toArray();

    // Map: habitId -> (date -> LogEntry)
    const result = new Map<string, Map<string, LogEntry>>();
    
    for (const log of logs) {
      if (!result.has(log.habitId)) {
        result.set(log.habitId, new Map());
      }
      result.get(log.habitId)!.set(log.date, log);
    }

    return result;
  },
};
