import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Habit } from '../../db/types';
import { HabitRow } from './HabitRow';

interface SortableHabitRowProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
}

/**
 * Sortable wrapper for HabitRow using @dnd-kit
 * Provides drag-and-drop functionality with touch support
 */
export function SortableHabitRow({
  habit,
  onEdit,
  onArchive,
  onUnarchive,
}: SortableHabitRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: habit.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <HabitRow
        habit={habit}
        isDragging={isDragging}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
        onEdit={onEdit}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
      />
    </div>
  );
}
