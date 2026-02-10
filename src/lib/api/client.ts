/**
 * API Client for authenticated requests to the backend
 */

import { awsConfig } from '../auth/config';
import { getIdToken } from '../auth/cognito';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getIdToken();
  
  if (!token) {
    throw new ApiError(401, 'Not authenticated');
  }

  const url = `${awsConfig.apiEndpoint}${path}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(response.status, error.error || 'Request failed');
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ==================== HABITS API ====================

export interface ApiHabit {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  scheduleDays: 'everyday' | number[] | { type: 'frequency'; timesPerWeek: number };
  startDate: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  sortOrder: number;
}

export interface CreateHabitData {
  id: string;
  name: string;
  icon: string;
  color: string;
  scheduleDays: 'everyday' | number[] | { type: 'frequency'; timesPerWeek: number };
  startDate: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  sortOrder: number;
}

export async function getHabits(includeArchived = false): Promise<ApiHabit[]> {
  const params = includeArchived ? '?includeArchived=true' : '';
  const response = await apiRequest<{ habits: ApiHabit[] }>('GET', `/habits${params}`);
  return response.habits;
}

export async function getHabit(habitId: string): Promise<ApiHabit> {
  const response = await apiRequest<{ habit: ApiHabit }>('GET', `/habits/${habitId}`);
  return response.habit;
}

export async function createHabit(data: CreateHabitData): Promise<ApiHabit> {
  const response = await apiRequest<{ habit: ApiHabit }>('POST', '/habits', data);
  return response.habit;
}

export async function updateHabit(habitId: string, data: Partial<ApiHabit>): Promise<ApiHabit> {
  const response = await apiRequest<{ habit: ApiHabit }>('PUT', `/habits/${habitId}`, data);
  return response.habit;
}

export async function deleteHabit(habitId: string): Promise<void> {
  await apiRequest<void>('DELETE', `/habits/${habitId}`);
}

export async function reorderHabits(habitIds: string[]): Promise<void> {
  await apiRequest<void>('PUT', '/habits/reorder', { habitIds });
}

// ==================== LOGS API ====================

export interface ApiLogEntry {
  id: string;
  userId: string;
  habitId: string;
  date: string;
  status: 'completed' | 'skipped';
  createdAt: string;
  updatedAt: string;
}

export async function getLogs(startDate?: string, endDate?: string): Promise<ApiLogEntry[]> {
  let params = '';
  if (startDate && endDate) {
    params = `?startDate=${startDate}&endDate=${endDate}`;
  }
  const response = await apiRequest<{ logs: ApiLogEntry[] }>('GET', `/logs${params}`);
  return response.logs;
}

export async function upsertLog(
  habitId: string,
  date: string,
  status: 'completed' | 'skipped'
): Promise<ApiLogEntry> {
  const response = await apiRequest<{ log: ApiLogEntry }>('POST', '/logs', {
    habitId,
    date,
    status,
  });
  return response.log;
}

export async function deleteLog(habitId: string, date: string): Promise<void> {
  await apiRequest<void>('DELETE', `/logs/${habitId}/${date}`);
}
