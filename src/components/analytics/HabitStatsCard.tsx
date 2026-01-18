import type { Habit } from '../../db/types';
import type { HabitStats, TrendStatus } from '../../lib/analytics';

interface HabitStatsCardProps {
  habit: Habit;
  stats: HabitStats;
  onClick?: () => void;
}

/**
 * Format trend badge
 */
function TrendBadge({ trend, delta }: { trend: TrendStatus; delta: number }) {
  const config = {
    improving: {
      bg: 'bg-accent-success/20',
      text: 'text-accent-success',
      label: 'Improving',
      icon: '↑',
    },
    slipping: {
      bg: 'bg-accent-error/20',
      text: 'text-accent-error',
      label: 'Slipping',
      icon: '↓',
    },
    stable: {
      bg: 'bg-gray-700/50',
      text: 'text-gray-400',
      label: 'Stable',
      icon: '→',
    },
  };
  
  const c = config[trend];
  const deltaPercent = Math.round(Math.abs(delta) * 100);
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span>{c.icon}</span>
      <span>{c.label}</span>
      {deltaPercent > 0 && <span>({deltaPercent}%)</span>}
    </span>
  );
}

/**
 * Individual habit statistics card
 */
export function HabitStatsCard({ habit, stats, onClick }: HabitStatsCardProps) {
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
  
  return (
    <div 
      className={`card hover:border-gray-600 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: `${habit.color}20` }}
        >
          {habit.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white truncate">{habit.name}</div>
          <TrendBadge trend={stats.trend} delta={stats.trendDelta} />
        </div>
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: habit.color }}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {/* Current Streak */}
        <div className="bg-dark-elevated rounded-lg py-2 px-1">
          <div className="text-lg font-bold text-accent-primary">
            {stats.currentStreak}
          </div>
          <div className="text-[10px] text-gray-500 leading-tight">Streak</div>
        </div>
        
        {/* Longest Streak */}
        <div className="bg-dark-elevated rounded-lg py-2 px-1">
          <div className="text-lg font-bold text-gray-300">
            {stats.longestStreak}
          </div>
          <div className="text-[10px] text-gray-500 leading-tight">Best</div>
        </div>
        
        {/* 7-day rate */}
        <div className="bg-dark-elevated rounded-lg py-2 px-1">
          <div className="text-lg font-bold text-gray-300">
            {stats.scheduledDays7 > 0 ? formatPercent(stats.rate7) : '—'}
          </div>
          <div className="text-[10px] text-gray-500 leading-tight">7d</div>
        </div>
        
        {/* 30-day rate */}
        <div className="bg-dark-elevated rounded-lg py-2 px-1">
          <div className="text-lg font-bold text-gray-300">
            {stats.scheduledDays30 > 0 ? formatPercent(stats.rate30) : '—'}
          </div>
          <div className="text-[10px] text-gray-500 leading-tight">30d</div>
        </div>
      </div>

      {/* Tap hint */}
      {onClick && (
        <div className="mt-2 text-[10px] text-gray-600 text-center">
          Tap for details
        </div>
      )}
    </div>
  );
}
