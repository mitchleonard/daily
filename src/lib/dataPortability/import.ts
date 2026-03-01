/**
 * Import functionality
 * Validates and imports habit data from JSON files
 * When logged in, writes to cloud; otherwise writes to local IndexedDB
 */

import { db } from '../../db/database';
import { logsRepository } from '../../db/logsRepository';
import type { Habit, LogEntry } from '../../db/types';
import type { ExportData, ImportValidation, ImportResult } from './types';
import { SUPPORTED_SCHEMA_VERSIONS } from './types';
import { isAwsConfigured, getIdToken } from '../auth';
import * as api from '../api';

/**
 * Read file content as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Validate habit object has required fields
 */
function validateHabit(habit: unknown, index: number): string[] {
  const errors: string[] = [];
  const h = habit as Record<string, unknown>;
  
  if (!h || typeof h !== 'object') {
    errors.push(`Habit ${index}: not a valid object`);
    return errors;
  }
  
  if (!h.id || typeof h.id !== 'string') {
    errors.push(`Habit ${index}: missing or invalid 'id'`);
  }
  if (!h.name || typeof h.name !== 'string') {
    errors.push(`Habit ${index}: missing or invalid 'name'`);
  }
  if (h.sortOrder === undefined || typeof h.sortOrder !== 'number') {
    errors.push(`Habit ${index}: missing or invalid 'sortOrder'`);
  }
  if (!h.startDate || typeof h.startDate !== 'string') {
    errors.push(`Habit ${index}: missing or invalid 'startDate'`);
  }
  if (!h.scheduleDays) {
    errors.push(`Habit ${index}: missing 'scheduleDays'`);
  } else if (
    h.scheduleDays !== 'everyday' && 
    !Array.isArray(h.scheduleDays) &&
    !(typeof h.scheduleDays === 'object' && (h.scheduleDays as { type?: string }).type === 'frequency')
  ) {
    errors.push(`Habit ${index}: 'scheduleDays' must be 'everyday', an array of days, or a frequency object`);
  }
  
  return errors;
}

/**
 * Validate log entry object has required fields
 */
function validateLog(log: unknown, index: number): string[] {
  const errors: string[] = [];
  const l = log as Record<string, unknown>;
  
  if (!l || typeof l !== 'object') {
    errors.push(`Log ${index}: not a valid object`);
    return errors;
  }
  
  if (!l.habitId || typeof l.habitId !== 'string') {
    errors.push(`Log ${index}: missing or invalid 'habitId'`);
  }
  if (!l.date || typeof l.date !== 'string') {
    errors.push(`Log ${index}: missing or invalid 'date'`);
  }
  if (!l.status || !['completed', 'skipped'].includes(l.status as string)) {
    errors.push(`Log ${index}: invalid 'status' (must be 'completed' or 'skipped')`);
  }
  
  return errors;
}

/**
 * Validate import data structure and content
 */
export function validateImportData(jsonString: string): ImportValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Step 1: Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return {
      valid: false,
      errors: ['Invalid JSON format. Please provide a valid JSON file.'],
      warnings: [],
      data: null,
    };
  }
  
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['File does not contain a valid object.'],
      warnings: [],
      data: null,
    };
  }
  
  const obj = data as Record<string, unknown>;
  
  // Step 2: Check schema version
  if (!obj.schemaVersion || typeof obj.schemaVersion !== 'number') {
    errors.push("Missing or invalid 'schemaVersion'.");
  } else if (!SUPPORTED_SCHEMA_VERSIONS.includes(obj.schemaVersion)) {
    errors.push(`Unsupported schema version: ${obj.schemaVersion}. Supported: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}`);
  }
  
  // Step 3: Check habits array
  if (!Array.isArray(obj.habits)) {
    errors.push("Missing or invalid 'habits' array.");
  } else {
    // Validate first few habits for quick feedback
    const habitsToCheck = Math.min(obj.habits.length, 5);
    for (let i = 0; i < habitsToCheck; i++) {
      errors.push(...validateHabit(obj.habits[i], i));
    }
    if (obj.habits.length > 5) {
      // Just count remaining validation issues
      let additionalErrors = 0;
      for (let i = 5; i < obj.habits.length; i++) {
        additionalErrors += validateHabit(obj.habits[i], i).length;
      }
      if (additionalErrors > 0) {
        errors.push(`...and ${additionalErrors} more habit validation errors`);
      }
    }
  }
  
  // Step 4: Check logs array
  if (!Array.isArray(obj.logs)) {
    errors.push("Missing or invalid 'logs' array.");
  } else {
    // Validate first few logs for quick feedback
    const logsToCheck = Math.min(obj.logs.length, 5);
    for (let i = 0; i < logsToCheck; i++) {
      errors.push(...validateLog(obj.logs[i], i));
    }
    if (obj.logs.length > 5) {
      let additionalErrors = 0;
      for (let i = 5; i < obj.logs.length; i++) {
        additionalErrors += validateLog(obj.logs[i], i).length;
      }
      if (additionalErrors > 0) {
        errors.push(`...and ${additionalErrors} more log validation errors`);
      }
    }
  }
  
  // Check for potential duplicate logs
  if (Array.isArray(obj.logs)) {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const log of obj.logs as Array<{ habitId?: string; date?: string }>) {
      if (log.habitId && log.date) {
        const key = `${log.habitId}:${log.date}`;
        if (seen.has(key)) {
          duplicates++;
        } else {
          seen.add(key);
        }
      }
    }
    if (duplicates > 0) {
      warnings.push(`Found ${duplicates} duplicate log entries. Last occurrence will be used.`);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors, warnings, data: null };
  }
  
  return {
    valid: true,
    errors: [],
    warnings,
    data: obj as unknown as ExportData,
  };
}

