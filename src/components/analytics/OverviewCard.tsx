import type { OverviewStats } from '../../lib/analytics';

interface OverviewCardProps {
  overview: OverviewStats;
}

/**
 * Overview statistics card
 */
export function OverviewCard({ overview }: OverviewCardProps) {
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
  
  return (
    <div className="space-y-4">
      {/* Today's Score */}
      <div className="card bg-gradient-to-br from-accent-primary/20 to-accent-primary/5 border-accent-primary/30">
        <div className="text-center">
          <div className="text-4xl font-bold text-accent-primary">
            {overview.todayCompleted}/{overview.todayScheduled}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Today's Progress ({formatPercent(overview.todayScore)})
          </div>
        </div>
      </div>

      {/* Rate Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-bold text-white">
            {formatPercent(overview.overallRate7)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Last 7 Days</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-white">
            {formatPercent(overview.overallRate30)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Last 30 Days</div>
        </div>
      </div>

      {/* Most Consistent */}
      {overview.mostConsistent.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <span>🏆</span> Most Consistent
          </h3>
          <div className="space-y-2">
            {overview.mostConsistent.map((habit, i) => (
              <div key={habit.habitId} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                <span>{habit.icon}</span>
                <span className="flex-1 text-sm text-gray-200 truncate">{habit.name}</span>
                <span className="text-sm font-medium text-accent-success">
                  {formatPercent(habit.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slipping */}
      {overview.slipping.length > 0 && (
        <div className="card border-accent-error/30 bg-accent-error/5">
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <span>📉</span> Needs Attention
          </h3>
          <div className="space-y-2">
            {overview.slipping.map((habit, i) => (
              <div key={habit.habitId} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                <span>{habit.icon}</span>
                <span className="flex-1 text-sm text-gray-200 truncate">{habit.name}</span>
                <span className="text-sm font-medium text-accent-error">
                  {Math.round(habit.value * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
