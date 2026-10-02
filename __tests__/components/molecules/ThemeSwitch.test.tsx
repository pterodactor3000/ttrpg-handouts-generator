// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeSwitch } from '@/components/molecules/ThemeSwitch';
import {
  CHROME_THEME_DARKEST_OF_MINES,
  CHROME_THEME_STORAGE_KEY,
  CHROME_THEME_TOWER_OF_LIGHT,
  selectChromeTheme,
} from '@/lib/chrome-theme';

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.chromeTheme;
});

describe('ThemeSwitch', () => {
  it('selects Darkest of Mines and sets aria-checked after a click from Tower of Light', async () => {
    selectChromeTheme(CHROME_THEME_TOWER_OF_LIGHT);
    const user = userEvent.setup();
    render(<ThemeSwitch />);

    const themeSwitch = screen.getByRole('switch', { name: 'Tower of Light' });
    expect(themeSwitch).toHaveAttribute('aria-checked', 'false');

    await user.click(themeSwitch);

    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Darkest of Mines' })).toHaveAttribute('aria-checked', 'true');
    });
    expect(localStorage.getItem(CHROME_THEME_STORAGE_KEY)).toBe(CHROME_THEME_DARKEST_OF_MINES);
    expect(document.documentElement.dataset.chromeTheme).toBe(CHROME_THEME_DARKEST_OF_MINES);
  });
});
