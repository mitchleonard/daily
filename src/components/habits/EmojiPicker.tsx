import { useState } from 'react';
import { EMOJI_SUGGESTIONS } from './constants';

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

/**
 * Simple emoji picker with suggestions and text input
 */
export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
    <div className="space-y-2">
      {/* Current emoji display + input */}
      <div className="flex items-center gap-3">
        <div 
          className="w-14 h-14 rounded-xl bg-dark-elevated border border-dark-border 
                     flex items-center justify-center text-3xl"
        >
          {value || '❓'}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            // Take only the last grapheme cluster (emoji can be multiple code points)
            const input = e.target.value;
            if (input.length > 0) {
              // Simple approach: take last 1-4 characters (most emoji are 1-4 code points)
              // This handles most common emoji including skin tone modifiers
              const chars = [...input]; // Spread handles surrogate pairs
              const lastChar = chars[chars.length - 1];
              onChange(lastChar || '');
            } else {
              onChange('');
            }
          }}
          placeholder="Type or paste emoji"
          className="flex-1 px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg
                     text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
        />
      </div>

      {/* Toggle suggestions */}
      <button
        type="button"
        onClick={() => setShowSuggestions(!showSuggestions)}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        {showSuggestions ? '▲ Hide suggestions' : '▼ Show suggestions'}
      </button>

      {/* Emoji suggestions grid */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-2 p-3 bg-dark-elevated rounded-lg border border-dark-border">
          {EMOJI_SUGGESTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onChange(emoji);
                setShowSuggestions(false);
              }}
              className={`
                w-10 h-10 rounded-lg text-xl flex items-center justify-center
                transition-all hover:bg-dark-border
                ${value === emoji ? 'bg-accent-primary/20 ring-1 ring-accent-primary' : ''}
              `}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
