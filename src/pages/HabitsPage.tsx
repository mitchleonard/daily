import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cloudHabitsRepository as habitsRepository } from '../db';
import type { Habit, NewHabit } from '../db/types';
import { HabitFormModal, HabitRow, SortableHabitRow } from '../components/habits';

/**
 * Habits Page - Manage habits (add, edit, reorder, archive)
 * Features drag-and-drop reordering with touch support
 */
export function HabitsPage() {
  // State
  const [habits, setHabits] = useState<Habit[]>([]);
  const [archivedHabits, setArchivedHabits] = useState<Habit[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>(undefined);

  // Configure sensors for drag-and-drop
  // PointerSensor for mouse, TouchSensor for mobile with activation delay
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms long-press to start drag on mobile
        tolerance: 5, // 5px movement tolerance during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * Load habits from database
   */
  const loadHabits = useCallback(async () => {
    try {
      setError(null);
      const [active, all] = await Promise.all([
        habitsRepository.getAll(false),
        habitsRepository.getAll(true),
      ]);
      setHabits(active);
      setArchivedHabits(all.filter((h) => h.archivedAt !== null));
    } catch (err) {
      console.error('Failed to load habits:', err);
      setError('Failed to load habits. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  /**
   * Handle drag end - reorder habits and persist
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = habits.findIndex((h) => h.id === active.id);
    const newIndex = habits.findIndex((h) => h.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistically update UI
    const newHabits = arrayMove(habits, oldIndex, newIndex);
    setHabits(newHabits);

    // Persist new sort orders
    try {
      const sortOrders = newHabits.map((habit, index) => ({
        id: habit.id,
        sortOrder: index,
      }));
      await habitsRepository.reorder(sortOrders);
    } catch (err) {
      console.error('Failed to persist reorder:', err);
      setError('Failed to save new order. Please try again.');
      // Revert on error
      await loadHabits();
    }
  };

  /**
   * Create a new habit
   */
  const handleCreate = async (data: NewHabit) => {
    await habitsRepository.create(data);
    await loadHabits();
  };

  /**
   * Update an existing habit
   */
  const handleUpdate = async (data: NewHabit) => {
    if (!editingHabit) return;
    await habitsRepository.update(editingHabit.id, data);
    await loadHabits();
  };

  /**
   * Archive a habit
   */
  const handleArchive = async (id: string) => {
    try {
      await habitsRepository.archive(id);
      await loadHabits();
    } catch (err) {
      console.error('Failed to archive habit:', err);
      setError('Failed to archive habit.');
    }
  };

  /**
   * Unarchive a habit (adds to end of list)
   */
  const handleUnarchive = async (id: string) => {
    try {
      // Unarchive and move to end
      const maxSort = habits.length > 0 
        ? Math.max(...habits.map((h) => h.sortOrder)) 
        : -1;
      
      await habitsRepository.update(id, {
        archivedAt: null,
        sortOrder: maxSort + 1,
      });
      await loadHabits();
    } catch (err) {
      console.error('Failed to unarchive habit:', err);
      setError('Failed to unarchive habit.');
    }
  };

  /**
   * Open edit modal
   */
  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    setShowModal(true);
  };

  /**
   * Open create modal
   */
  const openCreateModal = () => {
    setEditingHabit(undefined);
    setShowModal(true);
  };

  /**
   * Close modal
   */
  const closeModal = () => {
    setShowModal(false);
    setEditingHabit(undefined);
  };

  if (loading) {
    return (
      <div className="page-container p-4 flex items-center justify-center">
        <div className="text-gray-400">Loading habits...</div>
      </div>
    );
  }

  return (
    <div className="page-container p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manage Habits</h1>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-accent-primary hover:bg-accent-primary/80
                     text-white font-medium rounded-lg transition-colors
                     flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          <span>Add Habit</span>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-accent-error/20 border border-accent-error/30 rounded-lg 
                        text-accent-error text-sm flex items-center justify-between">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-accent-error hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Active habits list with drag-and-drop */}
      <div className="space-y-2">
        {habits.length === 0 ? (
          <div className="card text-center py-8">
            <span className="text-4xl mb-3 block">📝</span>
            <p className="text-gray-400 mb-4">No habits yet</p>
            <button
              onClick={openCreateModal}
              className="text-accent-primary hover:underline"
            >
              Create your first habit
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={habits.map((h) => h.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {habits.map((habit) => (
                  <SortableHabitRow
                    key={habit.id}
                    habit={habit}
                    onEdit={openEditModal}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Drag hint */}
      {habits.length > 1 && (
        <p className="text-xs text-gray-500 text-center">
          Drag the ⋮⋮ handle to reorder habits
        </p>
      )}

      {/* Archived section toggle */}
      {archivedHabits.length > 0 && (
        <div className="pt-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <span>{showArchived ? '▼' : '▶'}</span>
            <span>Archived ({archivedHabits.length})</span>
          </button>

          {showArchived && (
            <div className="mt-3 space-y-2">
              {archivedHabits.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  isArchived
                  onEdit={openEditModal}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <HabitFormModal
          habit={editingHabit}
          onSave={editingHabit ? handleUpdate : handleCreate}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
