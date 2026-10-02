# Dashboard Drawer Navigation Implementation Plan

## Overview

S-12 lets a GM show only Drafts, only Published, or only Archived from a left drawer on `/dashboard`. First load is Drafts. At 768px and up the drawer stays open as a sidebar. There is no pin control. Below 768px an icon opens an overlay, and choosing a status closes it. This covers FR-002 (the GM still sees their handouts) and FR-008 (archived handouts stay reachable, and archive or permanent delete still works).

## Current State Analysis

`src/pages/dashboard.astro` loads every handout for the signed-in GM (`id, title, tags, status, background_category, share_token, created_at`) and calls `partitionHandouts` (`src/lib/handout-list.ts`). That split puts `draft` and `published` in `active` and `archived` in `archived`. The page then renders two `HandoutList` sections: "Your handouts" and "Archived".

`HandoutList` (`src/components/organisms/HandoutList.astro`) sets `data-handout-list` and `data-handout-grid` to `active` or `archived`. An empty archived section gets the `hidden` class. The active empty state is a slot: "You have not created any handouts yet."

`moveHandoutCardToArchivedSection` (`src/lib/archive-handout-card-dom.ts`) moves the card into `[data-handout-grid="archived"]` and calls `classList.remove('hidden')` on `[data-handout-list="archived"]`. `__tests__/lib/archive-handout-card-dom.test.ts` asserts that class is removed. `removePermanentDeletedHandoutCard` adds `hidden` when the archived grid becomes empty.

`HandoutCard` hides Edit when `status === 'archived'` and swaps Archive for Delete. No drawer component exists. `src/components/atoms/dialog.tsx` is a centered modal. `--radius` is `0rem` in `src/styles/global.css`, so the `Button` atom's `rounded-md` is already square.

## Desired End State

On `/dashboard`, the GM sees only draft handouts. At 768px and up, a left sidebar stays open with Drafts, Published, and Archived. There is no pin control. Below 768px, a header icon opens a left overlay. Choosing one shows only that status and closes the overlay. Refresh shows Drafts. At 768px and up the sidebar is open again. Below that width the overlay is closed. Archiving a draft removes it from Drafts and does not reveal Archived. Archived cards still have no Edit control.

Verify by: signing in, opening `/dashboard`, and walking the manual steps in each phase.

## What We're NOT Doing

- S-11 tile sizing and themed top strips
- S-14 unarchive, or any edit affordance on archived cards
- S-13 account deletion
- `localStorage`, a URL query, or any persistence past refresh
- A schema change, a new API route, or a second fetch filtered by status
- Showing drafts and published in one list

## Implementation Approach

Keep the existing SSR query. Group the rows by exact status and render three lists. Show one list with the `hidden` attribute, not the `hidden` class, because the archive mover already strips that class.

The drawer is a React island mounted in the header. It does not wrap `HandoutList`. It writes `data-status-filter` on `[data-dashboard]`. The wide sidebar portals into `[data-dashboard-drawer-slot]`. The narrow overlay portals into `[data-dashboard]`. That avoids the island-nesting failure recorded for `client:load` parents in the square-ui-containers review.

## Critical Implementation Details

Filter visibility and the archive mover must not share the `hidden` class.

`moveHandoutCardToArchivedSection` removes `hidden` from the archived section so the old two-list page can reveal Archived after an archive. If Phase 1 hides Published and Archived with that same class, archiving a draft would show Archived while Drafts is still selected.

Use the HTML `hidden` attribute for the filter. The mover may keep removing the `hidden` class so the current unit test stays true. Add a test that a section with the `hidden` attribute still has it after the move.

`removePermanentDeletedHandoutCard` must not add the `hidden` class when `[data-dashboard][data-status-filter]` is present. An empty selected list shows `[data-handout-empty]` instead. CSS hides that empty node when the previous grid contains an `article`. Whitespace text nodes must not count as cards.

Drawer presentation is a pure function so tests do not depend on `matchMedia`:

```ts
type DrawerPresentation = 'sidebar' | 'overlay';

function getDrawerPresentation(input: { isWide: boolean }): DrawerPresentation {
  if (input.isWide) {
    return 'sidebar';
  }
  return 'overlay';
}
```

`isWide` is `window.matchMedia('(min-width: 768px)').matches`, read in the island and on resize. Do not read or write `localStorage`. Do not add a pin control.

## Phase 1: Three status lists

### Overview

`/dashboard` renders draft, published, and archived lists. Only Drafts is visible. Each status has an empty state. Archiving a draft moves the card into the archived grid and leaves Archived hidden.

### Changes Required

#### 1. Status grouping

