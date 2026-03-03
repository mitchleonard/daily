import type { HabitConnection } from '../../lib/analytics';

interface ConnectionsCardProps {
  connections: HabitConnection[];
  activeHabitsCount: number;
}

/**
 * Habit connections/correlations card - always visible, shows empty state with explanations when no connections
 */
export function ConnectionsCard({ connections, activeHabitsCount }: ConnectionsCardProps) {
  const hasConnections = connections.length > 0;

  const emptyReasons: string[] = [];
  if (activeHabitsCount < 2) {
    emptyReasons.push('Need 2+ active habits – connections require at least two habits to compare');
  }
  emptyReasons.push('Need 30 days of data – correlations are computed from the last 30 days');
  emptyReasons.push(
    'Need enough overlap – each habit pair needs at least 10 days where habit A was completed and 5 days where it wasn\'t (for statistical validity)'
  );

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <span>🔗</span> Habit Connections
      </h3>
      {hasConnections ? (
        <>
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
                  </span>{' '}
                  often
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-gray-600 text-center">
            Based on the last 30 days
          </div>
        </>
      ) : (
        <div className="py-4 space-y-2">
          <p className="text-sm text-gray-500">No habit connections found yet.</p>
          <p className="text-xs text-gray-600">To see connections, you may need:</p>
          <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
            {emptyReasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
          {activeHabitsCount === 1 && (
            <p className="text-xs text-accent-primary mt-2">Add another habit to start comparing.</p>
          )}
        </div>
      )}
    </div>
  );
}
