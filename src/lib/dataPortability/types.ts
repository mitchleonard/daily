/**
 * Data Portability Types
 * Schema for export/import JSON files
 */

import type { Habit, LogEntry } from '../../db/types';

/**
 * Export file schema (v1)
 */
export interface ExportData {
  schemaVersion: 1;
  exportedAt: string; // ISO timestamp
  appName: string;
  habits: Habit[];
  logs: LogEntry[];
}

/**
 * Import validation result
 */
export interface ImportValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: ExportData | null;
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  habitsImported: number;
  logsImported: number;
  duplicateLogsSkipped: number;
  error?: string;
}

export const CURRENT_SCHEMA_VERSION = 1;
export const SUPPORTED_SCHEMA_VERSIONS = [1];
