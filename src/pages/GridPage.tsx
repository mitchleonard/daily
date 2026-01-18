import { useGridData, VirtualizedGrid } from '../components/grid';

/**
 * Grid Page - Main habit tracking grid view
 * 2D scrollable grid: Habits on Y-axis, Dates on X-axis
 */
export function GridPage() {
  const {
    habits,
    dates,
    loading,
    error,
    getLog,
    handleSingleTap,
    handleDoubleTap,
    todayIndex,
  } = useGridData();

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-gray-400">Loading grid...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container flex items-center justify-center p-4">
        <div className="card text-center">
          <span className="text-3xl mb-3 block">⚠️</span>
          <p className="text-accent-error mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-accent-primary hover:underline"
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="page-container flex items-center justify-center p-4">
        <div className="card text-center max-w-sm">
          <span className="text-4xl mb-4 block">📝</span>
          <h2 className="text-xl font-semibold mb-2">No habits yet</h2>
          <p className="text-gray-400 mb-4">
            Add some habits to start tracking your progress.
          </p>
          <a
            href="/habits"
            className="inline-block px-4 py-2 bg-accent-primary hover:bg-accent-primary/80
                       text-white font-medium rounded-lg transition-colors"
          >
            Add Habits
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-grid">
      <VirtualizedGrid
        habits={habits}
        dates={dates}
        getLog={getLog}
        onSingleTap={handleSingleTap}
        onDoubleTap={handleDoubleTap}
        todayIndex={todayIndex}
      />
    </div>
  );
}