**File:** `src/lib/handout-list.ts`

**Intent:** Replace the active/archived split with three status groups. `dashboard.astro` is the only production caller of `partitionHandouts`.

**Contract:** Export `groupHandoutsByStatus(handouts): { draft, published, archived }`. Each array is sorted by `created_at` descending, same comparator as today. Remove `partitionHandouts` and update `__tests__/lib/handout-list.test.ts` to the three-group shape, including the empty-input case and the all-archived case.

#### 2. One visible list

**File:** `src/pages/dashboard.astro`

**Intent:** Render three lists from the existing query. Do not add a query or a status filter in Supabase.

**Contract:** The loaded branch's outer wrapper is `<div data-dashboard data-status-filter="draft">`. Render `HandoutList` three times with `listKind` `draft`, `published`, and `archived`. The published and archived sections have the `hidden` attribute on first paint. The query, error cards, and header actions stay.

#### 3. Per-status empty copy

**File:** `src/components/organisms/HandoutList.astro`

**Intent:** The selected list stays on screen when it has no cards, with copy for that status.

**Contract:** `listKind` is `'draft' | 'published' | 'archived'`. `data-handout-list` and `data-handout-grid` use that value. The section has the HTML `hidden` attribute when `listKind` is not `draft`. Always render the grid, including when it is empty. Always render a following `[data-handout-empty]` node. Draft empty copy is "No drafts." and keeps the create-handout link. Published copy is "No published handouts." Archived copy is "No archived handouts." Do not put the `hidden` class on an empty archived section. Add a style rule so `[data-handout-empty]` is `display: none` when the previous grid contains an `article`.

#### 4. Archive and delete stay on the hidden attribute

**File:** `src/lib/archive-handout-card-dom.ts`

**Intent:** Moving or deleting a card must not change which status filter is visible.

**Contract:** `moveHandoutCardToArchivedSection` still prepends to `[data-handout-grid="archived"]` and still removes the `hidden` class. It must not remove the `hidden` attribute. `removePermanentDeletedHandoutCard` still removes the card. It adds the `hidden` class only when `[data-dashboard][data-status-filter]` is absent. When that attribute is present and the archived grid is empty, it leaves the section's `hidden` attribute alone so the empty copy can show.

**File:** `__tests__/lib/archive-handout-card-dom.test.ts`

**Intent:** Lock the attribute behavior without dropping the existing class assertion.

**Contract:** Keep the current test. Add a case whose archived section has the `hidden` attribute and no `hidden` class. After the move, the attribute is still present and the card is inside `[data-handout-grid="archived"]`. Add a case for `removePermanentDeletedHandoutCard` under `[data-dashboard][data-status-filter="archived"]`: the last card is removed, the section does not gain the `hidden` class, and the `hidden` attribute is unchanged.

### Success Criteria

#### Automated Verification

- `groupHandoutsByStatus` returns separate `draft`, `published`, and `archived` arrays, each ordered by `created_at` descending.
- `npm test -- --project unit` passes `__tests__/lib/handout-list.test.ts` and `__tests__/lib/archive-handout-card-dom.test.ts`.
- Archiving a card does not remove the `hidden` attribute from `[data-handout-list="archived"]`.

#### Manual Verification

- `/dashboard` first paint shows the Drafts heading and only draft cards.
- A GM whose handouts are all published sees "No drafts." and does not see those published cards.
- Archiving a draft removes that card from Drafts and does not show the Archived list.

---

## Phase 2: Drawer filters

### Overview

A header toggle opens a left overlay with Drafts, Published, and Archived. Choosing one sets the visible list and closes the overlay. First load stays on Drafts.

### Changes Required

#### 1. Drawer island

**File:** `src/components/organisms/DashboardDrawer.tsx`

**Intent:** Open, choose a status, and close, without hydrating the handout lists.

**Contract:** Default export. Props are none. On mount, require `[data-dashboard]` and `[data-dashboard-drawer-slot]`. The trigger is an icon `Button` with `aria-label` "Open sidebar" or "Close sidebar", `aria-expanded` matching open state, and it is hidden at 768px and up. On a narrow viewport the panel is `fixed` to the left viewport edge, with three buttons: Drafts, Published, Archived. The active button matches `data-status-filter`. Choosing one sets `data-status-filter` to `draft`, `published`, or `archived`, removes the `hidden` attribute from the matching `[data-handout-list]`, sets `hidden` on the other two, then closes the overlay. Backdrop click and Escape close the overlay and leave `data-status-filter` unchanged. The island does not wrap `HandoutList` and does not render `HandoutCard`.

#### 2. Mount point

**File:** `src/pages/dashboard.astro`

