// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
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

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
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
});
