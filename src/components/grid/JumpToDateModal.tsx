import { useState, useEffect } from 'react';
import { GRID_START_DATE } from './constants';
import { getToday, getGridEndDate } from './utils';

interface JumpToDateModalProps {
  onJump: (date: string) => void;
  onClose: () => void;
}

/**
 * Modal for jumping to a specific date
 */
export function JumpToDateModal({ onJump, onClose }: JumpToDateModalProps) {
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [error, setError] = useState<string | null>(null);
  
  const minDate = GRID_START_DATE;
  const maxDate = getGridEndDate();

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate and clamp date
    let targetDate = selectedDate;
    
    if (targetDate < minDate) {
      targetDate = minDate;
      setError(`Date adjusted to earliest available: ${minDate}`);
    } else if (targetDate > maxDate) {
      targetDate = maxDate;
      setError(`Date adjusted to latest available: ${maxDate}`);
    }
    
    // Brief delay to show error before closing
    if (error) {
      setTimeout(() => {
        onJump(targetDate);
        onClose();
      }, 1000);
    } else {
      onJump(targetDate);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-sm bg-dark-surface border-t sm:border 
                   border-dark-border sm:rounded-2xl rounded-t-2xl p-5
                   touch-auto overscroll-contain overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Jump to Date</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-dark-elevated flex items-center justify-center
                       text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-sm text-gray-400 mb-2">
              Select a date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              max={maxDate}
              className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                         text-white focus:border-accent-primary focus:outline-none
                         [color-scheme:dark] appearance-none"
              style={{ WebkitAppearance: 'none' }}
              autoFocus
            />
          </div>

          {/* Quick buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate(getToday())}
              className="flex-1 py-2 px-3 bg-dark-elevated border border-dark-border
                         text-gray-300 text-sm rounded-lg hover:border-gray-500 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(minDate)}
              className="flex-1 py-2 px-3 bg-dark-elevated border border-dark-border
                         text-gray-300 text-sm rounded-lg hover:border-gray-500 transition-colors"
            >
              Start
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-lg 
                            text-amber-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-accent-primary hover:bg-accent-primary/80
                       text-white font-medium rounded-lg transition-colors"
          >
            Go to Date
          </button>
        </form>
      </div>
    </div>
  );
}
