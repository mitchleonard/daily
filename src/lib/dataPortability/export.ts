/**
 * Export functionality
 * Exports all habits and logs to a downloadable JSON file
 */

import { cloudHabitsRepository, cloudLogsRepository } from '../../db';
import type { ExportData } from './types';
import { CURRENT_SCHEMA_VERSION } from './types';

/**
 * Gather all data for export
 */
export async function gatherExportData(): Promise<ExportData> {
  // The cloud repositories fall back to IndexedDB when the app is offline.
  const habits = await cloudHabitsRepository.getAll(true);
  const logs = await cloudLogsRepository.getByDateRange('0001-01-01', '9999-12-31');

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'Daily',
    habits,
    logs,
  };
}

/**
 * Generate export filename with current date
 */
export function generateExportFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `daily-export-${date}.json`;
}

/**
 * Trigger download of JSON data
 */
export function downloadJsonFile(data: ExportData, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export all data and trigger download
 */
export async function exportAllData(): Promise<{ success: boolean; filename: string }> {
  try {
    const data = await gatherExportData();
    const filename = generateExportFilename();
    downloadJsonFile(data, filename);
    return { success: true, filename };
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}
