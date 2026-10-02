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

export { CHROME_THEME_DARKEST_OF_MINES, CHROME_THEME_STORAGE_KEY, CHROME_THEME_TOWER_OF_LIGHT, resolveChromeTheme };
