import { HABIT_COLORS } from './constants';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

/**
 * Color palette picker with selection ring
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {HABIT_COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          onClick={() => onChange(color.hex)}
          className={`
            w-10 h-10 rounded-full transition-all duration-150
            ${value === color.hex 
              ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-bg scale-110' 
              : 'hover:scale-105'
            }
          `}
          style={{ backgroundColor: color.hex }}
          title={color.name}
          aria-label={`Select ${color.name} color`}
        />
      ))}
    </div>
  );
}
