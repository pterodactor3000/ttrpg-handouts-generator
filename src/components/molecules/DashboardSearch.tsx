import { useState, type ChangeEvent } from 'react';
import { Input } from '@/components/atoms/input';
import { applyDashboardSearch } from '@/lib/dashboard-search';

function DashboardSearch() {
  const [query, setQuery] = useState('');

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    const nextQuery = event.target.value;
    setQuery(nextQuery);

    const dashboard = document.querySelector('[data-dashboard]');
    if (!(dashboard instanceof HTMLElement)) {
      return;
    }

    applyDashboardSearch(dashboard, nextQuery);
  }

  return (
    <div className="mt-4">
      <Input
        id="handout-search"
        type="search"
        value={query}
        placeholder="Search handouts"
        aria-label="Search handouts"
        autoComplete="off"
        data-handout-search=""
        onChange={handleQueryChange}
      />
    </div>
  );
}

export { DashboardSearch };
