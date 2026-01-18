import type { HabitConnection } from '../../lib/analytics';

interface ConnectionsCardProps {
  connections: HabitConnection[];
}

/**
 * Habit connections/correlations card
 */
export function ConnectionsCard({ connections }: ConnectionsCardProps) {
  if (connections.length === 0) return null;
  
  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <span>🔗</span> Habit Connections
      </h3>
      <div className="space-y-3">
        {connections.map((conn) => (
          <div 
            key={`${conn.habitAId}-${conn.habitBId}`}
            className="p-3 bg-dark-elevated rounded-lg"
          >
            <div className="text-sm text-gray-200">
              <span className="text-lg">{conn.habitAIcon}</span>
              <span className="mx-2 text-gray-500">→</span>
              <span className="text-lg">{conn.habitBIcon}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              On days you complete <span className="text-white">{conn.habitAName}</span>,
              you complete <span className="text-white">{conn.habitBName}</span>{' '}
              <span className="text-accent-success font-medium">
                {Math.round(conn.lift * 100)}% more
              </span> often
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-gray-600 text-center">
        Based on the last 30 days
      </div>
    </div>
  );
}
