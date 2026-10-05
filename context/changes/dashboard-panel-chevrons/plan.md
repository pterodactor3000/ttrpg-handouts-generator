# Dashboard panel chevrons Implementation Plan

## Overview

TEC-45 adds a right-side chevron to every dashboard list heading. The chevron points up when that list is open and down when it is closed. The chevron and the list body animate on toggle. Collapse still works only when All is selected and search is off.

## Current State Analysis

`src/components/organisms/HandoutList.astro` renders Drafts, Published, and Archived. Each heading is a full-width `type="button"` with `data-handout-list-toggle` and `aria-expanded="true"`. The button text is only the heading. There is no chevron.

`src/lib/dashboard-search.ts` `toggleDashboardListCollapse` toggles `data-list-collapsed` on the section, flips `aria-expanded`, and sets or removes `hidden` on `[data-handout-list-body]`. `hidden` is `display: none`, so the body cannot animate. Collapse is a no-op unless `data-status-filter` is `all` and `data-search-active` is absent.

`expandDashboardListBodies` and single-status visibility still clear collapse and remove `hidden` from every body. Search still expands every body. Section-level `hidden` still belongs to the status filter, not to collapse.

`__tests__/lib/dashboard-search.test.ts` and `__tests__/components/organisms/DashboardDrawer.test.tsx` assert body `hidden` after a collapse.

The empty-state CSS in `HandoutList.astro` uses sibling selectors from `[data-handout-grid]` to `[data-handout-empty]`, `[data-handout-type-empty]`, and `[data-handout-search-empty]`. Those four nodes must stay siblings.

## Desired End State

On `/dashboard`, each list heading shows a Lucide-style chevron on the right. Open points up. Closed points down. A toggle rotates the chevron and animates the body height. `prefers-reduced-motion: reduce` still updates the chevron and the open or closed state, with no transition.

All-only collapse, search expand, and single-status expand stay as they are after TEC-41.

Verify with unit tests on collapse attributes, then on `/dashboard` with All selected.

### Key Discoveries

- Collapse already lives on `data-list-collapsed` and `aria-expanded`. The missing piece is the chevron and a hide method that can animate.
- `hidden` on the body blocks animation. `inert` plus CSS `grid-template-rows` `1fr` / `0fr` keeps the body in flow for the transition and still blocks interaction when closed.
- An inner overflow wrapper is required for the `0fr` clip. The grid and empty paragraphs must stay siblings inside that wrapper so the existing `+` / `~` selectors still match.
- `HandoutList.astro` is Astro, not a React island. An inline SVG matches Lucide stroke rules and avoids a client island for a static icon. The repo already uses Lucide stroke icons in React files.
- Drawer width and overlay already use `duration-*` with `motion-reduce:transition-none` or `motion-reduce:animate-none`.

## What We're NOT Doing

- Changing when collapse is allowed.
- Persisting collapse across reload.
- Adding a React island or a shadcn Collapsible.
- Changing drawer filters, search matching, or card layout.
- Adding a roadmap slice.

## Implementation Approach

Keep the existing click path and helpers. Stop using `hidden` for collapse. Drive height from `data-list-collapsed` in CSS. Drive the chevron from `aria-expanded`. Share one helper that writes collapsed attributes so toggle and expand stay in sync.

## Critical Implementation Details

`hidden` on `[data-handout-list]` still means "this status group is not in the current filter." Do not reuse that attribute for collapse.

When writing a collapsed or expanded body, remove leftover `hidden` on `[data-handout-list-body]` so a fixture or older markup cannot leave `display: none` in place and kill the animation.

## Phase 1: Chevrons and animated collapse

### Overview

Every list heading gets a right-side chevron. Collapse animates the body and the chevron. Tests follow the new attributes.

### Changes Required

#### 1. Heading chevron and animated body

**File:** `src/components/organisms/HandoutList.astro`

**Intent:** Show a chevron on the right of each heading and give the body a height animation that can run from `data-list-collapsed`.

**Contract:** The heading button uses `class:list` with a horizontal flex row, `items-center`, and `justify-between`. The heading text stays in a span. A decorative SVG with `data-handout-list-chevron` and `aria-hidden="true"` sits to the right. The SVG uses the Lucide 24 viewBox, `fill="none"`, `stroke="currentColor"`, and the ChevronDown path `m6 9 6 6 6-6`. When `aria-expanded` is `true`, the SVG rotates 180 degrees so it points up. The body keeps `data-handout-list-body` and its id. Inside it, a `[data-handout-list-body-inner]` wrapper with overflow hidden wraps the existing grid and empty paragraphs as siblings. Open uses `max-height: 200rem`. `[data-list-collapsed]` uses `max-height: 0`. A `0fr` grid track does not shrink below content height in the target browser. The chevron uses `rotate(0deg)` when closed and `rotate(180deg)` when `aria-expanded` is true. Chevron and body transitions last 200ms and use `motion-reduce` / `prefers-reduced-motion` to skip the transition.

