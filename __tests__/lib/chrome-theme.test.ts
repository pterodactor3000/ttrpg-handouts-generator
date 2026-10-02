// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CHROME_THEME_DARKEST_OF_MINES,
  CHROME_THEME_STORAGE_KEY,
  CHROME_THEME_TOWER_OF_LIGHT,
  resolveChromeTheme,
  selectChromeTheme,
} from '@/lib/chrome-theme';

const LAYOUT_PATH = resolve(process.cwd(), 'src/layouts/Layout.astro');
const GLOBAL_CSS_PATH = resolve(process.cwd(), 'src/styles/global.css');
const MOON_CHROME_PREFIX = "html:not([data-chrome-theme='darkest-of-mines'])";

function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function normalizeCss(css: string): string {
  return stripCssComments(css).replace(/\s+/g, ' ');
}

describe('resolveChromeTheme', () => {
  it('returns darkest-of-mines for system mode when the system theme is dark, even if tower-of-light is stored', () => {
    expect(
      resolveChromeTheme({
        mode: 'system',
        storedTheme: CHROME_THEME_TOWER_OF_LIGHT,
        isSystemDark: true,
      }),
    ).toBe(CHROME_THEME_DARKEST_OF_MINES);
  });

  it('returns tower-of-light for system mode when the system theme is light, even if darkest-of-mines is stored', () => {
    expect(
      resolveChromeTheme({
        mode: 'system',
        storedTheme: CHROME_THEME_DARKEST_OF_MINES,
        isSystemDark: false,
      }),
    ).toBe(CHROME_THEME_TOWER_OF_LIGHT);
  });

  it('returns the stored id for choice mode when the stored theme is tower-of-light or darkest-of-mines', () => {
    expect(
      resolveChromeTheme({
        mode: 'choice',
        storedTheme: CHROME_THEME_TOWER_OF_LIGHT,
        isSystemDark: true,
      }),
    ).toBe(CHROME_THEME_TOWER_OF_LIGHT);
    expect(
      resolveChromeTheme({
        mode: 'choice',
        storedTheme: CHROME_THEME_DARKEST_OF_MINES,
        isSystemDark: false,
      }),
    ).toBe(CHROME_THEME_DARKEST_OF_MINES);
  });

  it('returns the system theme for choice mode when the stored theme is null or any other string', () => {
    expect(
      resolveChromeTheme({
        mode: 'choice',
        storedTheme: null,
        isSystemDark: true,
      }),
    ).toBe(CHROME_THEME_DARKEST_OF_MINES);
    expect(
      resolveChromeTheme({
        mode: 'choice',
        storedTheme: 'light',
        isSystemDark: false,
      }),
    ).toBe(CHROME_THEME_TOWER_OF_LIGHT);
  });
});

describe('selectChromeTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.chromeTheme;
  });

  it('stores darkest-of-mines and sets the document attribute', () => {
    selectChromeTheme(CHROME_THEME_DARKEST_OF_MINES);

    expect(localStorage.getItem(CHROME_THEME_STORAGE_KEY)).toBe(CHROME_THEME_DARKEST_OF_MINES);
    expect(document.documentElement.dataset.chromeTheme).toBe(CHROME_THEME_DARKEST_OF_MINES);
  });

  it('stores tower-of-light and sets the document attribute', () => {
    selectChromeTheme(CHROME_THEME_TOWER_OF_LIGHT);

    expect(localStorage.getItem(CHROME_THEME_STORAGE_KEY)).toBe(CHROME_THEME_TOWER_OF_LIGHT);
    expect(document.documentElement.dataset.chromeTheme).toBe(CHROME_THEME_TOWER_OF_LIGHT);
  });
});

describe('chrome theme source sync', () => {
  it('keeps the storage key and both theme ids in Layout.astro', () => {
    const layoutSource = readFileSync(LAYOUT_PATH, 'utf-8');

    expect(layoutSource).toContain(CHROME_THEME_STORAGE_KEY);
    expect(layoutSource).toContain(CHROME_THEME_TOWER_OF_LIGHT);
    expect(layoutSource).toContain(CHROME_THEME_DARKEST_OF_MINES);
    expect(CHROME_THEME_STORAGE_KEY).toBe('handouts-chrome-theme');
    expect(CHROME_THEME_TOWER_OF_LIGHT).toBe('tower-of-light');
    expect(CHROME_THEME_DARKEST_OF_MINES).toBe('darkest-of-mines');
  });

  it('prefixes every .moon-chrome rule in global.css', () => {
    const globalCss = normalizeCss(readFileSync(GLOBAL_CSS_PATH, 'utf-8'));
    const prefixedSelector = `${MOON_CHROME_PREFIX} .moon-chrome`;
    const cssWithoutPrefixedSelectors = globalCss.split(prefixedSelector).join('');

    expect(globalCss).toContain(prefixedSelector);
    expect(cssWithoutPrefixedSelectors).not.toContain('.moon-chrome');
  });
});
