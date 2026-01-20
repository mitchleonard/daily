import { useState, useEffect } from 'react';
import type { Habit, NewHabit, Schedule } from '../../db/types';
import { isFrequencySchedule } from '../../db/types';
import { ColorPicker } from './ColorPicker';
import { WeekdayPicker } from './WeekdayPicker';
import { EmojiPicker } from './EmojiPicker';
import { HABIT_COLORS, DEFAULT_START_DATE } from './constants';

interface HabitFormModalProps {
  habit?: Habit; // If provided, we're editing; otherwise creating
  onSave: (data: NewHabit) => Promise<void>;
  onClose: () => void;
}

/**
 * Modal for creating or editing a habit
 */
export function HabitFormModal({ habit, onSave, onClose }: HabitFormModalProps) {
  const isEditing = !!habit;
  
  // Form state
  const [name, setName] = useState(habit?.name || '');
  const [icon, setIcon] = useState(habit?.icon || '');
  const [color, setColor] = useState(habit?.color || HABIT_COLORS[0].hex);
  const [scheduleDays, setScheduleDays] = useState<Schedule>(
    habit?.scheduleDays || 'everyday'
  );
  const [startDate, setStartDate] = useState(habit?.startDate || DEFAULT_START_DATE);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Validation
  const validate = (): string | null => {
    if (!name.trim()) return 'Name is required';
    if (!icon) return 'Icon is required';
    if (!color) return 'Color is required';
    // Check schedule is valid
    if (Array.isArray(scheduleDays) && scheduleDays.length === 0) {
      return 'Select at least one day';
    }
    if (isFrequencySchedule(scheduleDays) && (scheduleDays.timesPerWeek < 1 || scheduleDays.timesPerWeek > 7)) {
      return 'Frequency must be between 1 and 7 times per week';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        icon,
        color,
        scheduleDays,
        startDate,
        archivedAt: habit?.archivedAt || null,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save habit:', err);
      setError('Failed to save habit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Get today's date for min date validation
  const today = new Date().toISOString().split('T')[0];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto
                   bg-dark-surface border-t sm:border border-dark-border 
                   sm:rounded-2xl rounded-t-2xl p-5 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-dark-elevated flex items-center justify-center
                       text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Habit Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Workout"
              className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                         text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
              autoFocus
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Icon *
            </label>
            <EmojiPicker value={icon} onChange={setIcon} />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Color *
            </label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Schedule *
            </label>
            <WeekdayPicker value={scheduleDays} onChange={setScheduleDays} />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={DEFAULT_START_DATE}
              max={today}
              className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                         text-white focus:border-accent-primary focus:outline-none
                         [color-scheme:dark]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Habits are tracked from this date onwards
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-accent-error/20 border border-accent-error/30 rounded-lg text-accent-error text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 px-4 bg-dark-elevated border border-dark-border
                         text-gray-300 font-medium rounded-lg hover:bg-dark-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 px-4 bg-accent-primary hover:bg-accent-primary/80
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-medium rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