**Intent:** Put the trigger in the header and give the panel a portal target.

**Contract:** Inside the `data-dashboard` wrapper, add an empty `<div data-dashboard-drawer-slot>` before the content column. Render `<DashboardDrawer client:load />` in the header row, before the "Dashboard" heading. Error and unconfigured branches do not mount the drawer.

#### 3. Presentation helper

**File:** `src/lib/dashboard-drawer.ts`

**Intent:** Hold `getDrawerPresentation` where unit tests can import it without rendering the island.

**Contract:** Export the function from Critical Implementation Details. A narrow viewport passes `isWide: false`, so the result is `overlay`.

**File:** `__tests__/components/organisms/DashboardDrawer.test.tsx`

**Intent:** Cover filter selection and dismiss.

**Contract:** The file starts with `// @vitest-environment jsdom` and `import '@testing-library/jest-dom/vitest'`, matching `ArchiveButton.test.tsx`. Render the island against a fixture that contains `[data-dashboard]`, three `[data-handout-list]` sections (published and archived start with the `hidden` attribute), and `[data-dashboard-drawer-slot]`. Clicking Published sets `data-status-filter="published"`, removes `hidden` from the published section, sets `hidden` on draft and archived, and closes the panel. Escape after open leaves `data-status-filter` at its previous value.

### Success Criteria

#### Automated Verification

- Choosing Published in the drawer test sets `data-status-filter="published"` and closes the panel.
- Escape closes the panel and leaves `data-status-filter` unchanged.
- `npm test -- --project unit` passes `__tests__/components/organisms/DashboardDrawer.test.tsx`.

#### Manual Verification

- The sidebar icon opens a left overlay over the dashboard on a narrow viewport.
- Drafts, Published, and Archived each show only handouts of that status.
- Backdrop click and Escape close the overlay without changing the current list.
- A fresh load still opens on Drafts with the overlay closed.

---

## Phase 3: Wide sidebar

### Overview

At width 768px and up the drawer stays open as a sidebar. There is no pin control. Narrower widths use an icon to open an overlay. Choosing a status closes that overlay.

### Changes Required

#### 1. Presentation

**File:** `src/components/organisms/DashboardDrawer.tsx`

**Intent:** Show a sidebar on a wide viewport without a pin control.

**Contract:** There is no Pin button and no `data-drawer-pinned` attribute. `isWide` comes from `(min-width: 768px)` and updates on resize. The panel uses `getDrawerPresentation`. `sidebar` means the slot is in normal flow at `16rem` wide, the panel is not `fixed`, and there is no backdrop. `overlay` means the fixed panel and backdrop. Choosing a filter closes the panel only when the presentation is `overlay`. While that overlay is closing, the backdrop and panel do not accept pointer events. The island does not call `localStorage`. A full reload mounts with `data-status-filter="draft"`. At 768px and up the sidebar is open. Below that the overlay starts closed.

#### 2. Sidebar layout

**File:** `src/pages/dashboard.astro`

**Intent:** Let the wide drawer sit beside the tile grid instead of covering it.

**Contract:** `[data-dashboard]` is a row (`flex`, `min-h-screen`, `items-stretch`). `[data-dashboard-drawer-slot]` is the first child. The content column is the second child, with `min-w-0` and `flex-1`, and it contains the `max-w-6xl` column. At 768px and up the slot is `16rem` wide (`md:w-64`) and the column keeps the grid. Below 768px the slot width is 0.

#### 3. Tests

**File:** `__tests__/lib/dashboard-drawer.test.ts`

**Intent:** Lock the width rule without a browser viewport.

**Contract:** `getDrawerPresentation({ isWide: true })` is `sidebar`. `{ isWide: false }` is `overlay`.

**File:** `__tests__/components/organisms/DashboardDrawer.test.tsx`

**Intent:** A wide sidebar stays open, and the island has no pin control.

**Contract:** With `isWide` forced true, the panel is open as `sidebar`, Pin and Unpin are absent, and choosing a filter leaves the panel open. The test does not call `localStorage.setItem`.

### Success Criteria

#### Automated Verification

- `getDrawerPresentation` returns `sidebar` when `isWide` is true and `overlay` when `isWide` is false.
- The drawer test asserts Pin and Unpin controls are absent.
- Choosing a filter while the presentation is `sidebar` leaves the panel open.
- `npm test -- --project unit` passes the drawer unit tests, and `npm run lint` passes.

#### Manual Verification

- At 768px or wider, the drawer stays open beside the tiles with no pin control, and the grid remains usable.
- Refresh shows Drafts. At 768px or wider the drawer is open. Below that it is closed.
- Below 768px the drawer is an overlay and does not squeeze the grid.
- Choosing a status in the overlay closes it.

