import { useRef, useCallback, useEffect } from 'react';
import { STORAGE_KEYS, VIEWPORT_SAVE_DEBOUNCE, CELL_SIZE } from './constants';
import { getToday } from './utils';

interface ViewportState {
  scrollLeft: number;
  scrollTop: number;
}

interface UseViewportPersistenceOptions {
  todayIndex: number;
  viewportWidth: number;
}

/**
 * Hook to persist and restore grid viewport position
 * - Saves scroll position to localStorage with debouncing
 * - On new day, defaults to today instead of restoring last position
 */
export function useViewportPersistence({ 
  todayIndex, 
  viewportWidth 
}: UseViewportPersistenceOptions) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);

  /**
   * Calculate scroll position to center on today
   */
  const getTodayScrollLeft = useCallback(() => {
    if (todayIndex < 0 || viewportWidth <= 0) return 0;
    return Math.max(0, todayIndex * CELL_SIZE - viewportWidth / 2 + CELL_SIZE / 2);
  }, [todayIndex, viewportWidth]);

  /**
   * Get initial scroll position
   * - If new day: center on today
   * - If same day: restore last position
   */
  const getInitialPosition = useCallback((): ViewportState | null => {
    if (hasRestoredRef.current) return null;
    
    try {
      const lastOpenedDate = localStorage.getItem(STORAGE_KEYS.LAST_OPENED_DATE);
      const today = getToday();
      
      // If new day or no saved date, default to today
      if (lastOpenedDate !== today) {
        localStorage.setItem(STORAGE_KEYS.LAST_OPENED_DATE, today);
        return {
          scrollLeft: getTodayScrollLeft(),
          scrollTop: 0,
        };
      }
      
      // Same day - try to restore position
      const savedLeft = localStorage.getItem(STORAGE_KEYS.SCROLL_LEFT);
      const savedTop = localStorage.getItem(STORAGE_KEYS.SCROLL_TOP);
      
      if (savedLeft !== null && savedTop !== null) {
        return {
          scrollLeft: parseInt(savedLeft, 10) || 0,
          scrollTop: parseInt(savedTop, 10) || 0,
        };
      }
      
      // No saved position, default to today
      return {
        scrollLeft: getTodayScrollLeft(),
        scrollTop: 0,
      };
    } catch (e) {
      console.warn('Failed to read viewport from localStorage:', e);
      return {
        scrollLeft: getTodayScrollLeft(),
        scrollTop: 0,
      };
    }
  }, [getTodayScrollLeft]);

  /**
   * Save current scroll position (debounced)
   */
  const savePosition = useCallback((scrollLeft: number, scrollTop: number) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.SCROLL_LEFT, String(Math.round(scrollLeft)));
        localStorage.setItem(STORAGE_KEYS.SCROLL_TOP, String(Math.round(scrollTop)));
        localStorage.setItem(STORAGE_KEYS.LAST_OPENED_DATE, getToday());
      } catch (e) {
        console.warn('Failed to save viewport to localStorage:', e);
      }
    }, VIEWPORT_SAVE_DEBOUNCE);
  }, []);

  /**
   * Mark as restored to prevent re-restoration
   */
  const markRestored = useCallback(() => {
    hasRestoredRef.current = true;
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    getInitialPosition,
    savePosition,
    markRestored,
    getTodayScrollLeft,
  };
}
