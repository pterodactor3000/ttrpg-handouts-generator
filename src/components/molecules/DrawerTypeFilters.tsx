import { BACKGROUND_CATEGORY_OPTIONS, BACKGROUND_CONFIGS } from '@/lib/backgrounds';
import type { DashboardTypeFilter } from '@/lib/dashboard-type-filter';
import { cn } from '@/lib/utils';

interface DrawerTypeFiltersProps {
  typeFilter: DashboardTypeFilter;
  onTypeFilterChange: (typeFilter: DashboardTypeFilter) => void;
}

const TYPE_FILTER_BUTTON_CLASS_NAME =
  'flex w-full cursor-pointer flex-col items-center gap-1 rounded-[0.5rem] border-2 p-3 transition-all';
const TYPE_FILTER_BUTTON_PRESSED_CLASS_NAME = 'border-primary ring-primary ring-offset-background ring-2 ring-offset-2';
const TYPE_FILTER_BUTTON_IDLE_CLASS_NAME = 'border-border hover:border-primary/50';

function DrawerTypeFilters({ typeFilter, onTypeFilterChange }: DrawerTypeFiltersProps) {
  const isAllPressed = typeFilter === 'all';

  return (
    <div role="group" aria-label="Handout type" className="flex flex-col gap-3">
      <button
        type="button"
        aria-pressed={isAllPressed}
        className={cn(
          TYPE_FILTER_BUTTON_CLASS_NAME,
          isAllPressed ? TYPE_FILTER_BUTTON_PRESSED_CLASS_NAME : TYPE_FILTER_BUTTON_IDLE_CLASS_NAME,
        )}
        onClick={() => {
          onTypeFilterChange('all');
        }}
      >
        <span className="text-foreground text-xs font-semibold">All</span>
      </button>
      {BACKGROUND_CATEGORY_OPTIONS.map((option) => {
        const isPressed = typeFilter === option;

        return (
          <button
            key={option}
            type="button"
            aria-pressed={isPressed}
            className={cn(
              TYPE_FILTER_BUTTON_CLASS_NAME,
              isPressed ? TYPE_FILTER_BUTTON_PRESSED_CLASS_NAME : TYPE_FILTER_BUTTON_IDLE_CLASS_NAME,
            )}
            style={{
              background: BACKGROUND_CONFIGS[option].cssBackground,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            onClick={() => {
              onTypeFilterChange(option);
            }}
          >
            <span className="text-xs font-semibold text-white drop-shadow">{BACKGROUND_CONFIGS[option].label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { DrawerTypeFilters };
