// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  applyDashboardListVisibility,
  applyDashboardSearch,
  handoutMatchesSearchQuery,
  isDashboardSearchActive,
  toggleDashboardListCollapse,
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
    appendListHeading(list, cardSpec.listKind, false);
    list.append(card);
    dashboard.append(list);
  }

  return dashboard;
}

function appendListHeading(list: HTMLElement, listKind: string, isToggleEnabled: boolean): void {
  const heading = document.createElement('h2');

  const staticHeading = document.createElement('span');
  staticHeading.setAttribute('data-handout-list-static-heading', '');
  staticHeading.textContent = listKind;
  if (isToggleEnabled) {
    staticHeading.setAttribute('hidden', '');
  }

  const toggle = document.createElement('button');
  toggle.setAttribute('type', 'button');
  toggle.setAttribute('data-handout-list-toggle', '');
  toggle.setAttribute('aria-expanded', 'true');
  toggle.textContent = listKind;
  if (!isToggleEnabled) {
    toggle.setAttribute('hidden', '');
  }

  heading.append(staticHeading, toggle);
  list.append(heading);
}

function expectListToggleMode(dashboard: Element, isToggleEnabled: boolean): void {
  for (const list of dashboard.querySelectorAll('[data-handout-list]')) {
    expect(list.querySelector('[data-handout-list-toggle]')?.hasAttribute('hidden')).toBe(!isToggleEnabled);
    expect(list.querySelector('[data-handout-list-static-heading]')?.hasAttribute('hidden')).toBe(isToggleEnabled);
  }
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

  it('shows every list when the status is all and search is off', () => {
    const dashboard = createSearchDashboard();
    dashboard.setAttribute('data-status-filter', 'all');

    applyDashboardListVisibility(dashboard);

    expect(dashboard.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(false);
    expectListToggleMode(dashboard, true);
  });

  it('still hides draft and archived when the status is published and search is off', () => {
    const dashboard = createSearchDashboard();
    dashboard.setAttribute('data-status-filter', 'published');

    applyDashboardListVisibility(dashboard);

    expect(dashboard.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(true);
    expect(dashboard.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(true);
    expectListToggleMode(dashboard, false);
  });

  it('keeps every list visible when search starts and ends on all', () => {
    const dashboard = createSearchDashboard();
    dashboard.setAttribute('data-status-filter', 'all');

    applyDashboardSearch(dashboard, 'ma');
    expect(dashboard.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(false);
    expectListToggleMode(dashboard, false);

    applyDashboardSearch(dashboard, 'm');
    expect(dashboard.hasAttribute('data-search-active')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(false);
    expectListToggleMode(dashboard, true);
  });
});

function createCollapsibleDashboard(): HTMLElement {
  const dashboard = document.createElement('div');
  dashboard.setAttribute('data-dashboard', '');
  dashboard.setAttribute('data-status-filter', 'all');

  for (const listKind of ['draft', 'published', 'archived']) {
    const list = document.createElement('section');
    list.setAttribute('data-handout-list', listKind);

    appendListHeading(list, listKind, true);

    const body = document.createElement('div');
    body.setAttribute('data-handout-list-body', '');
    body.textContent = listKind;

    list.append(body);
    dashboard.append(list);
  }

  return dashboard;
}

describe('toggleDashboardListCollapse', () => {
  it('collapses only the draft body while all is selected and search is off', () => {
    const dashboard = createCollapsibleDashboard();
    const draftList = dashboard.querySelector('[data-handout-list="draft"]');
    expect(draftList).toBeInstanceOf(HTMLElement);
    if (!(draftList instanceof HTMLElement)) {
      return;
    }

    toggleDashboardListCollapse(dashboard, draftList);

    expect(draftList.hasAttribute('data-list-collapsed')).toBe(true);
    expect(draftList.querySelector('[data-handout-list-toggle]')?.getAttribute('aria-expanded')).toBe('false');
    expect(draftList.querySelector('[data-handout-list-body]')?.hasAttribute('inert')).toBe(true);
    expect(draftList.querySelector('[data-handout-list-body]')?.hasAttribute('hidden')).toBe(false);

    for (const listKind of ['published', 'archived']) {
      const list = dashboard.querySelector(`[data-handout-list="${listKind}"]`);
      expect(list?.hasAttribute('data-list-collapsed')).toBe(false);
      expect(list?.querySelector('[data-handout-list-body]')?.hasAttribute('inert')).toBe(false);
      expect(list?.querySelector('[data-handout-list-body]')?.hasAttribute('hidden')).toBe(false);
    }
  });

  it('expands the draft body on the second toggle', () => {
    const dashboard = createCollapsibleDashboard();
    const draftList = dashboard.querySelector('[data-handout-list="draft"]');
    expect(draftList).toBeInstanceOf(HTMLElement);
    if (!(draftList instanceof HTMLElement)) {
      return;
    }

    toggleDashboardListCollapse(dashboard, draftList);
    toggleDashboardListCollapse(dashboard, draftList);

    expect(draftList.hasAttribute('data-list-collapsed')).toBe(false);
    expect(draftList.querySelector('[data-handout-list-body]')?.hasAttribute('inert')).toBe(false);
    expect(draftList.querySelector('[data-handout-list-body]')?.hasAttribute('hidden')).toBe(false);
    expect(draftList.querySelector('[data-handout-list-toggle]')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('clears leftover hidden on the body when collapsing', () => {
    const dashboard = createCollapsibleDashboard();
    const draftList = dashboard.querySelector('[data-handout-list="draft"]');
    expect(draftList).toBeInstanceOf(HTMLElement);
    if (!(draftList instanceof HTMLElement)) {
      return;
    }
    draftList.querySelector('[data-handout-list-body]')?.setAttribute('hidden', '');

    toggleDashboardListCollapse(dashboard, draftList);

    expect(draftList.querySelector('[data-handout-list-body]')?.hasAttribute('hidden')).toBe(false);
    expect(draftList.querySelector('[data-handout-list-body]')?.hasAttribute('inert')).toBe(true);
  });

  it('does nothing when the status is published or search is active', () => {
    const publishedDashboard = createCollapsibleDashboard();
    publishedDashboard.setAttribute('data-status-filter', 'published');
    const publishedDraftList = publishedDashboard.querySelector('[data-handout-list="draft"]');
    expect(publishedDraftList).toBeInstanceOf(HTMLElement);
    if (!(publishedDraftList instanceof HTMLElement)) {
      return;
    }
    toggleDashboardListCollapse(publishedDashboard, publishedDraftList);
    expect(publishedDraftList.hasAttribute('data-list-collapsed')).toBe(false);

    const searchDashboard = createCollapsibleDashboard();
    searchDashboard.setAttribute('data-search-active', '');
    const searchDraftList = searchDashboard.querySelector('[data-handout-list="draft"]');
    expect(searchDraftList).toBeInstanceOf(HTMLElement);
    if (!(searchDraftList instanceof HTMLElement)) {
      return;
    }
    toggleDashboardListCollapse(searchDashboard, searchDraftList);
    expect(searchDraftList.hasAttribute('data-list-collapsed')).toBe(false);
  });

  it('clears collapse on every list when search becomes active', () => {
    const dashboard = createCollapsibleDashboard();
    for (const list of dashboard.querySelectorAll('[data-handout-list]')) {
      list.setAttribute('data-list-collapsed', '');
      list.querySelector('[data-handout-list-body]')?.setAttribute('inert', '');
    }

    applyDashboardSearch(dashboard, 'draft');

    for (const list of dashboard.querySelectorAll('[data-handout-list]')) {
      expect(list.hasAttribute('data-list-collapsed')).toBe(false);
      expect(list.querySelector('[data-handout-list-body]')?.hasAttribute('inert')).toBe(false);
      expect(list.querySelector('[data-handout-list-body]')?.hasAttribute('hidden')).toBe(false);
    }
  });

  it('expands every body and hides draft and archived when the status becomes published', () => {
    const dashboard = createCollapsibleDashboard();
    const draftList = dashboard.querySelector('[data-handout-list="draft"]');
    expect(draftList).toBeInstanceOf(HTMLElement);
    if (!(draftList instanceof HTMLElement)) {
      return;
    }
    toggleDashboardListCollapse(dashboard, draftList);
    dashboard.setAttribute('data-status-filter', 'published');

    applyDashboardListVisibility(dashboard);

    for (const list of dashboard.querySelectorAll('[data-handout-list]')) {
      expect(list.hasAttribute('data-list-collapsed')).toBe(false);
      expect(list.querySelector('[data-handout-list-body]')?.hasAttribute('inert')).toBe(false);
      expect(list.querySelector('[data-handout-list-body]')?.hasAttribute('hidden')).toBe(false);
    }
    expect(dashboard.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(false);
    expect(dashboard.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(true);
    expect(dashboard.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(true);
    expectListToggleMode(dashboard, false);
  });
});
