// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { DashboardSearch } from '@/components/molecules/DashboardSearch';

function renderSearchFixture() {
  document.body.innerHTML = `
    <div data-dashboard data-status-filter="draft" data-type-filter="all">
      <div id="search-root"></div>
      <section data-handout-list="draft">
        <article data-handout-card data-background-category="fantasy" data-handout-tags="[]">
          <h3 data-handout-title>Map</h3>
        </article>
      </section>
      <section data-handout-list="published" hidden>
        <article data-handout-card data-background-category="horror" data-handout-tags="[]">
          <h3 data-handout-title>Letter</h3>
        </article>
      </section>
      <section data-handout-list="archived" hidden>
        <article data-handout-card data-background-category="scifi" data-handout-tags="[]">
          <h3 data-handout-title>Note</h3>
        </article>
      </section>
    </div>
  `;

  const searchRoot = document.getElementById('search-root');
  if (!(searchRoot instanceof HTMLElement)) {
    throw new Error('search fixture root is missing');
  }

  return render(<DashboardSearch />, { container: searchRoot });
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('DashboardSearch', () => {
  it('shows every list for a two-character query and restores the status lists after backspace', async () => {
    const user = userEvent.setup();
    renderSearchFixture();
    const dashboard = document.querySelector('[data-dashboard]');
    const mapCard = document.querySelector('[data-handout-title]')?.closest('[data-handout-card]');

    expect(document.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(true);
    expect(dashboard?.hasAttribute('data-search-active')).toBe(false);

    const searchField = screen.getByRole('searchbox', { name: 'Search handouts' });
    await user.type(searchField, 'ma');

    expect(dashboard?.hasAttribute('data-search-active')).toBe(true);
    expect(mapCard?.hasAttribute('data-search-hidden')).toBe(false);
    for (const title of ['Letter', 'Note']) {
      const card = [...document.querySelectorAll('[data-handout-card]')].find(
        (candidate) => candidate.querySelector('[data-handout-title]')?.textContent === title,
      );
      expect(card?.hasAttribute('data-search-hidden')).toBe(true);
    }
    expect(document.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard?.getAttribute('data-type-filter')).toBe('all');
    expect(window.location.search).toBe('');

    await user.keyboard('{Backspace}');

    expect(dashboard?.hasAttribute('data-search-active')).toBe(false);
    for (const card of document.querySelectorAll('[data-handout-card]')) {
      expect(card.hasAttribute('data-search-hidden')).toBe(false);
    }
    expect(document.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(false);
  });
});
