import { useState } from 'react';
import type { Habit } from '../../db/types';
import { formatSchedule } from './constants';

interface HabitRowProps {
  habit: Habit;
  isArchived?: boolean;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onEdit: (habit: Habit) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
}

/**
 * Single habit row with drag handle and actions menu
 */
export function HabitRow({
  habit,
  isArchived = false,
  isDragging = false,
  dragHandleProps,
  onEdit,
  onArchive,
  onUnarchive,
}: HabitRowProps) {
  const [showMenu, setShowMenu] = useState(false);

  const scheduleText = formatSchedule(habit.scheduleDays);

  return (
    <div 
      className={`
        group flex items-center gap-3 p-3 rounded-xl
        bg-dark-surface border border-dark-border
        transition-all duration-150
        ${isDragging ? 'opacity-50 scale-[1.02] shadow-xl border-accent-primary/50' : ''}
        ${isArchived ? 'opacity-60' : 'hover:border-gray-600'}
      `}
    >
      {/* Drag handle (only for active habits) */}
      {!isArchived && dragHandleProps && (
        <button
          type="button"
          {...dragHandleProps}
          className="w-8 h-10 flex items-center justify-center text-gray-500 
                     hover:text-white cursor-grab active:cursor-grabbing
                     touch-none select-none transition-colors"
          aria-label="Drag to reorder"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="currentColor"
            className="pointer-events-none"
          >
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>
      )}

      {/* Spacer for archived habits (no drag handle) */}
      {isArchived && <div className="w-8" />}

      {/* Icon */}
      <div 
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: `${habit.color}20` }}
      >
        {habit.icon}
      </div>

      {/* Name and schedule */}
      <div 
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onEdit(habit)}
      >
        <div className="font-medium text-white truncate">{habit.name}</div>
        <div className="text-sm text-gray-400 flex items-center gap-2">
          <span>{scheduleText}</span>
        </div>
      </div>

      {/* Color swatch */}
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: habit.color }}
        title={habit.color}
      />

      {/* Actions menu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="w-10 h-10 flex items-center justify-center text-gray-400 
                     hover:text-white hover:bg-dark-elevated rounded-lg transition-colors"
          aria-label="More actions"
        >
          ⋮
        </button>

        {showMenu && (
          <>
            {/* Backdrop to close menu */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowMenu(false)} 
            />
            
            {/* Menu dropdown */}
            <div className="absolute right-0 top-full mt-1 z-20 
                            bg-dark-elevated border border-dark-border rounded-lg
                            shadow-xl min-w-[140px] py-1">
              <button
                type="button"
                onClick={() => {
                  onEdit(habit);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 
                           hover:bg-dark-border hover:text-white transition-colors"
              >
                ✏️ Edit
              </button>
              
              {isArchived ? (
                <button
                  type="button"
                  onClick={() => {
                    onUnarchive(habit.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-300 
                             hover:bg-dark-border hover:text-white transition-colors"
                >
                  📤 Unarchive
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onArchive(habit.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-accent-error
                             hover:bg-accent-error/10 transition-colors"
                >
                  📦 Archive
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
