import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/atoms/button';
import { getDrawerPresentation } from '@/lib/dashboard-drawer';

type StatusFilter = 'draft' | 'published' | 'archived';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

function isStatusFilter(value: string | null): value is StatusFilter {
  return value === 'draft' || value === 'published' || value === 'archived';
}

function readStatusFilter(): StatusFilter {
  if (typeof document === 'undefined') {
    return 'draft';
  }

  const currentFilter = document.querySelector('[data-dashboard]')?.getAttribute('data-status-filter') ?? null;
  if (isStatusFilter(currentFilter)) {
    return currentFilter;
  }

  return 'draft';
}

function DashboardDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(readStatusFilter);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }
      setIsOpen(false);
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  function applyStatusFilter(nextFilter: StatusFilter) {
    const dashboard = document.querySelector('[data-dashboard]');
    if (!(dashboard instanceof HTMLElement)) {
      return;
    }

    dashboard.setAttribute('data-status-filter', nextFilter);
    setStatusFilter(nextFilter);

    const lists = document.querySelectorAll('[data-handout-list]');
    for (const list of lists) {
      if (!(list instanceof HTMLElement)) {
        continue;
      }
      if (list.getAttribute('data-handout-list') === nextFilter) {
        list.removeAttribute('hidden');
      } else {
        list.setAttribute('hidden', '');
      }
    }

    const presentation = getDrawerPresentation({ isPinned: false, isWide: false });
    if (presentation === 'overlay') {
      setIsOpen(false);
    }
  }

  const slotElement = isOpen ? document.querySelector('[data-dashboard-drawer-slot]') : null;

  const panel = (
    <>
      <button
        type="button"
        aria-label="Close filters"
        className="fixed inset-0 z-30 bg-black/40"
        onClick={() => {
          setIsOpen(false);
        }}
      />
      <div
        data-dashboard-drawer-panel
        className="bg-card border-border fixed top-0 left-0 z-40 flex h-screen w-64 flex-col gap-2 border-r p-4"
      >
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            variant={statusFilter === filter.value ? 'default' : 'outline'}
            aria-pressed={statusFilter === filter.value}
            className="justify-start"
            onClick={() => {
              applyStatusFilter(filter.value);
            }}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </>
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
      >
        Filters
      </Button>
      {isOpen && slotElement instanceof HTMLElement ? createPortal(panel, slotElement) : null}
    </>
  );
}

export default DashboardDrawer;
