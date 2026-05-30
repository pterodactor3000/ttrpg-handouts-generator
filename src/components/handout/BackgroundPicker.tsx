import type { BackgroundCategory } from '@/types';
import { BACKGROUND_CATEGORY_OPTIONS, BACKGROUND_CONFIGS } from '@/lib/backgrounds';
import { cn } from '@/lib/utils';

interface BackgroundPickerProps {
  value: BackgroundCategory | null;
  onChange: (category: BackgroundCategory) => void;
}

const BackgroundPicker = ({ value, onChange }: BackgroundPickerProps) => {
  return (
    <div className="flex gap-3">
      {BACKGROUND_CATEGORY_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => {
            onChange(option);
          }}
          className={cn(
            'flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all',
            value === option
              ? 'border-white ring-2 ring-white ring-offset-2 ring-offset-gray-950'
              : 'border-white/20 hover:border-white/50',
          )}
          style={{ background: BACKGROUND_CONFIGS[option].cssBackground }}
        >
          <span className="text-xs font-semibold text-white drop-shadow">{BACKGROUND_CONFIGS[option].label}</span>
        </button>
      ))}
    </div>
  );
};

export { BackgroundPicker };
