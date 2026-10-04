# All Status Filter Implementation Plan

## Overview

S-19 adds All beside Drafts, Published, and Archived. All shows those three handout groups together. Each heading collapses and expands only its own group. One selected state still shows only that state. Search still shows every group and clears a collapse. PRD refs: FR-002, FR-008, TBD - add FR in separate PRD edit.

## Current State Analysis

`src/pages/dashboard.astro` renders `[data-dashboard]` with `data-status-filter="draft"` and three `HandoutList` sections. Published and Archived start with the `hidden` attribute (`src/components/organisms/HandoutList.astro`, lines 12-16).

`src/components/organisms/DashboardDrawer.tsx` keeps `StatusFilter` as `'draft' | 'published' | 'archived'` (line 15). `applyStatusFilter` writes `data-status-filter`, then calls `applyDashboardListVisibility` and `applyDashboardTypeFilter` (lines 162-176). The state buttons are Drafts, Published, and Archived (lines 17-21, 208-221). A separator sits before `DrawerTypeFilters`.

`DrawerTypeFilters` already renders a button whose accessible name is All, inside `role="group"` named Handout type (`src/components/molecules/DrawerTypeFilters.tsx`, lines 19-31). `__tests__/components/organisms/DashboardDrawer.test.tsx` uses `getByRole('button', { name: 'All' })` for that type button (lines 114 and 174).

`applyDashboardListVisibility` in `src/lib/dashboard-search.ts` (lines 95-114) removes `hidden` from every `[data-handout-list]` when `data-search-active` is set. Otherwise it shows the list whose `data-handout-list` equals `data-status-filter` and hides the rest. An invalid value falls back to `draft` (`readDashboardStatusFilter`, lines 55-61). `__tests__/lib/dashboard-search.test.ts` covers that search shows every list and that clearing search restores the status filter.

## Desired End State

On the dashboard, All in the state filters shows Drafts, Published, and Archived at the same time. Each heading collapses and expands only that group's cards and empty copy. Drafts, Published, or Archived still shows one list. While search is active, all three lists stay visible and expanded. The type All button still clears the type filter.

Verify with `npm test -- --project unit` for the dashboard search and drawer tests, then on `/dashboard`: press All, collapse one heading, press Published, and run a two-character search.

## What We're NOT Doing

- Changing the type All control, type matching, or search matching.
- Making All the default. The first view stays Drafts.
- Saving the selected state or a collapsed group across reload.
- Changing archive, restore, edit, or share behavior.
- Renaming Grimdark or changing the landing page.

## Implementation Approach

Keep one `data-status-filter` attribute and teach it the value `all`. Reuse `applyDashboardListVisibility` so search and the drawer stay on the same path. Put the new All button in `role="group"` with `aria-label="Handout status"`, ahead of Drafts, so tests can tell it from the type All. Wrap each list's cards and empty copy in `[data-handout-list-body]` and toggle that body from the heading. Collapse is allowed only when the status is `all` and `data-search-active` is absent. Choosing a single state, choosing All, or starting a search expands every body.

## Critical Implementation Details

The grid and the empty paragraphs must stay siblings inside `[data-handout-list-body]`. `HandoutList.astro` uses `+` and `~` from `[data-handout-grid]` to `[data-handout-empty]`, `[data-handout-type-empty]`, and `[data-handout-search-empty]`. A wrapper around the whole section would break those selectors. Hiding the body must not set `hidden` on the section, because the section `hidden` attribute is what the status filter uses.

`getByRole('button', { name: 'All' })` matches two buttons after this change. Drawer tests that mean the type All must query inside the Handout type group. Tests for the status All must query inside the Handout status group.

## Phase 1: All status visibility

### Overview

All writes `data-status-filter="all"` and shows every handout list. Drafts, Published, and Archived still show one list. Search still shows every list and still restores the selected status when the query drops below two characters.

### Changes Required

#### 1. Status guard and list visibility

**File:** `src/lib/dashboard-search.ts`

**Intent:** Accept `all` as a status filter and show every list for that value without changing search.

**Contract:** `DashboardStatusFilter` includes `'all'`. `isDashboardStatusFilter` accepts `all` and still rejects every other string, including empty string and `null`. `readDashboardStatusFilter` returns `all` when the attribute is `all`, and still returns `draft` for a missing or invalid attribute. `applyDashboardListVisibility` removes `hidden` from every `[data-handout-list]` when `data-search-active` is set, and also when the status is `all` and search is off. For `draft`, `published`, or `archived` with search off, it shows that list and sets `hidden` on the other two.

#### 2. All button in the state filters

**File:** `src/components/organisms/DashboardDrawer.tsx`

**Intent:** Add All ahead of Drafts, Published, and Archived, using the same button treatment as those three.

