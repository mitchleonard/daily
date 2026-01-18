/**
 * Grid layout constants
 */

// Cell dimensions (must be >= 44px for touch accessibility)
export const CELL_SIZE = 44;

// Left column (habit names) width
export const LEFT_COLUMN_WIDTH = 140;

// Header row height
export const HEADER_HEIGHT = 56;

// Overscan (extra rows/cols to render beyond viewport)
export const OVERSCAN = 3;

// Grid start date (per spec)
export const GRID_START_DATE = '2025-12-17';

// Days to render ahead of today
export const DAYS_AHEAD = 365;

// Double-tap timing threshold (ms)
export const DOUBLE_TAP_THRESHOLD = 300;

// Tap movement threshold (px) - if pointer moves more than this, it's a scroll not a tap
export const TAP_MOVEMENT_THRESHOLD = 8;

// Number of columns from today before showing "Today" button
export const TODAY_BUTTON_THRESHOLD = 2;

// Viewport persistence storage keys
export const STORAGE_KEYS = {
  SCROLL_LEFT: 'habitgrid-scroll-left',
  SCROLL_TOP: 'habitgrid-scroll-top',
  LAST_OPENED_DATE: 'habitgrid-last-opened-date',
} as const;

// Viewport save debounce (ms)
export const VIEWPORT_SAVE_DEBOUNCE = 300;

/**
 * Day abbreviations
 */
export const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Month abbreviations
 */
export const MONTH_ABBREV = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
