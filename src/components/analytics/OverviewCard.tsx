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
      {/* Accomplished Today - simple count */}
      <div className="card bg-gradient-to-br from-accent-primary/20 to-accent-primary/5 border-accent-primary/30">
        <div className="text-center">
          <div className="text-4xl font-bold text-accent-primary">
            {overview.todayCompleted}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            accomplished today
          </div>
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

      {/* Needs Attention - scheduled for today but not completed yet */}
      {overview.needsAttention.length > 0 && (
        <div className="card border-accent-error/30 bg-accent-error/5">
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <span>📋</span> Needs Attention
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Scheduled for today, not yet completed
          </p>
          <div className="space-y-2">
            {overview.needsAttention.map((habit, i) => (
              <div key={habit.habitId} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                <span>{habit.icon}</span>
                <span className="flex-1 text-sm text-gray-200 truncate">{habit.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
