import { supabase } from '../lib/supabase';
import { habitsRepository as localHabits } from './habitsRepository';
import { logsRepository as localLogs } from './logsRepository';
import { generateId, now } from './database';
import type { Habit, LogEntry, NewHabit, NewLogEntry, Schedule } from './types';

type HabitRow = { id: string; name: string; icon: string; color: string; schedule_days: Schedule; start_date: string; created_at: string; updated_at: string; archived_at: string | null; sort_order: number };
type LogRow = { id: string; habit_id: string; date: string; status: LogEntry['status']; created_at: string; updated_at: string };

function client() {
  if (!supabase) throw new Error('Daily is not configured yet.');
  return supabase;
}

async function useCloud(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.auth.getUser();
  return !error && Boolean(data.user);
}

function toHabit(row: HabitRow): Habit {
  return { id: row.id, name: row.name, icon: row.icon, color: row.color, scheduleDays: row.schedule_days, startDate: row.start_date, createdAt: row.created_at, updatedAt: row.updated_at, archivedAt: row.archived_at, sortOrder: row.sort_order };
}

function toLog(row: LogRow): LogEntry {
  return { id: row.id, habitId: row.habit_id, date: row.date, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

function habitUpdates(data: Partial<Omit<Habit, 'id' | 'createdAt'>>) {
  const updates: Record<string, unknown> = { updated_at: now() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.color !== undefined) updates.color = data.color;
  if (data.scheduleDays !== undefined) updates.schedule_days = data.scheduleDays;
  if (data.startDate !== undefined) updates.start_date = data.startDate;
  if (data.archivedAt !== undefined) updates.archived_at = data.archivedAt;
  if (data.sortOrder !== undefined) updates.sort_order = data.sortOrder;
  return updates;
}

export const cloudHabitsRepository = {
  async getAll(includeArchived = false): Promise<Habit[]> {
    if (!await useCloud()) return localHabits.getAll(includeArchived);
    let query = client().from('habits').select('*').order('sort_order');
    if (!includeArchived) query = query.is('archived_at', null);
    const { data, error } = await query;
    if (error) throw error;
    return (data as HabitRow[]).map(toHabit);
  },
  async getById(id: string): Promise<Habit | undefined> {
    if (!await useCloud()) return localHabits.getById(id);
    const { data, error } = await client().from('habits').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toHabit(data as HabitRow) : undefined;
  },
  async create(data: NewHabit): Promise<Habit> {
    if (!await useCloud()) return localHabits.create(data);
    const db = client();
    const { data: lastHabit, error: lastHabitError } = await db.from('habits').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    if (lastHabitError) throw lastHabitError;
    const timestamp = now();
    const { data: created, error } = await db.from('habits').insert({ id: generateId(), name: data.name, icon: data.icon, color: data.color, schedule_days: data.scheduleDays, start_date: data.startDate, created_at: timestamp, updated_at: timestamp, archived_at: data.archivedAt, sort_order: (lastHabit?.sort_order ?? -1) + 1 }).select().single();
    if (error) throw error;
    return toHabit(created as HabitRow);
  },
  async update(id: string, data: Partial<Omit<Habit, 'id' | 'createdAt'>>): Promise<Habit | undefined> {
    if (!await useCloud()) return localHabits.update(id, data);
    const { data: updated, error } = await client().from('habits').update(habitUpdates(data)).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return updated ? toHabit(updated as HabitRow) : undefined;
  },
  async archive(id: string): Promise<boolean> { return Boolean(await this.update(id, { archivedAt: now() })); },
  async unarchive(id: string): Promise<boolean> { return Boolean(await this.update(id, { archivedAt: null })); },
  async delete(id: string): Promise<boolean> {
    if (!await useCloud()) return localHabits.delete(id);
    const { error, count } = await client().from('habits').delete({ count: 'exact' }).eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },
  async reorder(orders: Array<{ id: string; sortOrder: number }>): Promise<void> {
    if (!await useCloud()) return localHabits.reorder(orders);
    await Promise.all(orders.map(async ({ id, sortOrder }) => {
      const { error } = await client().from('habits').update({ sort_order: sortOrder, updated_at: now() }).eq('id', id);
      if (error) throw error;
    }));
  },
  async count(includeArchived = false): Promise<number> {
    if (!await useCloud()) return localHabits.count(includeArchived);
    let query = client().from('habits').select('*', { count: 'exact', head: true });
    if (!includeArchived) query = query.is('archived_at', null);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  },
};

export const cloudLogsRepository = {
  async getByDateRange(startDate: string, endDate: string): Promise<LogEntry[]> {
    if (!await useCloud()) return localLogs.getByDateRange(startDate, endDate);
    const { data, error } = await client().from('habit_logs').select('*').gte('date', startDate).lte('date', endDate);
    if (error) throw error;
    return (data as LogRow[]).map(toLog);
  },
  async getByHabit(habitId: string): Promise<LogEntry[]> {
    if (!await useCloud()) return localLogs.getByHabit(habitId);
    const { data, error } = await client().from('habit_logs').select('*').eq('habit_id', habitId);
    if (error) throw error;
    return (data as LogRow[]).map(toLog);
  },
  async upsert(data: NewLogEntry): Promise<LogEntry> {
    if (!await useCloud()) return localLogs.upsert(data);
    const db = client();
    const { data: existing, error: existingError } = await db.from('habit_logs').select('*').eq('habit_id', data.habitId).eq('date', data.date).maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      const { data: updated, error } = await db.from('habit_logs').update({ status: data.status, updated_at: now() }).eq('id', existing.id).select().single();
      if (error) throw error;
      return toLog(updated as LogRow);
    }
    const timestamp = now();
    const { data: created, error } = await db.from('habit_logs').insert({ id: generateId(), habit_id: data.habitId, date: data.date, status: data.status, created_at: timestamp, updated_at: timestamp }).select().single();
    if (error) throw error;
    return toLog(created as LogRow);
  },
  async deleteByHabitAndDate(habitId: string, date: string): Promise<boolean> {
    if (!await useCloud()) return localLogs.deleteByHabitAndDate(habitId, date);
    const { count, error } = await client().from('habit_logs').delete({ count: 'exact' }).eq('habit_id', habitId).eq('date', date);
    if (error) throw error;
    return (count ?? 0) > 0;
  },
  async count(): Promise<number> {
    if (!await useCloud()) return localLogs.count();
    const { count, error } = await client().from('habit_logs').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  },
};
