// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  applyDashboardSearch,
  handoutMatchesSearchQuery,
  isDashboardSearchActive,
  type HandoutSearchFields,
} from '@/lib/dashboard-search';

const MAP_FIELDS: HandoutSearchFields = {
  title: 'Map',
  tags: ['city watch', 'gate'],
  backgroundCategory: 'fantasy',
};

function createSearchDashboard(): HTMLElement {
  const dashboard = document.createElement('div');
  dashboard.setAttribute('data-dashboard', '');
  dashboard.setAttribute('data-status-filter', 'draft');
  dashboard.setAttribute('data-type-filter', 'all');

  const cards = [
    {
      listKind: 'draft',
      isHidden: false,
      title: 'Map',
      category: 'fantasy',
      tags: '["city watch"]',
      isTypeHidden: true,
    },
    {
      listKind: 'published',
      isHidden: true,
      title: 'Letter',
      category: 'horror',
      tags: '[]',
      isTypeHidden: false,
    },
    {
      listKind: 'archived',
      isHidden: true,
      title: 'Note',
      category: 'scifi',
      tags: '[]',
      isTypeHidden: false,
    },
  ];

  for (const cardSpec of cards) {
    const list = document.createElement('section');
    list.setAttribute('data-handout-list', cardSpec.listKind);
    if (cardSpec.isHidden) {
      list.setAttribute('hidden', '');
    }

    const card = document.createElement('article');
    card.setAttribute('data-handout-card', '');
    card.setAttribute('data-background-category', cardSpec.category);
    card.setAttribute('data-handout-tags', cardSpec.tags);
    if (cardSpec.isTypeHidden) {
      card.setAttribute('data-type-hidden', '');
    }

    const title = document.createElement('h3');
    title.setAttribute('data-handout-title', '');
    title.textContent = cardSpec.title;

    const body = document.createElement('p');
    body.textContent = 'A dragon sleeps here';

    const editAction = document.createElement('span');
    editAction.textContent = 'Edit';

    card.append(title, body, editAction);
    list.append(card);
    dashboard.append(list);
  }

  return dashboard;
}

function getCard(dashboard: Element, title: string): Element {
  const cards = dashboard.querySelectorAll('[data-handout-card]');
  for (const card of cards) {
    if (card.querySelector('[data-handout-title]')?.textContent === title) {
      return card;
    }
  }

  throw new Error(`missing handout card titled ${title}`);
}

describe('isDashboardSearchActive', () => {
  it('is false when the trimmed query has fewer than 2 characters', () => {
    expect(isDashboardSearchActive('')).toBe(false);
    expect(isDashboardSearchActive('a')).toBe(false);
    expect(isDashboardSearchActive(' g')).toBe(false);
    expect(isDashboardSearchActive('  ')).toBe(false);
  });

  it('is true when the trimmed query has 2 characters', () => {
    expect(isDashboardSearchActive('ab')).toBe(true);
    expect(isDashboardSearchActive('  ab')).toBe(true);
    expect(isDashboardSearchActive('  ga')).toBe(true);
  });
});

describe('handoutMatchesSearchQuery', () => {
  it('matches a title regardless of case', () => {
    expect(handoutMatchesSearchQuery(MAP_FIELDS, 'ma')).toBe(true);
    expect(handoutMatchesSearchQuery(MAP_FIELDS, 'MAP')).toBe(true);
  });

  it('matches one tag and rejects a query that spans two tags', () => {
    expect(handoutMatchesSearchQuery(MAP_FIELDS, 'watch')).toBe(true);
    expect(handoutMatchesSearchQuery(MAP_FIELDS, 'watch gate')).toBe(false);
  });

  it('matches the stored category and the type label', () => {
    const horrorFields: HandoutSearchFields = {
      title: 'Letter',
      tags: [],
      backgroundCategory: 'horror',
    };
    const scifiFields: HandoutSearchFields = {
      title: 'Note',
      tags: [],
      backgroundCategory: 'scifi',
    };

    expect(handoutMatchesSearchQuery(horrorFields, 'horror')).toBe(true);
    expect(handoutMatchesSearchQuery(horrorFields, 'eld')).toBe(true);
    expect(handoutMatchesSearchQuery(scifiFields, 'scifi')).toBe(true);
    expect(handoutMatchesSearchQuery(scifiFields, 'grimdark')).toBe(true);
  });

  it('rejects postapo for a horror handout', () => {
    const horrorFields: HandoutSearchFields = {
      title: 'Letter',
      tags: [],
      backgroundCategory: 'horror',
    };

    expect(handoutMatchesSearchQuery(horrorFields, 'postapo')).toBe(false);
  });

  it('returns false when the trimmed query is shorter than 2 characters', () => {
    expect(handoutMatchesSearchQuery(MAP_FIELDS, 'm')).toBe(false);
    expect(handoutMatchesSearchQuery(MAP_FIELDS, ' M ')).toBe(false);
  });
});

