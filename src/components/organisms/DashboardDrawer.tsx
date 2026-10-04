import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { DrawerTypeFilters } from '@/components/molecules/DrawerTypeFilters';
import { getDrawerPresentation } from '@/lib/dashboard-drawer';
import {
  applyDashboardListVisibility,
  expandDashboardListBodies,
  toggleDashboardListCollapse,
} from '@/lib/dashboard-search';
import {
  applyDashboardTypeFilter,
  readDashboardTypeFilter,
  type DashboardTypeFilter,
} from '@/lib/dashboard-type-filter';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const WIDE_VIEWPORT_QUERY = '(min-width: 1024px)';
const PANEL_MOTION_MS = 200;

function isStatusFilter(value: string | null): value is StatusFilter {
  return value === 'all' || value === 'draft' || value === 'published' || value === 'archived';
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

function readInitialTypeFilter(): DashboardTypeFilter {
  if (typeof document === 'undefined') {
    return 'all';
  }

  const dashboard = document.querySelector('[data-dashboard]');
  if (!(dashboard instanceof HTMLElement)) {
    return 'all';
  }

  return readDashboardTypeFilter(dashboard);
}

function readIsWide(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(WIDE_VIEWPORT_QUERY).matches;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function DashboardDrawer() {
  const [isOverlayMounted, setIsOverlayMounted] = useState(false);
  const [isOverlayShown, setIsOverlayShown] = useState(false);
  const [isWide, setIsWide] = useState(readIsWide);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(readStatusFilter);
  const [typeFilter, setTypeFilter] = useState<DashboardTypeFilter>(readInitialTypeFilter);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presentation = getDrawerPresentation({ isWide });
  const isSidebar = presentation === 'sidebar';

  const closeOverlay = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (prefersReducedMotion()) {
      setIsOverlayShown(false);
      setIsOverlayMounted(false);
      return;
    }

    setIsOverlayShown(false);
    closeTimerRef.current = setTimeout(() => {
      setIsOverlayMounted(false);
      closeTimerRef.current = null;
    }, PANEL_MOTION_MS);
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(WIDE_VIEWPORT_QUERY);

    function handleViewportChange(event: MediaQueryListEvent) {
      setIsWide(event.matches);
      if (event.matches) {
        setIsOverlayMounted(false);
        setIsOverlayShown(false);
      }
    }

    mediaQuery.addEventListener('change', handleViewportChange);
    const frame = window.requestAnimationFrame(() => {
      setIsWide(mediaQuery.matches);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      mediaQuery.removeEventListener('change', handleViewportChange);
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOverlayShown || isSidebar) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }
      closeOverlay();
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [closeOverlay, isOverlayShown, isSidebar]);

  useEffect(() => {
    function handleListToggle(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const toggle = target.closest('[data-handout-list-toggle]');
      if (!(toggle instanceof HTMLButtonElement)) {
        return;
      }

      const dashboard = toggle.closest('[data-dashboard]');
      const list = toggle.closest('[data-handout-list]');
      if (!(dashboard instanceof HTMLElement) || !(list instanceof HTMLElement)) {
        return;
      }

      toggleDashboardListCollapse(dashboard, list);
    }

    document.addEventListener('click', handleListToggle);
    return () => {
      document.removeEventListener('click', handleListToggle);
    };
  }, []);

  function clearCloseTimer() {
    if (closeTimerRef.current === null) {
      return;
    }
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  function openOverlay() {
    clearCloseTimer();
    setIsOverlayMounted(true);
    setIsOverlayShown(true);
  }

  function applyStatusFilter(nextFilter: StatusFilter) {
    const dashboard = document.querySelector('[data-dashboard]');
    if (!(dashboard instanceof HTMLElement)) {
      return;
    }

    dashboard.setAttribute('data-status-filter', nextFilter);
    expandDashboardListBodies(dashboard);
    setStatusFilter(nextFilter);
    applyDashboardListVisibility(dashboard);
    applyDashboardTypeFilter(dashboard);

    if (!isSidebar) {
      closeOverlay();
    }
  }

  function applyTypeFilter(nextFilter: DashboardTypeFilter) {
    const dashboard = document.querySelector('[data-dashboard]');
    if (!(dashboard instanceof HTMLElement)) {
      return;
    }

    dashboard.setAttribute('data-type-filter', nextFilter);
    setTypeFilter(nextFilter);
    applyDashboardTypeFilter(dashboard);

    if (!isSidebar) {
      closeOverlay();
    }
  }

  function handleOpenClick() {
    if (isSidebar) {
      return;
    }
    if (isOverlayShown) {
      closeOverlay();
      return;
    }
    openOverlay();
  }

  const slotElement = typeof document === 'undefined' ? null : document.querySelector('[data-dashboard-drawer-slot]');
  const dashboardElement = typeof document === 'undefined' ? null : document.querySelector('[data-dashboard]');
  const overlayState = isOverlayShown ? 'open' : 'closed';

  const statusButtons = STATUS_FILTERS.map((filter) => (
    <Button
      key={filter.value}
      type="button"
      variant={statusFilter === filter.value ? 'secondary' : 'ghost'}
      aria-pressed={statusFilter === filter.value}
      className="w-full justify-start"
      onClick={() => {
        applyStatusFilter(filter.value);
      }}
    >
      {filter.label}
    </Button>
  ));

  const filterStack = (
    <>
      <div role="group" aria-label="Handout status" className="flex flex-col gap-1">
        {statusButtons}
      </div>
      <div role="separator" className="border-border my-2 border-t" />
      <DrawerTypeFilters typeFilter={typeFilter} onTypeFilterChange={applyTypeFilter} />
    </>
  );

  const sidebarPanel =
    isSidebar && slotElement instanceof HTMLElement
      ? createPortal(
          <div
            data-dashboard-drawer-panel
            data-drawer-presentation="sidebar"
            className="bg-card text-card-foreground border-border animate-in fade-in-0 slide-in-from-left flex h-full w-full flex-col gap-1 border-r p-3 duration-300 motion-reduce:animate-none"
          >
            {filterStack}
          </div>,
          slotElement,
        )
      : null;

  const overlayPanel =
    !isSidebar && isOverlayMounted && dashboardElement instanceof HTMLElement
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close sidebar"
              data-state={overlayState}
              className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-40 bg-black/40 duration-200 data-[state=closed]:pointer-events-none motion-reduce:animate-none"
              onClick={closeOverlay}
            />
            <div
              data-dashboard-drawer-panel
              data-drawer-presentation="overlay"
              data-state={overlayState}
              className={cn(
                'bg-card text-card-foreground border-border fixed top-0 left-0 z-50 flex h-dvh w-64 flex-col gap-1 border-r p-3 shadow-xl',
                'data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left duration-200 data-[state=closed]:pointer-events-none motion-reduce:animate-none',
              )}
            >
              {filterStack}
            </div>
          </>,
          dashboardElement,
        )
      : null;

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="lg:hidden [&_svg]:size-5"
        aria-expanded={isOverlayShown}
        aria-label={isOverlayShown ? 'Close sidebar' : 'Open sidebar'}
        onClick={handleOpenClick}
      >
        <PanelLeftOpen />
      </Button>
      {sidebarPanel}
      {overlayPanel}
    </>
  );
}

export default DashboardDrawer;
