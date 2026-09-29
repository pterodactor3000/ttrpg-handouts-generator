// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardDrawer from '@/components/organisms/DashboardDrawer';

function renderDrawerFixture() {
  document.body.innerHTML = `
    <div data-dashboard data-status-filter="draft">
      <div data-dashboard-drawer-slot></div>
      <section data-handout-list="draft"></section>
      <section data-handout-list="published" hidden></section>
      <section data-handout-list="archived" hidden></section>
      <div id="drawer-root"></div>
    </div>
  `;

  const drawerRoot = document.getElementById('drawer-root');
  if (!(drawerRoot instanceof HTMLElement)) {
    throw new Error('drawer fixture root is missing');
  }

  return render(<DashboardDrawer />, { container: drawerRoot });
}

function stubMatchMedia(isWide: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: isWide,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DashboardDrawer', () => {
  it('sets the published filter and closes the panel when Published is chosen', async () => {
    const user = userEvent.setup();
    renderDrawerFixture();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByRole('button', { name: 'Published' }));

    const dashboard = document.querySelector('[data-dashboard]');
    expect(dashboard?.getAttribute('data-status-filter')).toBe('published');
    expect(document.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Published' })).not.toBeInTheDocument();
  });

  it('leaves the status filter unchanged when Escape closes the panel', async () => {
    const user = userEvent.setup();
    renderDrawerFixture();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.keyboard('{Escape}');

    expect(document.querySelector('[data-dashboard]')?.getAttribute('data-status-filter')).toBe('draft');
    expect(screen.queryByRole('button', { name: 'Published' })).not.toBeInTheDocument();
  });

  it('keeps the panel open when a filter is chosen on a pinned wide drawer and does not write localStorage', async () => {
    const user = userEvent.setup();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    stubMatchMedia(true);
    renderDrawerFixture();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByRole('button', { name: 'Pin' }));
    await user.click(screen.getByRole('button', { name: 'Published' }));

    expect(document.querySelector('[data-dashboard]')?.getAttribute('data-drawer-pinned')).toBe('true');
    expect(screen.getByRole('button', { name: 'Published' })).toBeInTheDocument();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('keeps a pinned narrow drawer as an overlay', async () => {
    const user = userEvent.setup();
    stubMatchMedia(false);
    renderDrawerFixture();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByRole('button', { name: 'Pin' }));

    expect(document.querySelector('[data-dashboard]')?.getAttribute('data-drawer-pinned')).toBe('true');
    expect(document.querySelector('[data-dashboard-drawer-panel]')?.getAttribute('data-drawer-presentation')).toBe(
      'overlay',
    );
  });
});