describe('applyDashboardSearch', () => {
  it('marks misses, shows every list, and leaves data-type-hidden in place', () => {
    const dashboard = createSearchDashboard();
    const mapCard = getCard(dashboard, 'Map');

    applyDashboardSearch(dashboard, 'ma');

    expect(dashboard.hasAttribute('data-search-active')).toBe(true);
    expect(mapCard.hasAttribute('data-search-hidden')).toBe(false);
    expect(mapCard.hasAttribute('data-type-hidden')).toBe(true);
    expect(getCard(dashboard, 'Letter').hasAttribute('data-search-hidden')).toBe(true);
    expect(getCard(dashboard, 'Note').hasAttribute('data-search-hidden')).toBe(true);
    expect(dashboard.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.getAttribute('data-type-filter')).toBe('all');
    expect(dashboard.getAttribute('data-status-filter')).toBe('draft');
  });

  it('hides the Map card when the query only appears in Edit, markdown, or raw tag JSON', () => {
    const dashboard = createSearchDashboard();
    const mapCard = getCard(dashboard, 'Map');

    for (const query of ['dragon', 'edit', '["']) {
      applyDashboardSearch(dashboard, query);
      expect(mapCard.hasAttribute('data-search-hidden')).toBe(true);
    }
  });

  it('clears search attributes and restores hidden from data-status-filter', () => {
    const dashboard = createSearchDashboard();

    applyDashboardSearch(dashboard, 'ma');
    applyDashboardSearch(dashboard, '  ');

    expect(dashboard.hasAttribute('data-search-active')).toBe(false);
    for (const card of dashboard.querySelectorAll('[data-handout-card]')) {
      expect(card.hasAttribute('data-search-hidden')).toBe(false);
    }
    expect(dashboard.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(true);
    expect(dashboard.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(true);
    expect(dashboard.getAttribute('data-type-filter')).toBe('all');
    expect(dashboard.getAttribute('data-status-filter')).toBe('draft');
  });

  it('shows the published list when a short query follows a published status', () => {
    const dashboard = createSearchDashboard();
    dashboard.setAttribute('data-status-filter', 'published');

    applyDashboardSearch(dashboard, 'm');

    expect(dashboard.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(true);
    expect(dashboard.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(true);
    expect(dashboard.getAttribute('data-status-filter')).toBe('published');
    expect(dashboard.getAttribute('data-type-filter')).toBe('all');
  });

  it('shows Drafts when a short query follows a rejected status value', () => {
    const dashboard = createSearchDashboard();
    dashboard.setAttribute('data-status-filter', 'nope');

    applyDashboardSearch(dashboard, ' ');

    expect(dashboard.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(true);
    expect(dashboard.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(true);
    expect(dashboard.getAttribute('data-status-filter')).toBe('nope');
  });

  it('keeps every list visible when no card matches', () => {
    const dashboard = createSearchDashboard();

    applyDashboardSearch(dashboard, 'zzzz');

    expect(dashboard.hasAttribute('data-search-active')).toBe(true);
    for (const card of dashboard.querySelectorAll('[data-handout-card]')) {
      expect(card.hasAttribute('data-search-hidden')).toBe(true);
    }
    expect(dashboard.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.getAttribute('data-type-filter')).toBe('all');
    expect(dashboard.getAttribute('data-status-filter')).toBe('draft');
  });
});
