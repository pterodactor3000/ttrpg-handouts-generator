// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardDrawer from '@/components/organisms/DashboardDrawer';

const BACKGROUND_CATEGORY_CARDS = ['fantasy', 'horror', 'scifi']
  .map((category) => `<article data-handout-card data-background-category="${category}"></article>`)
  .join('');

function renderDrawerFixture() {
  document.body.innerHTML = `
    <div data-dashboard data-status-filter="draft" data-type-filter="all">
      <div data-dashboard-drawer-slot></div>
      <section data-handout-list="draft">${BACKGROUND_CATEGORY_CARDS}</section>
      <section data-handout-list="published" hidden>${BACKGROUND_CATEGORY_CARDS}</section>
      <section data-handout-list="archived" hidden>${BACKGROUND_CATEGORY_CARDS}</section>
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

  it('shows All and the category buttons after the separator', async () => {
    const user = userEvent.setup();
    renderDrawerFixture();

    await user.click(screen.getByRole('button', { name: 'Open sidebar' }));

    const panel = document.querySelector('[data-dashboard-drawer-panel]');
    expect(panel).toBeInstanceOf(HTMLElement);
    if (!(panel instanceof HTMLElement)) {
      return;
    }

    const separator = panel.querySelector('[role="separator"]');
    const archivedButton = screen.getByRole('button', { name: 'Archived' });
    const allButton = screen.getByRole('button', { name: 'All' });
    const highFantasyButton = screen.getByRole('button', { name: 'High Fantasy' });
    const eldritchButton = screen.getByRole('button', { name: 'Eldritch' });
    const grimdarkButton = screen.getByRole('button', { name: 'Grimdark' });

    expect(separator).toBeInstanceOf(HTMLElement);
    if (!(separator instanceof HTMLElement)) {
      return;
    }

    expect(archivedButton.compareDocumentPosition(separator)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(separator.compareDocumentPosition(allButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(allButton.compareDocumentPosition(highFantasyButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(highFantasyButton.compareDocumentPosition(eldritchButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(eldritchButton.compareDocumentPosition(grimdarkButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(allButton).toHaveAttribute('aria-pressed', 'true');
    expect(highFantasyButton).toHaveAttribute('aria-pressed', 'false');
    expect(eldritchButton).toHaveAttribute('aria-pressed', 'false');
    expect(grimdarkButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('sets the scifi type filter and closes the overlay when Grimdark is chosen', async () => {
    const user = userEvent.setup();
    renderDrawerFixture();

    await user.click(screen.getByRole('button', { name: 'Open sidebar' }));
    await user.click(screen.getByRole('button', { name: 'Grimdark' }));

    expect(document.querySelector('[data-dashboard]')?.getAttribute('data-type-filter')).toBe('scifi');

    for (const category of ['fantasy', 'horror']) {
      const cards = document.querySelectorAll(`[data-handout-card][data-background-category="${category}"]`);
      expect(cards).toHaveLength(3);
      for (const card of cards) {
        expect(card.hasAttribute('data-type-hidden')).toBe(true);
      }
    }

    const scifiCards = document.querySelectorAll('[data-handout-card][data-background-category="scifi"]');
    expect(scifiCards).toHaveLength(3);
    for (const card of scifiCards) {
      expect(card.hasAttribute('data-type-hidden')).toBe(false);
    }

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Grimdark' })).not.toBeInTheDocument();
    });
  });

  it('clears data-type-hidden when All is chosen', async () => {
    const user = userEvent.setup();
    renderDrawerFixture();

    await user.click(screen.getByRole('button', { name: 'Open sidebar' }));
    await user.click(screen.getByRole('button', { name: 'Grimdark' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Grimdark' })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Open sidebar' }));
    await user.click(screen.getByRole('button', { name: 'All' }));

    expect(document.querySelector('[data-dashboard]')?.getAttribute('data-type-filter')).toBe('all');
    const cards = document.querySelectorAll('[data-handout-card]');
    expect(cards).toHaveLength(9);
    for (const card of cards) {
      expect(card.hasAttribute('data-type-hidden')).toBe(false);
    }
  });

  it('keeps the type filter when Published is chosen after Grimdark', async () => {
    const user = userEvent.setup();
    renderDrawerFixture();

    await user.click(screen.getByRole('button', { name: 'Open sidebar' }));
    await user.click(screen.getByRole('button', { name: 'Grimdark' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Published' })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Open sidebar' }));
    await user.click(screen.getByRole('button', { name: 'Published' }));

    expect(document.querySelector('[data-dashboard]')?.getAttribute('data-type-filter')).toBe('scifi');
    expect(document.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(true);
  });

  it('keeps the sidebar open when Eldritch is chosen on a wide viewport', async () => {
    const user = userEvent.setup();
    stubMatchMedia(true);
    renderDrawerFixture();

    await user.click(screen.getByRole('button', { name: 'Eldritch' }));

    expect(screen.getByRole('button', { name: 'Eldritch' })).toBeInTheDocument();
    expect(document.querySelector('[data-dashboard-drawer-panel]')?.getAttribute('data-drawer-presentation')).toBe(
      'sidebar',
    );
    expect(document.querySelector('[data-dashboard]')?.getAttribute('data-type-filter')).toBe('horror');
    expect(screen.queryByRole('button', { name: 'Pin sidebar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unpin sidebar' })).not.toBeInTheDocument();
  });
});