/**
 * Deduplicate logs (keep last occurrence for each habitId+date)
 */
function deduplicateLogs(logs: LogEntry[]): { logs: LogEntry[]; duplicatesRemoved: number } {
  const map = new Map<string, LogEntry>();
  
  for (const log of logs) {
    const key = `${log.habitId}:${log.date}`;
    map.set(key, log); // Last write wins
  }
  
  const deduped = Array.from(map.values());
  return {
    logs: deduped,
    duplicatesRemoved: logs.length - deduped.length,
  };
}

async function useCloud(): Promise<boolean> {
  if (!isAwsConfigured()) return false;
  const token = await getIdToken();
  return !!token;
}

/**
 * Import data to cloud API (merge mode - never deletes existing data)
 */
async function importToCloud(data: ExportData): Promise<ImportResult> {
  const { logs: dedupedLogs, duplicatesRemoved } = deduplicateLogs(data.logs);
  const habitIds = new Set(data.habits.map((h) => h.id));

  // 1. Merge habits: create or update (never delete existing)
  for (const habit of data.habits as Habit[]) {
    try {
      const existing = await api.getHabit(habit.id);
      if (existing) {
        await api.updateHabit(habit.id, {
          name: habit.name,
          icon: habit.icon,
          color: habit.color,
          scheduleDays: habit.scheduleDays,
          startDate: habit.startDate,
          archivedAt: habit.archivedAt,
          sortOrder: habit.sortOrder,
        });
      } else {
        await api.createHabit({
          id: habit.id,
          name: habit.name,
          icon: habit.icon,
          color: habit.color,
          scheduleDays: habit.scheduleDays,
          startDate: habit.startDate,
          createdAt: habit.createdAt,
          updatedAt: habit.updatedAt,
          archivedAt: habit.archivedAt,
          sortOrder: habit.sortOrder,
        });
      }
    } catch {
      // getHabit throws for 404; create as new
      await api.createHabit({
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        scheduleDays: habit.scheduleDays,
        startDate: habit.startDate,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
        archivedAt: habit.archivedAt,
        sortOrder: habit.sortOrder,
      });
    }
  }

  // 2. Merge logs: upsert only (never delete existing)
  for (const log of dedupedLogs) {
    if (habitIds.has(log.habitId)) {
      await api.upsertLog(log.habitId, log.date, log.status);
    }
  }

  return {
    success: true,
    habitsImported: data.habits.length,
    logsImported: dedupedLogs.filter((l) => habitIds.has(l.habitId)).length,
    duplicateLogsSkipped: duplicatesRemoved,
  };
}

/**
 * Import data into the database (merge mode)
 * Adds/updates habits and logs from the file without deleting existing data.
 * Use for: bulk editing, seeding from other sources, or baseline for new users.
 */
export async function importData(data: ExportData): Promise<ImportResult> {
  try {
    const { logs: dedupedLogs, duplicatesRemoved } = deduplicateLogs(data.logs);

    if (await useCloud()) {
      return importToCloud(data);
    }

    // Local import (merge - never clear existing data)
    await db.transaction('rw', [db.habits, db.logs], async () => {
      if (data.habits.length > 0) {
        await db.habits.bulkPut(data.habits as Habit[]);
      }
      for (const log of dedupedLogs) {
        await logsRepository.upsert({ habitId: log.habitId, date: log.date, status: log.status });
      }
    });

    return {
      success: true,
      habitsImported: data.habits.length,
      logsImported: dedupedLogs.length,
      duplicateLogsSkipped: duplicatesRemoved,
    };
  } catch (error) {
    console.error('Import failed:', error);
    return {
      success: false,
      habitsImported: 0,
      logsImported: 0,
      duplicateLogsSkipped: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reset all data (clear habits and logs)
 */
export async function resetAllData(): Promise<boolean> {
  try {
    await db.transaction('rw', [db.habits, db.logs], async () => {
      await db.habits.clear();
      await db.logs.clear();
    });
    return true;
  } catch (error) {
    console.error('Reset failed:', error);
    return false;
  }
}
