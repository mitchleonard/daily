import { WEEKDAYS } from './constants';
import type { Schedule } from '../../db/types';
import { isFrequencySchedule } from '../../db/types';

interface SchedulePickerProps {
  value: Schedule;
  onChange: (schedule: Schedule) => void;
}

type ScheduleMode = 'everyday' | 'specific' | 'frequency';

/**
 * Schedule selector with three modes:
 * - Everyday: Every day of the week
 * - Specific days: Choose which days
 * - Frequency: X times per week (user chooses when)
 */
export function WeekdayPicker({ value, onChange }: SchedulePickerProps) {
  // Determine current mode
  const getMode = (): ScheduleMode => {
    if (value === 'everyday') return 'everyday';
    if (isFrequencySchedule(value)) return 'frequency';
    return 'specific';
  };
  
  const mode = getMode();
  
  // Get specific days (for specific mode)
  const selectedDays = mode === 'specific' && Array.isArray(value) ? value : [];
  
  // Get frequency (for frequency mode)
  const frequency = isFrequencySchedule(value) ? value.timesPerWeek : 3;

  const setMode = (newMode: ScheduleMode) => {
    if (newMode === 'everyday') {
      onChange('everyday');
    } else if (newMode === 'specific') {
      // Default to weekdays when switching to specific
      onChange([1, 2, 3, 4, 5]);
    } else {
      // Default to 3 times per week
      onChange({ type: 'frequency', timesPerWeek: 3 });
    }
  };

  const toggleDay = (dayId: number) => {
    if (mode !== 'specific') return;
    
    const newDays = selectedDays.includes(dayId)
      ? selectedDays.filter((d) => d !== dayId)
      : [...selectedDays, dayId].sort((a, b) => a - b);
    
    // If all days selected, stay in specific mode (don't auto-switch)
    onChange(newDays.length > 0 ? newDays : []);
  };

  const setFrequency = (times: number) => {
    onChange({ type: 'frequency', timesPerWeek: times });
  };

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('everyday')}
          className={`
            flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all
            ${mode === 'everyday'
              ? 'bg-accent-primary text-white'
              : 'bg-dark-elevated border border-dark-border text-gray-400 hover:border-gray-500'
            }
          `}
        >
          Every Day
        </button>
        <button
          type="button"
          onClick={() => setMode('specific')}
          className={`
            flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all
            ${mode === 'specific'
              ? 'bg-accent-primary text-white'
              : 'bg-dark-elevated border border-dark-border text-gray-400 hover:border-gray-500'
            }
          `}
        >
          Specific Days
        </button>
        <button
          type="button"
          onClick={() => setMode('frequency')}
          className={`
            flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all
            ${mode === 'frequency'
              ? 'bg-accent-primary text-white'
              : 'bg-dark-elevated border border-dark-border text-gray-400 hover:border-gray-500'
            }
          `}
        >
          Per Week
        </button>
      </div>

      {/* Specific days picker */}
      {mode === 'specific' && (
        <div className="flex justify-between gap-1">
          {WEEKDAYS.map((day) => {
            const isSelected = selectedDays.includes(day.id);
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                className={`
                  flex-1 py-2.5 rounded-lg font-medium text-sm transition-all
                  min-w-[40px] min-h-[44px]
                  ${isSelected
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                    : 'bg-dark-elevated border border-dark-border text-gray-500 hover:border-gray-500'
                  }
                `}
                title={day.name}
                aria-label={day.name}
              >
                {day.short}
              </button>
            );
          })}
        </div>
      )}

      {/* Frequency picker */}
      {mode === 'frequency' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Times per week</span>
            <span className="text-lg font-semibold text-white">{frequency}×</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setFrequency(num)}
                className={`
                  flex-1 py-2.5 rounded-lg font-medium text-sm transition-all
                  min-h-[44px]
                  ${frequency === num
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                    : 'bg-dark-elevated border border-dark-border text-gray-500 hover:border-gray-500'
                  }
                `}
              >
                {num}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Complete this habit {frequency} time{frequency !== 1 ? 's' : ''} each week, any days you choose
          </p>
        </div>
      )}
    </div>
  );
}
