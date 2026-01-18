import { db, generateId, now } from './database';
import type { Habit, NewHabit } from './types';

/**
 * Habits Repository
 * CRUD operations for Habit entities
 */
export const habitsRepository = {
  /**
   * Get all habits ordered by sortOrder
   * @param includeArchived - Whether to include archived habits
   */
  async getAll(includeArchived = false): Promise<Habit[]> {
    let query = db.habits.orderBy('sortOrder');
    
    if (!includeArchived) {
      query = query.filter((h) => h.archivedAt === null);
    }
    
    return query.toArray();
  },

  /**
   * Get a single habit by ID
   */
  async getById(id: string): Promise<Habit | undefined> {
    return db.habits.get(id);
  },

  /**
   * Create a new habit
   */
  async create(data: NewHabit): Promise<Habit> {
    // Get the max sortOrder to place new habit at the end
    const maxSort = await db.habits.orderBy('sortOrder').last();
    const sortOrder = (maxSort?.sortOrder ?? -1) + 1;

    const timestamp = now();
    const habit: Habit = {
      id: generateId(),
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
      sortOrder,
    };

    await db.habits.add(habit);
    return habit;
  },

  /**
   * Update an existing habit
   */
  async update(id: string, data: Partial<Omit<Habit, 'id' | 'createdAt'>>): Promise<Habit | undefined> {
    const habit = await db.habits.get(id);
    if (!habit) return undefined;

    const updated: Habit = {
      ...habit,
      ...data,
      updatedAt: now(),
    };

    await db.habits.put(updated);
    return updated;
  },

  /**
   * Archive a habit (soft delete)
   */
  async archive(id: string): Promise<boolean> {
    const habit = await db.habits.get(id);
    if (!habit) return false;

    await db.habits.update(id, {
      archivedAt: now(),
      updatedAt: now(),
    });
    return true;
  },

  /**
   * Unarchive a habit
   */
  async unarchive(id: string): Promise<boolean> {
    const habit = await db.habits.get(id);
    if (!habit) return false;

    await db.habits.update(id, {
      archivedAt: null,
      updatedAt: now(),
    });
    return true;
  },

  /**
   * Permanently delete a habit and all its logs
   */
  async delete(id: string): Promise<boolean> {
    const habit = await db.habits.get(id);
    if (!habit) return false;

    await db.transaction('rw', [db.habits, db.logs], async () => {
      await db.logs.where('habitId').equals(id).delete();
      await db.habits.delete(id);
    });
    return true;
  },

  /**
   * Reorder habits by providing new sort orders
   * @param orders - Array of { id, sortOrder } to update
   */
  async reorder(orders: Array<{ id: string; sortOrder: number }>): Promise<void> {
    const timestamp = now();
    await db.transaction('rw', db.habits, async () => {
      for (const { id, sortOrder } of orders) {
        await db.habits.update(id, { sortOrder, updatedAt: timestamp });
      }
    });
  },

  /**
   * Get habit count
   */
  async count(includeArchived = false): Promise<number> {
    if (includeArchived) {
      return db.habits.count();
    }
    return db.habits.filter((h) => h.archivedAt === null).count();
  },

  /**
   * Clear all habits (for testing/reset)
   */
  async clear(): Promise<void> {
    await db.habits.clear();
  },

  /**
   * Bulk insert habits (for seeding)
   */
  async bulkCreate(habits: Habit[]): Promise<void> {
    await db.habits.bulkAdd(habits);
  },
};
