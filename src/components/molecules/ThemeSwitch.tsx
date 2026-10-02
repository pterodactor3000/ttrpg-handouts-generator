import { useSyncExternalStore } from 'react';
import {
  CHROME_THEME_DARKEST_OF_MINES,
  CHROME_THEME_TOWER_OF_LIGHT,
  getChromeThemeSnapshot,
  getServerChromeThemeSnapshot,
  selectChromeTheme,
  subscribeToChromeTheme,
} from '@/lib/chrome-theme';
import { cn } from '@/lib/utils';

function ThemeSwitch() {
  const activeTheme = useSyncExternalStore(
    subscribeToChromeTheme,
    getChromeThemeSnapshot,
    getServerChromeThemeSnapshot,
  );
  const isDarkest = activeTheme === CHROME_THEME_DARKEST_OF_MINES;
  const themeLabel = isDarkest ? 'Darkest of Mines' : 'Tower of Light';

  function handleToggle() {
    const currentTheme = document.documentElement.dataset.chromeTheme;
    const nextTheme =
      currentTheme === CHROME_THEME_DARKEST_OF_MINES ? CHROME_THEME_TOWER_OF_LIGHT : CHROME_THEME_DARKEST_OF_MINES;

    selectChromeTheme(nextTheme);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDarkest}
      aria-label={themeLabel}
      onClick={handleToggle}
      className={cn('text-foreground flex w-full items-center justify-between gap-6 py-1 text-sm font-semibold')}
    >
      <span>{themeLabel}</span>
      <span
        className={cn('relative h-6 w-11 shrink-0 rounded-full', isDarkest ? 'bg-primary' : 'bg-muted')}
        aria-hidden="true"
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white transition-all',
            isDarkest ? 'left-5' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

export { ThemeSwitch };