**Contract:** `StatusFilter` includes `'all'`. `readStatusFilter` returns `all` when `data-status-filter` is `all`, and still returns `draft` otherwise when the attribute is missing or invalid. The four buttons sit in `role="group"` with `aria-label="Handout status"`, in order All, Drafts, Published, Archived. The pressed button uses `variant="secondary"` and `aria-pressed="true"`. `applyStatusFilter('all')` sets `data-status-filter="all"`, updates the pressed state, and calls `applyDashboardListVisibility` then `applyDashboardTypeFilter`. On a narrow viewport it still closes the overlay. On a wide viewport the sidebar stays open. The type group and its All button stay as they are.

### Success Criteria

#### Automated Verification

- `applyDashboardListVisibility` with `data-status-filter="all"` and no `data-search-active` leaves draft, published, and archived lists without `hidden`.
- `applyDashboardListVisibility` with `data-status-filter="published"` and no search still hides draft and archived.
- `applyDashboardSearch` with a query of two or more characters still shows every list when the status is `all`, and clearing that query keeps every list visible.
- Choosing the status All button sets `data-status-filter` to `all`, shows all three lists, and closes the overlay on a narrow viewport.
- Choosing Published after that sets `data-status-filter` to `published` and hides draft and archived.
- The existing type All test still sets `data-type-filter` to `all` and clears `data-type-hidden`.
- `npm test -- --project unit` passes `__tests__/lib/dashboard-search.test.ts` and `__tests__/components/organisms/DashboardDrawer.test.tsx`.
- `npm run lint` passes.

#### Manual Verification

- On `/dashboard`, All shows Drafts, Published, and Archived together. Published then shows only Published.

---

## Phase 2: Collapsible headings

### Overview

While All is selected and search is off, each list heading collapses and expands only that list's body. Search and a single-state choice expand every body.

### Changes Required

#### 1. List body and heading button

**File:** `src/components/organisms/HandoutList.astro`

**Intent:** Keep the heading visible and make the cards and empty copy one collapsible body.

**Contract:** The section still has `data-handout-list` and the same initial `hidden` rule (`listKind !== 'draft'`). The heading is an `h2` containing a `type="button"` with `data-handout-list-toggle`, `aria-expanded="true"`, and `aria-controls` pointing at `handout-list-body-<listKind>`. The grid, `[data-handout-empty]`, `[data-handout-type-empty]`, and `[data-handout-search-empty]` stay siblings inside a `div` with that id and `data-handout-list-body`. The existing style block stays, so those sibling selectors still match.

#### 2. Collapse helper

**File:** `src/lib/dashboard-search.ts`

**Intent:** Toggle one body, and expand every body when search or a single status takes over.

**Contract:** `toggleDashboardListCollapse(dashboard, list)` returns without changes unless `data-status-filter` is `all` and `data-search-active` is absent. Otherwise it toggles `data-list-collapsed` on that list only, sets the toggle `aria-expanded` to the opposite of collapsed, and sets or removes `hidden` on `[data-handout-list-body]`. It does not set `hidden` on the section and does not change other lists. `applyDashboardListVisibility` does not know the previous status. While the status is `all` and search is off, it removes `hidden` from every section and leaves `data-list-collapsed` and body `hidden` unchanged. While `data-search-active` is set, it removes `hidden` from every section and expands every body. For a single status it shows that section, hides the other two, and expands every body. `applyStatusFilter` expands every body before it calls `applyDashboardListVisibility`, including when the next status is `all`, so choosing All starts with every group open. A later toggle may collapse a body again while All remains selected and search stays off.

#### 3. Heading clicks

**File:** `src/components/organisms/DashboardDrawer.tsx`

**Intent:** A click on a list heading uses the helper. The drawer does not own the collapsed markup.

**Contract:** A document click listener calls `toggleDashboardListCollapse` when the event target is inside `[data-handout-list-toggle]` and that button is inside `[data-handout-list]` under `[data-dashboard]`. The listener is removed on unmount. Choosing All, Drafts, Published, or Archived still goes through `applyStatusFilter`, which expands every body.

### Success Criteria

#### Automated Verification

- With `data-status-filter="all"` and search off, toggling the draft list sets `data-list-collapsed` on that section, `aria-expanded="false"` on its toggle, and `hidden` on its body. The published and archived sections stay without `data-list-collapsed`, and their bodies stay without `hidden`.
- Toggling that draft list again removes `data-list-collapsed` and the body `hidden`, and sets `aria-expanded="true"`.
- `toggleDashboardListCollapse` does nothing when the status is `published` or when `data-search-active` is set.
- `applyDashboardSearch` with an active query removes `data-list-collapsed` and body `hidden` from every list.
- `applyDashboardListVisibility` after setting the status to `published` expands every body and hides the draft and archived sections.
- A drawer click on the Drafts heading, while status All is selected, collapses only the draft body.
- `npm test -- --project unit` passes `__tests__/lib/dashboard-search.test.ts` and `__tests__/components/organisms/DashboardDrawer.test.tsx`.
- `npm run lint` passes.

