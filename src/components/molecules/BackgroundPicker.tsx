import type { BackgroundCategory } from '@/types';
import { BACKGROUND_CATEGORY_OPTIONS, BACKGROUND_CONFIGS } from '@/lib/backgrounds';
import { cn } from '@/lib/utils';

interface BackgroundPickerProps {
  value: BackgroundCategory | null;
  onChange: (category: BackgroundCategory) => void;
}

const BackgroundPicker = ({ value, onChange }: BackgroundPickerProps) => {
  return (
    <div className="flex gap-2 sm:gap-3">
      {BACKGROUND_CATEGORY_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => {
            onChange(option);
          }}
          className={cn(
            'flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all sm:p-3',
            value === option
              ? 'border-primary ring-primary ring-offset-background ring-2 ring-offset-2'
              : 'border-border hover:border-primary/50',
          )}
          style={{
            background: BACKGROUND_CONFIGS[option].cssBackground,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <span className="text-center text-[11px] leading-tight font-semibold text-white drop-shadow sm:text-xs">
            {BACKGROUND_CONFIGS[option].label}
          </span>
        </button>
      ))}
    </div>
  );
};

export { BackgroundPicker };
