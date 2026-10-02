const CHROME_THEME_STORAGE_KEY = 'handouts-chrome-theme';
const CHROME_THEME_TOWER_OF_LIGHT = 'tower-of-light';
const CHROME_THEME_DARKEST_OF_MINES = 'darkest-of-mines';

type ChromeThemeId = typeof CHROME_THEME_TOWER_OF_LIGHT | typeof CHROME_THEME_DARKEST_OF_MINES;

interface ResolveChromeThemeInput {
  mode: 'choice' | 'system';
  storedTheme: string | null;
  isSystemDark: boolean;
}

function getSystemChromeTheme(isSystemDark: boolean): ChromeThemeId {
  if (isSystemDark) {
    return CHROME_THEME_DARKEST_OF_MINES;
  }

  return CHROME_THEME_TOWER_OF_LIGHT;
}

function isKnownChromeTheme(storedTheme: string | null): storedTheme is ChromeThemeId {
  return storedTheme === CHROME_THEME_TOWER_OF_LIGHT || storedTheme === CHROME_THEME_DARKEST_OF_MINES;
}

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

function getChromeThemeSnapshot(): ChromeThemeId | null {
  const chromeTheme = document.documentElement.dataset.chromeTheme ?? null;

  if (isKnownChromeTheme(chromeTheme)) {
    return chromeTheme;
  }

  return null;
}

function getServerChromeThemeSnapshot(): null {
  return null;
}

function selectChromeTheme(theme: string): void {
  if (!isKnownChromeTheme(theme)) {
    throw new Error(`selectChromeTheme rejected theme "${theme}"`);
  }

  try {
    window.localStorage.setItem(CHROME_THEME_STORAGE_KEY, theme);
  } catch (storageError) {
    console.error(`Failed to store chrome theme "${theme}" in localStorage`, storageError);
  }

  document.documentElement.dataset.chromeTheme = theme;
  notifyChromeThemeListeners();
}

function resolveChromeTheme(input: ResolveChromeThemeInput): ChromeThemeId {
  const systemChromeTheme = getSystemChromeTheme(input.isSystemDark);

  if (input.mode === 'system') {
    return systemChromeTheme;
  }

  if (isKnownChromeTheme(input.storedTheme)) {
    return input.storedTheme;
  }

  return systemChromeTheme;
}

export {
  CHROME_THEME_DARKEST_OF_MINES,
  CHROME_THEME_STORAGE_KEY,
  CHROME_THEME_TOWER_OF_LIGHT,
  getChromeThemeSnapshot,
  getServerChromeThemeSnapshot,
  resolveChromeTheme,
  selectChromeTheme,
  subscribeToChromeTheme,
};
