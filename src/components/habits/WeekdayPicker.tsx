import { WEEKDAYS } from './constants';

interface WeekdayPickerProps {
  value: number[] | 'everyday';
  onChange: (days: number[] | 'everyday') => void;
}

/**
 * Weekday selector with toggle chips
 * Supports "everyday" mode or individual day selection
 */
export function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  const isEveryday = value === 'everyday';
  const selectedDays = isEveryday ? [0, 1, 2, 3, 4, 5, 6] : value;

  const toggleDay = (dayId: number) => {
    if (isEveryday) {
      // Switch from everyday to specific days (all except clicked)
      onChange([0, 1, 2, 3, 4, 5, 6].filter((d) => d !== dayId));
    } else {
      const newDays = selectedDays.includes(dayId)
        ? selectedDays.filter((d) => d !== dayId)
        : [...selectedDays, dayId].sort((a, b) => a - b);
      
      // If all days selected, switch to everyday
      if (newDays.length === 7) {
        onChange('everyday');
      } else {
        onChange(newDays);
      }
    }
  };

  const toggleEveryday = () => {
    if (isEveryday) {
      onChange([]);
    } else {
      onChange('everyday');
    }
  };

  return (
    <div className="space-y-3">
      {/* Everyday toggle */}
      <button
        type="button"
        onClick={toggleEveryday}
        className={`
          w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all
          ${isEveryday
            ? 'bg-accent-primary text-white'
            : 'bg-dark-elevated border border-dark-border text-gray-400 hover:border-gray-500'
          }
        `}
      >
        Every Day
      </button>

      {/* Individual day chips */}
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
    </div>
  );
}
