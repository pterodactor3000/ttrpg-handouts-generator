import { BACKGROUND_CONFIGS } from '@/lib/backgrounds';
import type { BackgroundCategory } from '@/types';

type DashboardStatusFilter = 'all' | 'draft' | 'published' | 'archived';

interface HandoutSearchFields {
  title: string;
  tags: string[];
  backgroundCategory: string | null;
}

function isDashboardStatusFilter(value: string | null): value is DashboardStatusFilter {
  return value === 'all' || value === 'draft' || value === 'published' || value === 'archived';
}

function isBackgroundCategory(value: string): value is BackgroundCategory {
  return value === 'fantasy' || value === 'horror' || value === 'scifi';
}

function isDashboardSearchActive(query: string): boolean {
  return query.trim().length >= 2;
}

function fieldContainsQuery(field: string, trimmedQuery: string): boolean {
  return field.toLowerCase().includes(trimmedQuery.toLowerCase());
}

function handoutMatchesSearchQuery(fields: HandoutSearchFields, query: string): boolean {
  if (!isDashboardSearchActive(query)) {
    return false;
  }

  const trimmedQuery = query.trim();
  if (fieldContainsQuery(fields.title, trimmedQuery)) {
    return true;
  }

  for (const tag of fields.tags) {
    if (fieldContainsQuery(tag, trimmedQuery)) {
      return true;
    }
  }

  if (fields.backgroundCategory !== null && fieldContainsQuery(fields.backgroundCategory, trimmedQuery)) {
    return true;
  }

  if (fields.backgroundCategory !== null && isBackgroundCategory(fields.backgroundCategory)) {
    return fieldContainsQuery(BACKGROUND_CONFIGS[fields.backgroundCategory].label, trimmedQuery);
  }

  return false;
}

function readDashboardStatusFilter(dashboard: Element): DashboardStatusFilter {
  const statusFilter = dashboard.getAttribute('data-status-filter');
  if (isDashboardStatusFilter(statusFilter)) {
    return statusFilter;
  }

  return 'draft';
}

function readHandoutTags(card: Element): string[] {
  const rawTags = card.getAttribute('data-handout-tags');
  if (rawTags === null) {
    console.error('Failed to parse handout tags:', rawTags);
    return [];
  }

  try {
    const parsedTags: unknown = JSON.parse(rawTags) as unknown;
    if (!Array.isArray(parsedTags)) {
      console.error('Failed to parse handout tags:', rawTags);
      return [];
    }

    return parsedTags.filter((entry): entry is string => typeof entry === 'string');
  } catch (error) {
    console.error('Failed to parse handout tags:', rawTags, error);
    return [];
  }
}

function readCardSearchFields(card: Element): HandoutSearchFields {
  const titleElement = card.querySelector('[data-handout-title]');

  return {
    title: titleElement?.textContent ?? '',
    tags: readHandoutTags(card),
    backgroundCategory: card.getAttribute('data-background-category'),
  };
}

function setDashboardListBodyCollapsed(list: Element, isCollapsed: boolean): void {
  const toggle = list.querySelector('[data-handout-list-toggle]');
  const body = list.querySelector('[data-handout-list-body]');

  if (isCollapsed) {
    list.setAttribute('data-list-collapsed', '');
  } else {
    list.removeAttribute('data-list-collapsed');
  }

  if (toggle instanceof HTMLElement) {
    toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
  }

  if (!(body instanceof HTMLElement)) {
    return;
  }

  body.removeAttribute('hidden');
  if (isCollapsed) {
    body.setAttribute('inert', '');
    return;
  }

  body.removeAttribute('inert');
}

function expandDashboardListBodies(dashboard: Element): void {
  const lists = dashboard.querySelectorAll('[data-handout-list]');

  for (const list of lists) {
    setDashboardListBodyCollapsed(list, false);
  }
}

function isDashboardListToggleEnabled(dashboard: Element): boolean {
  return !dashboard.hasAttribute('data-search-active') && readDashboardStatusFilter(dashboard) === 'all';
}

function applyDashboardListToggleMode(dashboard: Element): void {
  const isToggleEnabled = isDashboardListToggleEnabled(dashboard);

  for (const list of dashboard.querySelectorAll('[data-handout-list]')) {
    const toggle = list.querySelector('[data-handout-list-toggle]');
    const staticHeading = list.querySelector('[data-handout-list-static-heading]');

    if (toggle instanceof HTMLElement) {
      if (isToggleEnabled) {
        toggle.removeAttribute('hidden');
      } else {
        toggle.setAttribute('hidden', '');
      }
    }

    if (staticHeading instanceof HTMLElement) {
      if (isToggleEnabled) {
        staticHeading.setAttribute('hidden', '');
      } else {
        staticHeading.removeAttribute('hidden');
      }
    }
  }
}

function applyDashboardListVisibility(dashboard: Element): void {
  applyDashboardListToggleMode(dashboard);
  const lists = dashboard.querySelectorAll('[data-handout-list]');

  if (dashboard.hasAttribute('data-search-active')) {
    for (const list of lists) {
      list.removeAttribute('hidden');
    }
    expandDashboardListBodies(dashboard);
    return;
  }

  const statusFilter = readDashboardStatusFilter(dashboard);
  if (statusFilter === 'all') {
    for (const list of lists) {
      list.removeAttribute('hidden');
    }
    return;
  }

  expandDashboardListBodies(dashboard);
  for (const list of lists) {
    if (list.getAttribute('data-handout-list') === statusFilter) {
      list.removeAttribute('hidden');
      continue;
    }

    list.setAttribute('hidden', '');
  }
}

function toggleDashboardListCollapse(dashboard: Element, list: Element): void {
  if (dashboard.hasAttribute('data-search-active') || readDashboardStatusFilter(dashboard) !== 'all') {
    return;
  }

  setDashboardListBodyCollapsed(list, !list.hasAttribute('data-list-collapsed'));
}

function applyDashboardSearch(dashboard: Element, query: string): void {
  const cards = dashboard.querySelectorAll('[data-handout-card]');

  if (!isDashboardSearchActive(query)) {
    dashboard.removeAttribute('data-search-active');
    for (const card of cards) {
      card.removeAttribute('data-search-hidden');
    }
  } else {
    dashboard.setAttribute('data-search-active', '');
    for (const card of cards) {
      if (handoutMatchesSearchQuery(readCardSearchFields(card), query)) {
        card.removeAttribute('data-search-hidden');
        continue;
      }

      card.setAttribute('data-search-hidden', '');
    }
  }

  applyDashboardListVisibility(dashboard);
}

export {
  applyDashboardListVisibility,
  applyDashboardSearch,
  expandDashboardListBodies,
  handoutMatchesSearchQuery,
  isDashboardSearchActive,
  toggleDashboardListCollapse,
};
export type { HandoutSearchFields };