#### 2. Collapse attributes

**File:** `src/lib/dashboard-search.ts`

**Intent:** Toggle and expand write one shared collapsed state that CSS and assistive tech can both read.

**Contract:** Add unexported `setDashboardListBodyCollapsed(list, isCollapsed)`. It sets or clears `data-list-collapsed` on the list, sets `aria-expanded` to the opposite of collapsed, sets or removes `inert` on `[data-handout-list-body]`, and removes `hidden` from that body. `toggleDashboardListCollapse` still returns early unless status is `all` and search is off. Otherwise it calls the helper with the flipped state. `expandDashboardListBodies` calls the helper with `isCollapsed` false for every list. `applyDashboardListVisibility` still uses section `hidden` for the status filter and still leaves collapse alone while All is selected and search is off.

#### 3. Collapse tests

**File:** `__tests__/lib/dashboard-search.test.ts`

**Intent:** Assert the attributes that now drive the animation instead of body `hidden`.

**Contract:** Collapse still sets `data-list-collapsed` and `aria-expanded="false"` on the toggled list only. The collapsed body has `inert` and does not have `hidden`. Other lists stay expanded, without `inert`. Search and a single status still clear collapse and `inert`. Fixtures that used to seed body `hidden` seed `inert` instead.

#### 4. Drawer click test

**File:** `__tests__/components/organisms/DashboardDrawer.test.tsx`

**Intent:** The heading click still collapses only Drafts during All.

**Contract:** After clicking Drafts during All, the draft body has `inert` and does not have `hidden`. Published and Archived stay without `data-list-collapsed` and without `inert`.

### Success Criteria

#### Automated Verification

- With All selected and search off, toggling draft sets `data-list-collapsed` on that section, `aria-expanded="false"` on its toggle, and `inert` on its body. The body does not have `hidden`. Published and Archived stay expanded.
- A second toggle on draft clears `data-list-collapsed` and `inert`, and sets `aria-expanded="true"`.
- Search and a single status still expand every body and still use section `hidden` for the filter.
- The drawer test still collapses only Drafts when that heading is clicked during All.
- `npm test -- --project unit` passes `__tests__/lib/dashboard-search.test.ts` and `__tests__/components/organisms/DashboardDrawer.test.tsx`.
- `npm run lint` passes.

#### Manual Verification

- On `/dashboard` with All selected, each heading has a right-side chevron. Open points up. Closed points down. Toggle animates the chevron and the body. Reduced motion skips the animation and still shows the correct chevron.

---

## Testing Strategy

### Unit Tests

- Collapse, expand, search-forced expand, and single-status expand in `dashboard-search.test.ts`.
- Heading click during All in `DashboardDrawer.test.tsx`.

### Integration Tests

- None. This is presentational dashboard markup and existing client helpers.

### Manual Testing Steps

1. Sign in, open `/dashboard`, choose All.
2. Confirm Drafts, Published, and Archived each show a right-side chevron pointing up.
3. Collapse Drafts. Confirm that chevron points down and only Drafts cards hide.
4. Expand Drafts. Confirm the chevron and body animate back open.
5. Choose Published, then All again. Confirm every group is open with chevrons up.

## Performance Considerations

Three short CSS transitions on user click. No extra network or React islands.

## Migration Notes

No data or schema change. Existing sessions keep the default expanded headings.

## References

- Linear: TEC-45
- Related: TEC-41 / `context/archive/2026-10-04-drawer-all-status/plan.md`
- Tailwind reduced motion: `motion-reduce:transition-none`
- Lucide SVG root attributes and ChevronDown path

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Chevrons and animated collapse

#### Automated

- [x] 1.1 With All selected and search off, toggling draft sets data-list-collapsed, aria-expanded false, and inert on its body without hidden
- [x] 1.2 A second toggle on draft clears collapse and inert, and sets aria-expanded true
- [x] 1.3 Search and a single status still expand every body and still use section hidden for the filter
- [x] 1.4 The drawer test still collapses only Drafts when that heading is clicked during All
- [x] 1.5 npm test -- --project unit passes dashboard-search and DashboardDrawer tests
- [x] 1.6 npm run lint passes

#### Manual

- [x] 1.7 On /dashboard with All selected, each heading has a right-side chevron that tracks open or closed with animation, and reduced motion skips the animation
