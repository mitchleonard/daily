import { db, generateId, now } from './database';
import { habitsRepository } from './habitsRepository';
import { logsRepository } from './logsRepository';
import type { Habit, LogEntry, Schedule } from './types';
import { isFrequencySchedule } from './types';

/**
 * Sample habits for seeding the database
 * 10 habits with variety of schedules, icons, and colors
 */
const SAMPLE_HABITS: Array<Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>> = [
  {
    name: 'Morning Workout',
    icon: '🏋️',
    color: '#22c55e', // green
    scheduleDays: [1, 2, 3, 4, 5], // Mon-Fri
    startDate: '2025-12-17',
    archivedAt: null,
  },
  {
    name: 'Meditation',
    icon: '🧘',
    color: '#8b5cf6', // purple
    scheduleDays: 'everyday',
    startDate: '2025-12-17',
    archivedAt: null,
  },
  {
    name: 'Read 30 minutes',
    icon: '📚',
    color: '#f59e0b', // amber
    scheduleDays: 'everyday',
    startDate: '2025-12-17',
    archivedAt: null,
  },
  {
    name: 'Drink 8 glasses of water',
    icon: '💧',
    color: '#06b6d4', // cyan
    scheduleDays: 'everyday',
    startDate: '2025-12-17',
    archivedAt: null,
  },
  {
    name: 'Take vitamins',
    icon: '💊',
    color: '#ec4899', // pink
    scheduleDays: 'everyday',
    startDate: '2025-12-17',
    archivedAt: null,
  },
  {
    name: 'Journal',
    icon: '✍️',
    color: '#6366f1', // indigo
    scheduleDays: [0, 3, 6], // Sun, Wed, Sat
    startDate: '2025-12-17',
    archivedAt: null,
  },
  {
    name: 'No social media before noon',
    icon: '📵',
    color: '#ef4444', // red
    scheduleDays: [1, 2, 3, 4, 5], // Mon-Fri
    startDate: '2025-12-17',
    archivedAt: null,
  },
  {
    name: 'Walk 10,000 steps',
    icon: '🚶',
    color: '#14b8a6', // teal
    scheduleDays: 'everyday',
    startDate: '2025-12-17',
    archivedAt: null,
  },
  {
    name: 'Practice guitar',
    icon: '🎸',
    color: '#f97316', // orange
    scheduleDays: [1, 3, 5], // Mon, Wed, Fri
    startDate: '2025-12-17',
    archivedAt: null,
  },
  {
    name: 'Cook healthy meal',
    icon: '🥗',
    color: '#84cc16', // lime
    scheduleDays: [0, 6], // Sat, Sun
    startDate: '2025-12-17',
    archivedAt: null,
  },
];

/**
 * Check if a date matches the habit's schedule
 */
function isScheduledDay(date: Date, scheduleDays: Schedule): boolean {
  if (scheduleDays === 'everyday') return true;
  if (isFrequencySchedule(scheduleDays)) return true;
  return scheduleDays.includes(date.getDay());
}

/**
 * Generate a date string in YYYY-MM-DD format
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate random logs for habits over a date range
 * Creates realistic completion patterns
 */
function generateSampleLogs(habits: Habit[], daysBack: number = 30): LogEntry[] {
  const logs: LogEntry[] = [];
  const today = new Date();
  const timestamp = now();

  for (const habit of habits) {
    // Each habit has a different completion rate (60-95%)
    const completionRate = 0.6 + Math.random() * 0.35;
    // Small skip rate (5-15%)
    const skipRate = 0.05 + Math.random() * 0.1;

    for (let daysAgo = 0; daysAgo < daysBack; daysAgo++) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      const dateStr = formatDate(date);

      // Skip if before habit start date
      if (dateStr < habit.startDate) continue;

      // Check if this is a scheduled day
      const scheduled = isScheduledDay(date, habit.scheduleDays);

      // Only generate logs for scheduled days (mostly)
      // Occasionally log on off-schedule days (10% chance)
      if (!scheduled && Math.random() > 0.1) continue;

      const roll = Math.random();

      if (roll < completionRate) {
        // Completed
        logs.push({
          id: generateId(),
          habitId: habit.id,
          date: dateStr,
          status: 'completed',
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      } else if (roll < completionRate + skipRate) {
        // Skipped
        logs.push({
          id: generateId(),
          habitId: habit.id,
          date: dateStr,
          status: 'skipped',
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
      // else: no log (empty cell)
    }
  }

  return logs;
}

/**
 * Seed the database with sample data
 * Clears existing data first
 */
export async function seedDatabase(): Promise<{ habits: number; logs: number }> {
  const timestamp = now();

  // Create habit objects with IDs and timestamps
  const habits: Habit[] = SAMPLE_HABITS.map((h, index) => ({
    ...h,
    id: generateId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    sortOrder: index,
  }));

  // Generate sample logs
  const logs = generateSampleLogs(habits, 30);

  // Clear and seed in a transaction
  await db.transaction('rw', [db.habits, db.logs], async () => {
    await db.habits.clear();
    await db.logs.clear();
    await db.habits.bulkAdd(habits);
    await db.logs.bulkAdd(logs);
  });

  return { habits: habits.length, logs: logs.length };
}

/**
 * Clear all data from the database
 */
export async function clearDatabase(): Promise<void> {
  await db.transaction('rw', [db.habits, db.logs], async () => {
    await db.habits.clear();
    await db.logs.clear();
  });
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  habitCount: number;
  logCount: number;
  archivedHabitCount: number;
}> {
  const [habitCount, logCount, archivedHabitCount] = await Promise.all([
    habitsRepository.count(false),
    logsRepository.count(),
    db.habits.filter((h) => h.archivedAt !== null).count(),
  ]);

  return { habitCount, logCount, archivedHabitCount };
}

/**
 * Check if database is empty
 */
export async function isDatabaseEmpty(): Promise<boolean> {
  const count = await habitsRepository.count(true);
  return count === 0;
}
