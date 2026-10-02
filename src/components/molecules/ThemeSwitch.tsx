import { useSyncExternalStore } from 'react';
import { Button } from '@/components/atoms/button';
import { CHROME_THEME_DARKEST_OF_MINES, CHROME_THEME_TOWER_OF_LIGHT, selectChromeTheme } from '@/lib/chrome-theme';
import { cn } from '@/lib/utils';

const CHROME_THEME_OPTIONS = [
  { id: CHROME_THEME_TOWER_OF_LIGHT, label: 'Tower of Light' },
  { id: CHROME_THEME_DARKEST_OF_MINES, label: 'Darkest of Mines' },
] as const;

type ChromeThemeOptionId = (typeof CHROME_THEME_OPTIONS)[number]['id'];

const chromeThemeListeners = new Set<() => void>();

function subscribeToChromeTheme(listener: () => void): () => void {
  chromeThemeListeners.add(listener);

  return () => {
    chromeThemeListeners.delete(listener);
  };
}

function notifyChromeThemeListeners(): void {
  for (const listener of chromeThemeListeners) {
    listener();
  }
}

function getChromeThemeSnapshot(): ChromeThemeOptionId | null {
  const chromeTheme = document.documentElement.dataset.chromeTheme;

  if (chromeTheme === CHROME_THEME_TOWER_OF_LIGHT || chromeTheme === CHROME_THEME_DARKEST_OF_MINES) {
    return chromeTheme;
  }

  return null;
}

function getServerChromeThemeSnapshot(): null {
  return null;
}

function ThemeSwitch() {
  const activeTheme = useSyncExternalStore(
    subscribeToChromeTheme,
    getChromeThemeSnapshot,
    getServerChromeThemeSnapshot,
  );

  function handleSelect(theme: ChromeThemeOptionId) {
    if (document.documentElement.dataset.chromeTheme === theme) {
      return;
    }

    selectChromeTheme(theme);
    notifyChromeThemeListeners();
  }

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row')}>
      {CHROME_THEME_OPTIONS.map((option) => {
        const isActive = activeTheme === option.id;

        return (
          <Button
            key={option.id}
            type="button"
            variant={isActive ? 'default' : 'outline'}
            aria-pressed={isActive}
            className={cn('w-full sm:w-auto')}
            onClick={() => {
              handleSelect(option.id);
            }}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export { ThemeSwitch };
