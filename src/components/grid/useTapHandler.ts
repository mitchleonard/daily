import { useRef, useCallback } from 'react';
import { DOUBLE_TAP_THRESHOLD, TAP_MOVEMENT_THRESHOLD } from './constants';

interface TapHandlerOptions {
  onSingleTap: (habitId: string, date: string) => void;
  onDoubleTap: (habitId: string, date: string) => void;
}

interface PointerState {
  startX: number;
  startY: number;
  habitId: string;
  date: string;
}

/**
 * Hook to handle single tap and double tap on grid cells
 * - Distinguishes between tap and scroll/pan
 * - Handles double-tap timing
 * - Prevents default double-tap zoom on mobile
 */
export function useTapHandler({ onSingleTap, onDoubleTap }: TapHandlerOptions) {
  const pointerState = useRef<PointerState | null>(null);
  const lastTapRef = useRef<{ habitId: string; date: string; time: number } | null>(null);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = useCallback((
    e: React.PointerEvent,
    habitId: string,
    date: string
  ) => {
    // Only handle primary pointer (left click / first touch)
    if (e.button !== 0) return;
    
    pointerState.current = {
      startX: e.clientX,
      startY: e.clientY,
      habitId,
      date,
    };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!pointerState.current) return;
    
    const { startX, startY, habitId, date } = pointerState.current;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    
    // If pointer moved too much, it's a scroll not a tap
    if (dx > TAP_MOVEMENT_THRESHOLD || dy > TAP_MOVEMENT_THRESHOLD) {
      pointerState.current = null;
      return;
    }
    
    const now = Date.now();
    const lastTap = lastTapRef.current;
    
    // Check for double tap
    if (
      lastTap &&
      lastTap.habitId === habitId &&
      lastTap.date === date &&
      now - lastTap.time < DOUBLE_TAP_THRESHOLD
    ) {
      // Double tap!
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapRef.current = null;
      onDoubleTap(habitId, date);
    } else {
      // Possible single tap - wait to see if double tap follows
      lastTapRef.current = { habitId, date, time: now };
      
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
      
      singleTapTimeoutRef.current = setTimeout(() => {
        onSingleTap(habitId, date);
        lastTapRef.current = null;
        singleTapTimeoutRef.current = null;
      }, DOUBLE_TAP_THRESHOLD);
    }
    
    pointerState.current = null;
  }, [onSingleTap, onDoubleTap]);

  const handlePointerCancel = useCallback(() => {
    pointerState.current = null;
  }, []);

  return {
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
  };
}