#### Manual Verification

- With All selected, collapsing Drafts hides draft cards and leaves Published and Archived open. Expanding Drafts shows them again.
- A two-character search shows all three groups expanded. Clearing the search returns to the selected status.
- Choosing Published shows only Published, with its cards visible.

---

## Testing Strategy

### Unit Tests

- Extend `__tests__/lib/dashboard-search.test.ts` for `all`, for collapse of one list, and for search clearing collapse.
- Extend `__tests__/components/organisms/DashboardDrawer.test.tsx` so the status All and the type All are queried inside their groups. Cover All, the return to Published, and a heading collapse.
- Leave `__tests__/lib/handout-list-search-empty.test.ts` on its copied selectors. Do not wrap the grid away from its empty siblings.

### Integration Tests

- No API or database change. Integration tests are not required.

### Manual Testing Steps

1. Open `/dashboard` and confirm Drafts is pressed and the other two lists are absent.
2. Press All. Confirm all three headings and their cards or empty copy.
3. Collapse Published. Confirm Drafts and Archived stay open.
4. Press Drafts. Confirm only Drafts shows, expanded.
5. Press All, collapse Archived, then type two characters that match a handout. Confirm all three groups are expanded. Clear the search and confirm All is still pressed.

## Migration and Rollback

No schema or stored status value. Revert the three source files and the two test files to restore one-state filtering.

## References

- Roadmap: `context/foundation/roadmap.md` (S-19)
- PRD: `context/foundation/prd.md` (FR-002, FR-008)
- `src/lib/dashboard-search.ts` lines 55-61 and 95-114
- `src/components/organisms/DashboardDrawer.tsx` lines 15-21 and 162-221
- `src/components/organisms/HandoutList.astro` lines 12-42
- `src/components/molecules/DrawerTypeFilters.tsx` lines 19-31
- `__tests__/components/organisms/DashboardDrawer.test.tsx` lines 114 and 174

## Progress

> `- [ ]` is pending and `- [x]` is complete. Append a commit SHA when a step lands.

### Phase 1: All status visibility

#### Automated

- [ ] 1.1 `applyDashboardListVisibility` with `data-status-filter="all"` and no `data-search-active` leaves draft, published, and archived lists without `hidden`.
- [ ] 1.2 `applyDashboardListVisibility` with `data-status-filter="published"` and no search still hides draft and archived.
- [ ] 1.3 `applyDashboardSearch` with a query of two or more characters still shows every list when the status is `all`, and clearing that query keeps every list visible.
- [ ] 1.4 Choosing the status All button sets `data-status-filter` to `all`, shows all three lists, and closes the overlay on a narrow viewport.
- [ ] 1.5 Choosing Published after that sets `data-status-filter` to `published` and hides draft and archived.
- [ ] 1.6 The existing type All test still sets `data-type-filter` to `all` and clears `data-type-hidden`.
- [ ] 1.7 `npm test -- --project unit` passes `__tests__/lib/dashboard-search.test.ts` and `__tests__/components/organisms/DashboardDrawer.test.tsx`.
- [ ] 1.8 `npm run lint` passes.

#### Manual

- [ ] 1.9 On `/dashboard`, All shows Drafts, Published, and Archived together. Published then shows only Published.

### Phase 2: Collapsible headings

#### Automated

- [ ] 2.1 With `data-status-filter="all"` and search off, toggling the draft list sets `data-list-collapsed` on that section, `aria-expanded="false"` on its toggle, and `hidden` on its body. The published and archived sections stay without `data-list-collapsed`, and their bodies stay without `hidden`.
- [ ] 2.2 Toggling that draft list again removes `data-list-collapsed` and the body `hidden`, and sets `aria-expanded="true"`.
- [ ] 2.3 `toggleDashboardListCollapse` does nothing when the status is `published` or when `data-search-active` is set.
- [ ] 2.4 `applyDashboardSearch` with an active query removes `data-list-collapsed` and body `hidden` from every list.
- [ ] 2.5 `applyDashboardListVisibility` after setting the status to `published` expands every body and hides the draft and archived sections.
- [ ] 2.6 A drawer click on the Drafts heading, while status All is selected, collapses only the draft body.
- [ ] 2.7 `npm test -- --project unit` passes `__tests__/lib/dashboard-search.test.ts` and `__tests__/components/organisms/DashboardDrawer.test.tsx`.
- [ ] 2.8 `npm run lint` passes.

#### Manual

- [ ] 2.9 With All selected, collapsing Drafts hides draft cards and leaves Published and Archived open. Expanding Drafts shows them again.
- [ ] 2.10 A two-character search shows all three groups expanded. Clearing the search returns to the selected status.
- [ ] 2.11 Choosing Published shows only Published, with its cards visible.
