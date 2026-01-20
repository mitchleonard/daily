import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { Habit, LogEntry } from '../../db/types';
import { GridCell } from './GridCell';
import { JumpToDateModal } from './JumpToDateModal';
import { useTapHandler } from './useTapHandler';
import { useViewportPersistence } from './useViewportPersistence';
import { formatHeaderDate, isScheduledDay, isToday as checkIsToday, getDateIndex } from './utils';
import {
  CELL_SIZE,
  LEFT_COLUMN_WIDTH,
  HEADER_HEIGHT,
  OVERSCAN,
  TODAY_BUTTON_THRESHOLD,
} from './constants';

interface VirtualizedGridProps {
  habits: Habit[];
  dates: string[];
  getLog: (habitId: string, date: string) => LogEntry | undefined;
  onSingleTap: (habitId: string, date: string) => void;
  onDoubleTap: (habitId: string, date: string) => void;
  todayIndex: number;
}

/**
 * Virtualized 2D grid with sticky headers
 * - Renders only visible cells + overscan
 * - Supports diagonal panning
 * - Sticky date header and habit column
 * - Today button with proximity-based visibility
 * - Jump to date functionality
 * - Viewport persistence
 */
export function VirtualizedGrid({
  habits,
  dates,
  getLog,
  onSingleTap,
  onDoubleTap,
  todayIndex,
}: VirtualizedGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [showJumpModal, setShowJumpModal] = useState(false);

  // Total grid dimensions
  const totalWidth = dates.length * CELL_SIZE;
  const totalHeight = habits.length * CELL_SIZE;

  // Viewport persistence
  const { getInitialPosition, savePosition, markRestored, getTodayScrollLeft } = 
    useViewportPersistence({ todayIndex, viewportWidth });

  // Tap handler
  const { handlePointerDown, handlePointerUp, handlePointerCancel } = useTapHandler({
    onSingleTap,
    onDoubleTap,
  });

  // Measure viewport on mount and resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateViewport = () => {
      const rect = container.getBoundingClientRect();
      setViewportWidth(rect.width);
      setViewportHeight(rect.height);
    };

    updateViewport();
    
    const observer = new ResizeObserver(updateViewport);
    observer.observe(container);
    
    return () => observer.disconnect();
  }, []);

  // Restore viewport position on initial load
  useEffect(() => {
    if (viewportWidth > 0 && containerRef.current && todayIndex >= 0) {
      const initial = getInitialPosition();
      if (initial) {
        containerRef.current.scrollLeft = initial.scrollLeft;
        containerRef.current.scrollTop = initial.scrollTop;
        setScrollLeft(initial.scrollLeft);
        setScrollTop(initial.scrollTop);
        markRestored();
      }
    }
  }, [viewportWidth, todayIndex, getInitialPosition, markRestored]);

  // Handle scroll - update state and save position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const left = target.scrollLeft;
    const top = target.scrollTop;
    setScrollLeft(left);
    setScrollTop(top);
    savePosition(left, top);
  }, [savePosition]);

  // Calculate if user is near today (for Today button visibility)
  const isNearToday = useMemo(() => {
    if (todayIndex < 0 || viewportWidth === 0) return true;
    const currentCenterCol = (scrollLeft + viewportWidth / 2) / CELL_SIZE;
    return Math.abs(currentCenterCol - todayIndex) <= TODAY_BUTTON_THRESHOLD;
  }, [scrollLeft, viewportWidth, todayIndex]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startCol = Math.max(0, Math.floor(scrollLeft / CELL_SIZE) - OVERSCAN);
    const endCol = Math.min(
      dates.length - 1,
      Math.ceil((scrollLeft + viewportWidth) / CELL_SIZE) + OVERSCAN
    );
    const startRow = Math.max(0, Math.floor(scrollTop / CELL_SIZE) - OVERSCAN);
    const endRow = Math.min(
      habits.length - 1,
      Math.ceil((scrollTop + viewportHeight) / CELL_SIZE) + OVERSCAN
    );
    
    return { startCol, endCol, startRow, endRow };
  }, [scrollLeft, scrollTop, viewportWidth, viewportHeight, dates.length, habits.length]);

  // Render visible cells
  const visibleCells = useMemo(() => {
    const cells: React.ReactNode[] = [];
    const { startCol, endCol, startRow, endRow } = visibleRange;
    
    for (let row = startRow; row <= endRow; row++) {
      const habit = habits[row];
      if (!habit) continue;
      
      for (let col = startCol; col <= endCol; col++) {
        const date = dates[col];
        if (!date) continue;
        
        const log = getLog(habit.id, date);
        const isScheduled = isScheduledDay(date, habit.scheduleDays);
        const isTodayCol = checkIsToday(date);
        
        cells.push(
          <GridCell
            key={`${habit.id}:${date}`}
            log={log}
            habitColor={habit.color}
            isScheduled={isScheduled}
            isToday={isTodayCol}
            style={{
              left: col * CELL_SIZE,
              top: row * CELL_SIZE,
            }}
            onPointerDown={(e) => handlePointerDown(e, habit.id, date)}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />
        );
      }
    }
    
    return cells;
  }, [visibleRange, habits, dates, getLog, handlePointerDown, handlePointerUp, handlePointerCancel]);

  // Render header dates with month indicators
  const headerDates = useMemo(() => {
    const { startCol, endCol } = visibleRange;
    const headers: React.ReactNode[] = [];
    
    for (let col = startCol; col <= endCol; col++) {
      const date = dates[col];
      if (!date) continue;
      
      const { dayAbbrev, dayNum, monthAbbrev, isFirstOfMonth } = formatHeaderDate(date);
      const isTodayCol = checkIsToday(date);
      const prevDate = col > 0 ? dates[col - 1] : null;
      const showMonth = isFirstOfMonth || (col === startCol && prevDate && formatHeaderDate(prevDate).monthAbbrev !== monthAbbrev);
      
      headers.push(
        <div
          key={date}
          className="absolute flex flex-col items-center justify-center select-none"
          style={{
            left: col * CELL_SIZE,
            width: CELL_SIZE,
            height: HEADER_HEIGHT,
            top: 0,
          }}
        >
          {/* Month label (shown at start of month) */}
          {showMonth && (
            <span className="text-[9px] text-accent-primary font-medium -mt-1">
              {monthAbbrev}
            </span>
          )}
          
          {/* Day label */}
          <div
            className={`
              flex flex-col items-center justify-center
              ${showMonth ? 'mt-0' : 'mt-2'}
              ${isTodayCol 
                ? 'bg-accent-primary text-white font-bold rounded-lg px-1.5 py-0.5' 
                : 'text-gray-400'
              }
            `}
          >
            <span className="text-[10px] opacity-70 leading-none">{dayAbbrev}</span>
            <span className="text-xs font-medium leading-tight">{dayNum}</span>
          </div>
        </div>
      );
    }
    
    return headers;
  }, [visibleRange, dates]);

  // Render today column highlight strip
  const todayHighlight = useMemo(() => {
    if (todayIndex < 0) return null;
    
    const { startCol, endCol } = visibleRange;
    if (todayIndex < startCol || todayIndex > endCol) return null;
    
    return (
      <div
        className="absolute pointer-events-none bg-accent-primary/5 border-l border-r border-accent-primary/20"
        style={{
          left: todayIndex * CELL_SIZE,
          width: CELL_SIZE,
          top: 0,
          height: totalHeight,
        }}
      />
    );
  }, [todayIndex, visibleRange, totalHeight]);

  // Render habit rows (left column)
  const habitRows = useMemo(() => {
    const { startRow, endRow } = visibleRange;
    const rows: React.ReactNode[] = [];
    
    for (let row = startRow; row <= endRow; row++) {
      const habit = habits[row];
      if (!habit) continue;
      
      rows.push(
        <div
          key={habit.id}
          className="absolute flex items-center gap-2 px-2 select-none"
          style={{
            top: row * CELL_SIZE,
            height: CELL_SIZE,
            width: LEFT_COLUMN_WIDTH,
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
            style={{ backgroundColor: `${habit.color}20` }}
          >
            {habit.icon}
          </div>
          <span className="text-sm text-gray-200 truncate">{habit.name}</span>
        </div>
      );
    }
    
    return rows;
  }, [visibleRange, habits]);

  // Scroll to today function
  const scrollToToday = useCallback(() => {
    if (containerRef.current) {
      const targetScrollLeft = getTodayScrollLeft();
      containerRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      });
    }
  }, [getTodayScrollLeft]);

  // Jump to specific date
  const handleJumpToDate = useCallback((date: string) => {
    if (containerRef.current) {
      const dateIndex = getDateIndex(dates, date);
      const targetScrollLeft = Math.max(
        0,
        dateIndex * CELL_SIZE - viewportWidth / 2 + CELL_SIZE / 2
      );
      containerRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      });
    }
  }, [dates, viewportWidth]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-dark-bg">
      {/* Corner (fixed) */}
      <div 
        className="absolute top-0 left-0 z-30 bg-dark-bg border-b border-r border-dark-border 
                   flex items-center justify-between px-2"
        style={{ width: LEFT_COLUMN_WIDTH, height: HEADER_HEIGHT }}
      >
        <span className="text-gray-500 text-sm">Habits</span>
        {/* Jump to date button */}
        <button
          onClick={() => setShowJumpModal(true)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 
                     hover:text-white hover:bg-dark-elevated rounded-lg transition-colors"
          title="Jump to date"
          aria-label="Jump to date"
        >
          📅
        </button>
      </div>

      {/* Header row (sticky, scrolls horizontally) */}
      <div
        className="absolute top-0 z-20 bg-dark-bg border-b border-dark-border overflow-hidden"
        style={{
          left: LEFT_COLUMN_WIDTH,
          right: 0,
          height: HEADER_HEIGHT,
        }}
      >
        <div
          className="relative"
          style={{
            width: totalWidth,
            height: HEADER_HEIGHT,
            transform: `translateX(-${scrollLeft}px)`,
          }}
        >
          {headerDates}
        </div>
      </div>

      {/* Left column (sticky, scrolls vertically) */}
      <div
        className="absolute left-0 z-20 bg-dark-bg border-r border-dark-border overflow-hidden"
        style={{
          top: HEADER_HEIGHT,
          bottom: 0,
          width: LEFT_COLUMN_WIDTH,
        }}
      >
        <div
          className="relative"
          style={{
            height: totalHeight + 40, // Extra padding for legend clearance
            transform: `translateY(-${scrollTop}px)`,
          }}
        >
          {habitRows}
        </div>
      </div>

      {/* Main scrollable grid area */}
      <div
        ref={containerRef}
        className="absolute overflow-auto"
        style={{
          top: HEADER_HEIGHT,
          left: LEFT_COLUMN_WIDTH,
          right: 0,
          bottom: 0,
          WebkitOverflowScrolling: 'touch',
        }}
        onScroll={handleScroll}
      >
        {/* Inner canvas with all cells */}
        <div
          className="relative"
          style={{
            width: totalWidth,
            height: totalHeight + 40, // Extra padding for legend clearance
            minWidth: totalWidth,
            minHeight: totalHeight + 40,
          }}
        >
          {/* Today column highlight */}
          {todayHighlight}
          
          {/* Visible cells */}
          {visibleCells}
        </div>
      </div>

      {/* Today button (hidden when near today) */}
      <button
        onClick={scrollToToday}
        className={`
          absolute bottom-4 right-4 z-40 
          px-4 py-2 bg-accent-primary hover:bg-accent-primary/80
          text-white font-medium text-sm rounded-full
          shadow-lg shadow-accent-primary/30
          transition-all active:scale-95
          ${isNearToday ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}
        `}
      >
        Today
      </button>

      {/* Legend hint - positioned after left column */}
      <div 
        className="absolute bottom-4 z-40 text-[10px] text-gray-500 select-none"
        style={{ left: LEFT_COLUMN_WIDTH + 8 }}
      >
        Tap = ✓ · Double-tap = —
      </div>

      {/* Jump to date modal */}
      {showJumpModal && (
        <JumpToDateModal
          onJump={handleJumpToDate}
          onClose={() => setShowJumpModal(false)}
        />
      )}
    </div>
  );
}