---

## Testing Strategy

### Unit Tests

- `groupHandoutsByStatus` groups and sorts each status, including empty input and a single archived row.
- Archive move keeps the `hidden` attribute. Permanent delete under an active filter does not hide the archived section with the `hidden` class.
- Drawer selection, Escape, the wide sidebar, and `getDrawerPresentation`.

### Integration Tests

- No new Supabase integration test. The dashboard query and archive API stay as they are. Existing `__tests__/integration/handouts/archive-handout.integration.test.ts` remains the API contract.

### Manual Testing Steps

1. Sign in and open `/dashboard`. Confirm only drafts are visible.
2. On a narrow viewport, open the sidebar icon, choose Published, then Archived, and confirm each list matches the status badges.
3. From Drafts, archive a handout. Confirm it disappears and Archived does not open by itself.
4. Open Archived and confirm that card is there, with Delete and without Edit.
5. At 768px or wider, confirm the drawer is open beside the tiles with no pin control. Resize below 768px and confirm the drawer is an overlay. Refresh and confirm Drafts.

## Migration and Rollback

No data migration. Revert the branch to restore the two-list dashboard. Archive and delete API behavior is unchanged.

## References

- Roadmap: `context/foundation/roadmap.md` (S-12)
- PRD: `context/foundation/prd.md` (FR-002, FR-008)
- `src/pages/dashboard.astro` (query and the two current lists)
- `src/lib/handout-list.ts` (`partitionHandouts`)
- `src/components/organisms/HandoutList.astro` (empty archived section uses the `hidden` class)
- `src/lib/archive-handout-card-dom.ts` (`classList.remove('hidden')` and `classList.add('hidden')`)
- `src/components/molecules/HandoutCard.astro` (Edit hidden when archived)
- `src/styles/global.css` (`--radius: 0rem`)
- `context/foundation/lessons.md` (atomic design, shadcn atom defaults, `client:load` nesting)

## Progress

> `- [ ]` is pending and `- [x]` is complete. Append a commit SHA when a step lands.

### Phase 1: Three status lists

#### Automated

- [x] 1.1 `groupHandoutsByStatus` returns separate `draft`, `published`, and `archived` arrays, each ordered by `created_at` descending. 97a5d02
- [x] 1.2 `npm test -- --project unit` passes `__tests__/lib/handout-list.test.ts` and `__tests__/lib/archive-handout-card-dom.test.ts`. 97a5d02
- [x] 1.3 Archiving a card does not remove the `hidden` attribute from `[data-handout-list="archived"]`. 97a5d02

#### Manual

- [x] 1.4 `/dashboard` first paint shows the Drafts heading and only draft cards.
- [x] 1.5 A GM whose handouts are all published sees "No drafts." and does not see those published cards.
- [x] 1.6 Archiving a draft removes that card from Drafts and does not show the Archived list.

### Phase 2: Drawer filters

#### Automated

- [x] 2.1 Choosing Published in the drawer test sets `data-status-filter="published"` and closes the panel. 1df2fa8
- [x] 2.2 Escape closes the panel and leaves `data-status-filter` unchanged. 1df2fa8
- [x] 2.3 `npm test -- --project unit` passes `__tests__/components/organisms/DashboardDrawer.test.tsx`. 1df2fa8

#### Manual

- [x] 2.4 The sidebar icon opens a left overlay over the dashboard on a narrow viewport.
- [x] 2.5 Drafts, Published, and Archived each show only handouts of that status.
- [x] 2.6 Backdrop click and Escape close the overlay without changing the current list.
- [x] 2.7 A fresh load still opens on Drafts with the overlay closed.

### Phase 3: Wide sidebar

#### Automated

- [x] 3.1 `getDrawerPresentation` returns `sidebar` when `isWide` is true and `overlay` when `isWide` is false. 7474098
- [x] 3.2 The drawer test asserts Pin and Unpin controls are absent. 7474098
- [x] 3.3 Choosing a filter while the presentation is `sidebar` leaves the panel open. 952b918
- [x] 3.4 `npm test -- --project unit` passes the drawer unit tests, and `npm run lint` passes. 952b918

#### Manual

- [x] 3.5 At 768px or wider, the drawer stays open beside the tiles with no pin control, and the grid remains usable.
- [x] 3.6 Refresh shows Drafts. At 768px or wider the drawer is open. Below that it is closed.
- [x] 3.7 Below 768px the drawer is an overlay and does not squeeze the grid.
- [x] 3.8 Choosing a status in the overlay closes it.
