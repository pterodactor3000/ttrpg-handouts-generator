// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  applyDashboardTypeFilter,
  handoutMatchesTypeFilter,
  isDashboardTypeFilter,
  readDashboardTypeFilter,
} from '@/lib/dashboard-type-filter';
import type { BackgroundCategory } from '@/types';

const BACKGROUND_CATEGORIES: BackgroundCategory[] = ['fantasy', 'horror', 'scifi'];

function createDashboard(typeFilter: string | null): HTMLElement {
  const dashboard = document.createElement('div');
  dashboard.setAttribute('data-dashboard', '');
  if (typeFilter !== null) {
    dashboard.setAttribute('data-type-filter', typeFilter);
  }

  for (const category of BACKGROUND_CATEGORIES) {
    const card = document.createElement('article');
    card.setAttribute('data-handout-card', '');
    card.setAttribute('data-background-category', category);
    dashboard.append(card);
  }

  return dashboard;
}

describe('handoutMatchesTypeFilter', () => {
  it('returns true for all and for a matching category', () => {
    for (const category of BACKGROUND_CATEGORIES) {
      expect(handoutMatchesTypeFilter(category, 'all')).toBe(true);
      expect(handoutMatchesTypeFilter(category, category)).toBe(true);
    }
  });

  it('returns false for a different category', () => {
    expect(handoutMatchesTypeFilter('fantasy', 'horror')).toBe(false);
    expect(handoutMatchesTypeFilter('horror', 'scifi')).toBe(false);
    expect(handoutMatchesTypeFilter('scifi', 'fantasy')).toBe(false);
  });
});

describe('isDashboardTypeFilter', () => {
  it('accepts all, fantasy, horror, and scifi', () => {
    expect(isDashboardTypeFilter('all')).toBe(true);
    expect(isDashboardTypeFilter('fantasy')).toBe(true);
    expect(isDashboardTypeFilter('horror')).toBe(true);
    expect(isDashboardTypeFilter('scifi')).toBe(true);
  });

  it('rejects postapo, grimdark, eldritch, an empty string, and null', () => {
    expect(isDashboardTypeFilter('postapo')).toBe(false);
    expect(isDashboardTypeFilter('grimdark')).toBe(false);
    expect(isDashboardTypeFilter('eldritch')).toBe(false);
    expect(isDashboardTypeFilter('')).toBe(false);
    expect(isDashboardTypeFilter(null)).toBe(false);
  });
});

describe('readDashboardTypeFilter', () => {
  it('returns all when the attribute is missing', () => {
    expect(readDashboardTypeFilter(createDashboard(null))).toBe('all');
  });

  it('returns all when the attribute is rejected', () => {
    expect(readDashboardTypeFilter(createDashboard('postapo'))).toBe('all');
    expect(readDashboardTypeFilter(createDashboard('grimdark'))).toBe('all');
    expect(readDashboardTypeFilter(createDashboard('eldritch'))).toBe('all');
  });

  it('returns scifi when the attribute is scifi', () => {
    expect(readDashboardTypeFilter(createDashboard('scifi'))).toBe('scifi');
  });
});

describe('applyDashboardTypeFilter', () => {
  it('sets data-type-hidden on fantasy and horror cards when the filter is scifi', () => {
    const dashboard = createDashboard('scifi');

    applyDashboardTypeFilter(dashboard);

    expect(dashboard.querySelector('[data-background-category="fantasy"]')?.hasAttribute('data-type-hidden')).toBe(
      true,
    );
    expect(dashboard.querySelector('[data-background-category="horror"]')?.hasAttribute('data-type-hidden')).toBe(true);
    expect(dashboard.querySelector('[data-background-category="scifi"]')?.hasAttribute('data-type-hidden')).toBe(false);
  });

  it('removes data-type-hidden from all three cards when the filter is all', () => {
    const dashboard = createDashboard('scifi');
    applyDashboardTypeFilter(dashboard);
    dashboard.setAttribute('data-type-filter', 'all');

    applyDashboardTypeFilter(dashboard);

    const cards = dashboard.querySelectorAll('[data-handout-card]');
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.hasAttribute('data-type-hidden')).toBe(false);
    }
  });

  it('leaves all three cards without data-type-hidden when the attribute is missing or postapo', () => {
    const missingFilter = createDashboard(null);
    applyDashboardTypeFilter(missingFilter);
    for (const card of missingFilter.querySelectorAll('[data-handout-card]')) {
      expect(card.hasAttribute('data-type-hidden')).toBe(false);
    }

    const rejectedFilter = createDashboard('postapo');
    applyDashboardTypeFilter(rejectedFilter);
    for (const card of rejectedFilter.querySelectorAll('[data-handout-card]')) {
      expect(card.hasAttribute('data-type-hidden')).toBe(false);
    }
  });

  it('sets data-type-hidden on a card with no category when the filter is horror', () => {
    const dashboard = createDashboard('horror');
    const uncategorizedCard = document.createElement('article');
    uncategorizedCard.setAttribute('data-handout-card', '');
    dashboard.append(uncategorizedCard);

    applyDashboardTypeFilter(dashboard);

    expect(uncategorizedCard.hasAttribute('data-type-hidden')).toBe(true);
    expect(dashboard.querySelector('[data-background-category="horror"]')?.hasAttribute('data-type-hidden')).toBe(
      false,
    );
  });

  it('sets data-type-hidden when the category attribute is not a background category', () => {
    const dashboard = createDashboard('horror');
    const unknownCard = document.createElement('article');
    unknownCard.setAttribute('data-handout-card', '');
    unknownCard.setAttribute('data-background-category', 'eldritch');
    dashboard.append(unknownCard);

    applyDashboardTypeFilter(dashboard);

    expect(unknownCard.hasAttribute('data-type-hidden')).toBe(true);
  });
});
