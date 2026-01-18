# Build Spec: Daily (Web/PWA Habit Tracker)

You are building a mobile-first habit tracker web app that behaves like a native app when saved to an iPhone Home Screen. The primary UI is a 2D scrollable grid: Habits on the Y-axis, Dates on the X-axis. Users log habits with simple taps:
- Single tap: toggle Completed (empty ↔ completed)
- Double tap: toggle Skipped (empty ↔ skipped)
- Empty means no log for that habit/date.

The design is visually minimal, dark-mode forward, fast, and map-like to navigate (pan left/right/up/down).

## 0) Target Platform & Deployment
- Platform: Web app first.
- Must be installable as a PWA and usable as a Home Screen shortcut on iPhone.
- Deployment target: GitHub Pages with a custom subdomain.
  - Prefer a setup that works well with SPA routing (either Next.js static export or Vite React).
- Offline-first required.

### Recommended stack (use unless blocked)
- React + TypeScript
- Tailwind CSS
- Vite (simpler GitHub Pages) OR Next.js static export (if you can guarantee GH Pages compatibility cleanly)
- Data storage: IndexedDB (Dexie or equivalent) with a clean repository layer.

## 1) Core UX Requirements (Must)
### Home: The Grid
- Default view on app open: show TODAY centered horizontally.
- Data start date: 2025-12-17 (grid should not render dates earlier than this unless user scrolls further back intentionally via settings; default is start at this date).
- Habits listed vertically (Y).
- Dates run horizontally (X) and can be scrolled/panned left/right.
- Grid supports free panning in both directions like a map.
- Sticky top header row for dates.
- Sticky left column for habit names (with icon + color).
- Smooth scrolling, no jank. Must feel good on iPhone.

### Interaction model
- Single tap on a cell: toggle completed
  - empty → completed
  - completed → empty
- Double tap on a cell: toggle skipped
  - empty → skipped
  - skipped → empty
- If a habit is not scheduled for that weekday:
  - Cell is visually muted/disabled-looking, BUT still tappable/loggable.
  - In analytics, those off-schedule completions should still count as completions if user logs them, but denominators should default to scheduled days (see Analytics rules).

### Quick navigation / controls
- “Today” button: jumps/snap scrolls to today column.
- Add Habit button.
- Analytics button/tab.
- Settings button.

## 2) Habit Management (Must)
### Add habit
Fields:
- Name (required)
- Icon (emoji or simple icon string) (required in V1)
- Color (required in V1; choose from a palette)
- Schedule:
  - Everyday OR select days of week (Sun–Sat)
- Start date: default to 2025-12-17 unless user chooses later.
Behavior:
- Once created, habits persist.
- Allow reordering (drag or up/down controls).
- Allow archive/unarchive.

### Edit habit
- Rename, icon, color, schedule changes.
- Archiving hides from grid by default (with an option to show archived in settings).

## 3) Data Model (Must)
Use local-first persistence with IndexedDB.

### Entities
Habit:
- id: uuid
- name: string
- icon: string (emoji)
- color: string (hex or tailwind token)
- scheduleDays: number[] (0–6 for Sun–Sat) OR everyday boolean
- startDate: YYYY-MM-DD
- createdAt, updatedAt
- archivedAt: nullable
- sortOrder: number

LogEntry:
- id: uuid
- habitId: uuid
- date: YYYY-MM-DD (local)
- status: "completed" | "skipped"
- createdAt, updatedAt

Constraints:
- Unique (habitId, date) so only one log per day per habit.
- Empty cell = no LogEntry.

## 4) Grid Rendering & Performance (Must)
- Must handle:
  - 20–30 habits
  - 365–730 days
  - without lag on iPhone.
- Use virtualization/windowing for a 2D grid.
  - Either implement a 2D virtualized grid (react-virtual / react-window + custom logic) OR a single scroll container with calculated visible rows/cols.
- Sticky headers must remain synced with scroll positions.
- Taps must be immediate (optimistic UI then persistence).

### Visual style
- Dark background (#0b0b0b to #141414).
- Subtle grid lines.
- Completed state: strong fill using habit color (or a consistent green accent if simpler, but ideally per-habit color).
- Skipped state: muted fill (gray/blue) and/or subtle diagonal slash.
- Off-schedule cells: same states but “muted” (lower opacity) when empty; if logged, show normal state.
- Today column: subtle highlight.

Accessibility:
- Tap targets >= 44px.
- Do not rely only on color; include tiny check/dash indicator.

## 5) Analytics (Must)
Analytics should be useful but simple:
- Per-habit:
  - current streak
  - longest streak
  - completion rate for 7/30/90 days
  - trend indicator (improving/slipping)
- Overview:
  - overall completion rate (scheduled-day denominator)
  - top 3 most consistent habits
  - top 3 slipping habits

### Definitions
Denominator default: scheduled days only.
- For a given habit and date range:
  - scheduledDaysCount = number of dates in range that match the habit schedule AND are >= habit.startDate
  - completedCount = number of completed entries in range
  - skippedCount = number of skipped entries in range
  - completionRate = completedCount / scheduledDaysCount (handle divide-by-zero gracefully)

Streak rules (per-habit):
- Streak counts consecutive scheduled days with status completed.
- If today is scheduled but unlogged, current streak should consider the last completed scheduled day ending yesterday (unless user logs today).
- Skipped breaks streak.

Trend:
- Compare last 14 days vs previous 14 days completionRate (scheduled denominator).
- slipping if delta <= -20%
- improving if delta >= +20%
- stable otherwise

### “Connections between habits” (Nice-to-have for V1, but attempt if feasible)
- Basic correlation: for the last 30 days, compute whether completing Habit A increases likelihood of completing Habit B the same day.
- Show simple insights like:
  - “On days you complete X, you complete Y 25% more often.”
Keep it lightweight, explainable, and optional.

## 6) Settings (Must)
- Start week on Sunday/Monday toggle.
- Show/hide archived habits toggle.
- Export data to JSON file.
- Import data from JSON file.
- Reset all data (confirmations required).

## 7) Offline & PWA (Must)
- Full offline functionality.
- PWA manifest and service worker.
- Should work as iOS Home Screen app (standalone display mode, proper icons).

## 8) Build order (Milestones)
1) Scaffold app + Tailwind + routing + PWA basics
2) Data layer (IndexedDB repos) + seed habits
3) Habit CRUD + reorder + archive
4) Grid UI with sticky headers + virtualization + tap/double-tap logic
5) “Today” snapping
6) Analytics calculations + analytics UI
7) Export/import
8) Polish + performance passes on iPhone dimensions

## 9) Acceptance criteria
- Grid pans smoothly in both directions; feels like map navigation.
- Single tap toggles completed; double tap toggles skipped; reliable on mobile.
- Off-schedule days are visually muted but still loggable.
- Default view shows today; earliest default date is 2025-12-17.
- Analytics numbers are correct and consistent with logs and schedules.
- Data persists across refresh; works offline.
- Export/import fully restores habits + logs.

## 10) Deliverables
- A working app with:
  - / (Grid)
  - /habits (Manage habits)
  - /analytics
  - /settings
- Clear README with:
  - local dev instructions
  - GitHub Pages deploy steps
  - adding a custom domain
  - how to install on iPhone home screen