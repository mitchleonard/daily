/**
 * Cloud Repository
 * Uses AWS API for habits and logs when authenticated
 * Falls back to local IndexedDB when not configured or offline
 */

import { isAwsConfigured, getIdToken } from '../lib/auth';
import * as api from '../lib/api';
import { habitsRepository as localHabits } from './habitsRepository';
import { logsRepository as localLogs } from './logsRepository';
import { generateId, now } from './database';
import type { Habit, NewHabit, LogEntry, NewLogEntry } from './types';

/**
 * Check if we should use cloud mode
 */
async function useCloud(): Promise<boolean> {
  if (!isAwsConfigured()) return false;
  const token = await getIdToken();
  return !!token;
}

/**
 * Cloud-aware Habits Repository
 */
export const cloudHabitsRepository = {
  async getAll(includeArchived = false): Promise<Habit[]> {
    if (await useCloud()) {
      const habits = await api.getHabits(includeArchived);
      // Map API response to local type (remove userId)
      return habits.map(({ userId, ...habit }) => habit as Habit);
    }
    return localHabits.getAll(includeArchived);
  },

  async getById(id: string): Promise<Habit | undefined> {
    if (await useCloud()) {
      try {
        const habit = await api.getHabit(id);
        const { userId, ...rest } = habit;
        return rest as Habit;
      } catch {
        return undefined;
      }
    }
    return localHabits.getById(id);
  },

  async create(data: NewHabit): Promise<Habit> {
    const timestamp = now();
    const habit: Habit = {
      id: generateId(),
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
      sortOrder: Date.now(), // Will be normalized on server
    };

    if (await useCloud()) {
      const created = await api.createHabit(habit);
      const { userId, ...rest } = created;
      return rest as Habit;
    }
    return localHabits.create(data);
  },

  async update(id: string, data: Partial<Omit<Habit, 'id' | 'createdAt'>>): Promise<Habit | undefined> {
    if (await useCloud()) {
      try {
        const updated = await api.updateHabit(id, { ...data, updatedAt: now() });
        const { userId, ...rest } = updated;
        return rest as Habit;
      } catch {
        return undefined;
      }
    }
    return localHabits.update(id, data);
  },

  async archive(id: string): Promise<boolean> {
    if (await useCloud()) {
      try {
        await api.updateHabit(id, { archivedAt: now(), updatedAt: now() });
        return true;
      } catch {
        return false;
      }
    }
    return localHabits.archive(id);
  },

  async unarchive(id: string): Promise<boolean> {
    if (await useCloud()) {
      try {
        await api.updateHabit(id, { archivedAt: null, updatedAt: now() });
        return true;
      } catch {
        return false;
      }
    }
    return localHabits.unarchive(id);
  },

  async delete(id: string): Promise<boolean> {
    if (await useCloud()) {
      try {
        await api.deleteHabit(id);
        return true;
      } catch {
        return false;
      }
    }
    return localHabits.delete(id);
  },

  async reorder(orders: Array<{ id: string; sortOrder: number }>): Promise<void> {
    if (await useCloud()) {
      const habitIds = orders.sort((a, b) => a.sortOrder - b.sortOrder).map((o) => o.id);
      await api.reorderHabits(habitIds);
      return;
    }
    return localHabits.reorder(orders);
  },

  async count(includeArchived = false): Promise<number> {
    if (await useCloud()) {
      const habits = await api.getHabits(includeArchived);
      return habits.length;
    }
    return localHabits.count(includeArchived);
  },
};

/**
 * Cloud-aware Logs Repository
 */
export const cloudLogsRepository = {
  async getByDateRange(startDate: string, endDate: string): Promise<LogEntry[]> {
    if (await useCloud()) {
      const logs = await api.getLogs(startDate, endDate);
      return logs.map(({ userId, 'habitId#date': _, ...log }) => log as unknown as LogEntry);
    }
    return localLogs.getByDateRange(startDate, endDate);
  },

  async getByHabit(habitId: string): Promise<LogEntry[]> {
    if (await useCloud()) {
      // Get all logs and filter (could optimize with API parameter)
      const logs = await api.getLogs();
      return logs
        .filter((l) => l.habitId === habitId)
        .map(({ userId, ...log }) => log as unknown as LogEntry);
    }
    return localLogs.getByHabit(habitId);
  },

  async upsert(data: NewLogEntry): Promise<LogEntry> {
    if (await useCloud()) {
      const log = await api.upsertLog(data.habitId, data.date, data.status);
      const { userId, ...rest } = log;
      return rest as unknown as LogEntry;
    }
    return localLogs.upsert(data);
  },

  async deleteByHabitAndDate(habitId: string, date: string): Promise<boolean> {
    if (await useCloud()) {
      try {
        await api.deleteLog(habitId, date);
        return true;
      } catch {
        return false;
      }
    }
    return localLogs.deleteByHabitAndDate(habitId, date);
  },

  async count(): Promise<number> {
    if (await useCloud()) {
      const logs = await api.getLogs();
      return logs.length;
    }
    return localLogs.count();
  },
};
