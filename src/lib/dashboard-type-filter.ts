import type { BackgroundCategory } from '@/types';

type DashboardTypeFilter = 'all' | BackgroundCategory;

function isDashboardTypeFilter(value: string | null): value is DashboardTypeFilter {
  return value === 'all' || value === 'fantasy' || value === 'horror' || value === 'scifi';
}

function isBackgroundCategory(value: string | null): value is BackgroundCategory {
  return value === 'fantasy' || value === 'horror' || value === 'scifi';
}

function handoutMatchesTypeFilter(category: BackgroundCategory, typeFilter: DashboardTypeFilter): boolean {
  if (typeFilter === 'all') {
    return true;
  }

  return category === typeFilter;
}

function readDashboardTypeFilter(dashboard: Element): DashboardTypeFilter {
  const typeFilter = dashboard.getAttribute('data-type-filter');
  if (isDashboardTypeFilter(typeFilter)) {
    return typeFilter;
  }

  return 'all';
}

function applyDashboardTypeFilter(dashboard: Element): void {
  const typeFilter = readDashboardTypeFilter(dashboard);
  const cards = dashboard.querySelectorAll('[data-handout-card]');

  for (const card of cards) {
    const category = card.getAttribute('data-background-category');
    const isMatch =
      typeFilter === 'all' || (isBackgroundCategory(category) && handoutMatchesTypeFilter(category, typeFilter));

    if (isMatch) {
      card.removeAttribute('data-type-hidden');
      continue;
    }

    card.setAttribute('data-type-hidden', '');
  }
}

export { applyDashboardTypeFilter, handoutMatchesTypeFilter, isDashboardTypeFilter, readDashboardTypeFilter };
export type { DashboardTypeFilter };
