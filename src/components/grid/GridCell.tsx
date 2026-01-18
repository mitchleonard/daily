import { memo, useState } from 'react';
import type { LogEntry } from '../../db/types';
import { CELL_SIZE } from './constants';

interface GridCellProps {
  log: LogEntry | undefined;
  habitColor: string;
  isScheduled: boolean;
  isToday: boolean;
  style: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
}

/**
 * A single grid cell representing one habit on one date
 * Memoized for performance
 */
export const GridCell = memo(function GridCell({
  log,
  habitColor,
  isScheduled,
  isToday,
  style,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
}: GridCellProps) {
  const [isPressed, setIsPressed] = useState(false);
  const status = log?.status;
  
  // Determine cell appearance
  let bgColor = 'transparent';
  let opacity = 1;
  let indicator: React.ReactNode = null;
  
  if (status === 'completed') {
    bgColor = habitColor;
    indicator = (
      <span className="text-white text-xs font-bold drop-shadow-sm">✓</span>
    );
  } else if (status === 'skipped') {
    bgColor = '#374151'; // gray-700
    indicator = (
      <span className="text-gray-400 text-xs">—</span>
    );
  } else {
    // Empty cell
    if (!isScheduled) {
      // Off-schedule: visually muted
      opacity = 0.3;
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsPressed(true);
    onPointerDown(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPressed(false);
    onPointerUp(e);
  };

  const handlePointerCancel = () => {
    setIsPressed(false);
    onPointerCancel();
  };
  
  return (
    <div
      style={{
        ...style,
        width: CELL_SIZE,
        height: CELL_SIZE,
      }}
      className={`
        absolute flex items-center justify-center
        border-r border-b border-dark-border/50
        select-none touch-none
        ${isToday ? 'bg-accent-primary/10' : ''}
      `}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
    >
      <div
        className={`
          w-8 h-8 rounded-md flex items-center justify-center 
          transition-transform duration-75
          ${isPressed ? 'scale-90' : 'scale-100'}
        `}
        style={{
          backgroundColor: bgColor,
          opacity,
        }}
      >
        {indicator}
      </div>
    </div>
  );
});
