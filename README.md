# Daily

A beautiful, mobile-first habit tracker with a scrollable grid interface. Designed to behave like a native app when saved to iPhone Home Screen.

## Features

- 📊 **2D Grid View** - Habits on Y-axis, dates on X-axis, pan diagonally like a map
- 📱 **PWA Ready** - Install on iPhone/Android home screen for fullscreen standalone mode
- 🌙 **Dark Theme** - Minimalist dark interface (#0b0b0b)
- 📴 **Offline First** - Works without internet (local mode); optional cloud sync when configured
- ⚡ **Virtualized Rendering** - Only visible cells rendered for smooth performance (25+ habits, 365+ days)
- ✅ **Tap to Log** - Single tap = completed, double tap = skipped
- 📳 **Haptic Feedback** - Tactile response on tap (Android vibration; iOS fallback in dev)

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **vite-plugin-pwa** - PWA support with Workbox
- **Dexie.js** - IndexedDB wrapper for local data persistence
- **web-haptics** - Haptic feedback on supported devices
- **Recharts** - Analytics charts

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/daily.git
cd daily

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Deployment to GitHub Pages

### Option 1: GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Option 2: Manual Deploy

```bash
# Install gh-pages if not already installed
npm install --save-dev gh-pages

# Build and deploy
npm run deploy
```

### Using a Custom Domain

1. Add a `CNAME` file in the `public/` directory with your domain:
   ```
   habits.yourdomain.com
   ```

2. Configure DNS:
   - Add a CNAME record pointing to `yourusername.github.io`
   - Or use A records for apex domain (see GitHub docs)

3. In your repo settings, enable GitHub Pages and configure the custom domain.

### SPA Routing on GitHub Pages

GitHub Pages doesn't natively support client-side routing. This project includes a workaround:

- `public/404.html` - Catches 404s and redirects with the path as a query param
- `index.html` - Script that restores the correct route from the query param

**How it works:**
1. User visits `/habits` directly or refreshes
2. GitHub Pages serves 404.html (no file at /habits)
3. 404.html redirects to `/?/habits`
4. index.html script converts `?/habits` back to `/habits` using `history.replaceState`
5. React Router handles the route normally

If using a base path (e.g., `/repo-name/`):
1. Update `base` in `vite.config.ts`
2. Set `pathSegmentsToKeep = 1` in `public/404.html`

## Adding to iPhone Home Screen

1. Open the app in **Safari** on your iPhone
2. Tap the **Share** button (box with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Customize the name if desired
5. Tap **"Add"**

The app will now launch in fullscreen standalone mode, just like a native app.

## Project Structure

```
daily/
├── public/
│   ├── 404.html           # GitHub Pages SPA workaround
│   ├── apple-touch-icon.png
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── components/
│   │   ├── Layout.tsx     # Main layout with bottom nav
│   │   ├── grid/          # Virtualized grid, cells, tap handlers, viewport persistence
│   │   ├── habits/        # Habit management (form, row, color, weekday, emoji pickers)
│   │   └── analytics/     # Overview card, habit stats, connections, detail modal
│   ├── db/                # Data layer
│   │   ├── database.ts    # Dexie (IndexedDB) setup
│   │   ├── habitsRepository.ts
│   │   ├── logsRepository.ts
│   │   ├── cloudRepository.ts  # AWS API when configured
│   │   └── seedData.ts    # Sample data generator (dev)
│   ├── lib/
│   │   ├── auth.ts        # Cognito auth provider
│   │   ├── haptics.ts     # Haptic feedback (success, selection, buzz)
│   │   ├── analytics/     # Stats, streaks, connections
│   │   ├── api.ts         # REST client for habits/logs API
│   │   └── dataPortability/    # Export, import, reset
│   ├── pages/
│   │   ├── GridPage.tsx   # Main grid view (/)
│   │   ├── HabitsPage.tsx # Manage habits (/habits)
│   │   ├── AnalyticsPage.tsx # Analytics (/analytics)
│   │   └── SettingsPage.tsx  # Settings (/settings)
│   ├── styles/
│   │   └── tailwind.css   # Tailwind + dark theme
│   ├── App.tsx            # Router + auth wiring
│   └── main.tsx           # App entry point
├── infra/                 # AWS CDK (Cognito, DynamoDB, Lambda, API Gateway)
├── docs/
│   └── spec.md            # Full feature specification
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── package.json
```

## App Flow

The app uses a bottom navigation bar with four tabs:

1. **Grid** (`/`) — Main habit tracking view. Pan across dates, tap cells to log.
2. **Habits** (`/habits`) — Add, edit, reorder, and archive habits.
3. **Analytics** (`/analytics`) — View streaks, completion rates, trends, and habit connections.
4. **Settings** (`/settings`) — Export/import data, account (when configured), reset.

## Routes

| Path | Description |
|------|-------------|
| `/` | Grid - Main 2D habit tracking grid |
| `/habits` | Manage habits (add, edit, reorder, archive) |
| `/analytics` | View streaks, completion rates, trends |
| `/settings` | App settings, export/import data |

## Managing Habits

Navigate to `/habits` to manage your habits:

- **Add Habit**: Click "+ Add Habit" to open the modal—set name, icon (emoji), color, schedule (everyday or specific weekdays), and start date
- **Edit Habit**: Tap any habit row to edit name, icon, color, schedule, or start date
- **Reorder**: Drag the ⋮⋮ handle to reorder habits (works on desktop and mobile)
- **Archive**: Open the menu (⋮) on a habit and select "Archive" to hide it
- **Unarchive**: Toggle "Show archived" and use "Unarchive" to restore habits

### Drag-and-Drop Reordering

Habit reordering uses `@dnd-kit` for reliable touch and mouse support:

- **Desktop**: Click and drag the ⋮⋮ handle on the left side of each habit
- **Mobile/Touch**: Long-press (200ms) the ⋮⋮ handle, then drag to reorder
- **Persistence**: Order is saved immediately (local or cloud) and survives refresh
- **Visual feedback**: Dragged items show subtle lift and opacity change

### Data Storage

- **Local mode**: Data is stored in your browser's **IndexedDB** (Dexie). Persists across refreshes; no account required.
- **Cloud mode** (when AWS is configured): Habits and logs sync to DynamoDB via API. Sign in to use your data across devices.
- Use Settings → Developer Tools (dev mode only) to seed sample data or clear local data.
- DevTools → Application → IndexedDB → DailyDB to inspect local data.

## Using the Grid

The home page (`/`) displays a 2D habit tracking grid:

### Navigation
- **Pan/Scroll**: Swipe in any direction (diagonal supported) to navigate
- **Today Button**: Tap the floating "Today" button to jump to today's column (hidden when already near today)
- **Jump to Date**: Tap the 📅 icon in the top-left corner to jump to any date
- **Sticky Headers**: Date headers (top) and habit names (left) stay visible while scrolling
- **Month Indicators**: Month abbreviation shown at the start of each month in the header

### Logging Habits
- **Single Tap**: Toggle completed (empty ↔ completed)
- **Double Tap**: Toggle skipped (empty ↔ skipped)
- Tapping on a completed cell clears it; tapping on skipped replaces with completed
- **Tap Feedback**: Cells show a brief press animation; haptic feedback fires on supported devices (success pattern when logging)

### Visual States
- ✓ **Completed**: Filled with habit color + checkmark
- — **Skipped**: Gray fill + dash
- **Empty scheduled**: Dark/transparent
- **Empty off-schedule**: Muted (lower opacity) but still loggable
- **Today column**: Subtle blue highlight strip with border

### Viewport Persistence
- Your scroll position is saved automatically
- On return visits the same day, you'll be exactly where you left off
- On a new day, the grid automatically centers on today

### Virtualization
Only visible cells are rendered for performance:
- Supports 25+ habits and 365+ days without lag
- Verify in DevTools: only ~50-100 cell elements exist, not thousands

### Haptic Feedback

Haptics use `web-haptics` and trigger on user interaction:

- **Success** (logging a habit): Double-tap pattern—used when completing or skipping a cell
- **Selection** (tab change): Light tap—used when switching Grid/Habits/Analytics/Settings
- **Buzz** (refresh): 300ms vibration—used when analytics loads/refreshes

- **Android**: Uses Vibration API (requires user gesture)
- **iOS/Safari**: Vibration API not supported; dev mode uses audio fallback for testing

## Development Milestones

See `docs/spec.md` for full specification.

1. ✅ **Milestone 1** - Scaffold, Tailwind, routing, PWA basics
2. ✅ **Milestone 2** - Data layer (IndexedDB) + seed habits
3. ✅ **Milestone 3** - Habit CRUD + reorder + archive
4. ✅ **Milestone 4** - Grid UI with virtualization
5. ✅ **Milestone 5** - "Today" snapping + date navigation polish
6. ✅ **Milestone 6** - Analytics calculations + UI
7. ✅ **Milestone 7** - Export/import + Reset data
8. ⬜ **Milestone 8** - Polish + performance

## Analytics

Navigate to `/analytics` to view your habit statistics:

### Overview Section
- **Today's Progress**: Completed vs scheduled habits for today
- **7-day / 30-day rates**: Overall completion percentage
- **Most Consistent**: Top 3 habits by 30-day completion rate
- **Needs Attention**: Habits with declining trends

### Per-Habit Stats
- **Current Streak**: Consecutive scheduled days completed
- **Longest Streak**: Best streak in the last 365 days
- **Completion Rates**: 7/30/90 day percentages
- **Trend Badge**: Improving (↑20%+), Slipping (↓20%+), or Stable

### Habit Connections
- Shows correlations like "On days you complete Meditation, you complete Reading 25% more often"
- Based on the last 30 days of data

### Sorting & Filtering
- Sort by: Default order, streak length, 30-day rate, or needs work
- Toggle to include archived habits

## Settings

Navigate to `/settings` for data management and preferences.

- **Account** (when cloud is configured): Shows signed-in email and Sign Out
- **Your Data**: Counts of active habits, log entries, archived habits
- **Backup & Restore**: Export to JSON, import from JSON (merge mode)

### Export
- Click **Export Data** to download a JSON file containing all habits and logs
- Filename format: `daily-export-YYYY-MM-DD.json`
- Includes archived habits and all log entries

### Import
- Click **Import Data** and select a previously exported JSON file
- Validates the file before importing
- Shows a confirmation dialog with habit/log counts
- **Merge mode**: Adds or updates habits and logs without deleting existing data; matching habits (by name) are updated; new habits are created; duplicate logs are merged (last write wins)

### Reset Data
- Located in the Danger Zone section
- Requires typing "RESET" to confirm
- Permanently deletes all habits and logs

### Export Schema (v1)

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-01-16T18:30:00.000Z",
  "appName": "Daily",
  "habits": [
    {
      "id": "uuid",
      "name": "Exercise",
      "icon": "🏃",
      "color": "#22c55e",
      "scheduleDays": [1, 2, 3, 4, 5],
      "startDate": "2025-12-17",
      "sortOrder": 0,
      "archivedAt": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "logs": [
    {
      "id": "uuid",
      "habitId": "habit-uuid",
      "date": "2026-01-15",
      "status": "completed",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

## License

MIT

