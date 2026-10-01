// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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

    await user.click(screen.getByRole('button', { name: 'Open sidebar' }));
    expect(screen.queryByRole('button', { name: 'Pin sidebar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unpin sidebar' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Published' }));

    const dashboard = document.querySelector('[data-dashboard]');
    expect(dashboard?.getAttribute('data-status-filter')).toBe('published');
    expect(document.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(true);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Published' })).not.toBeInTheDocument();
    });
  });

  it('leaves the status filter unchanged when Escape closes the panel', async () => {
    const user = userEvent.setup();
    renderDrawerFixture();

    await user.click(screen.getByRole('button', { name: 'Open sidebar' }));
    await user.keyboard('{Escape}');

    expect(document.querySelector('[data-dashboard]')?.getAttribute('data-status-filter')).toBe('draft');
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Published' })).not.toBeInTheDocument();
    });
  });

  it('keeps the sidebar open on a wide viewport', async () => {
    const user = userEvent.setup();
    stubMatchMedia(true);
    renderDrawerFixture();

    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1024px)');
    expect(screen.getByRole('button', { name: 'Published' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pin sidebar' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Published' }));

    expect(screen.getByRole('button', { name: 'Published' })).toBeInTheDocument();
    expect(document.querySelector('[data-dashboard-drawer-panel]')?.getAttribute('data-drawer-presentation')).toBe(
      'sidebar',
    );
  });
});
