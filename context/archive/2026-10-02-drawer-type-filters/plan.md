# Drawer type filters implementation plan

## Overview

S-18 adds a handout type filter to the dashboard drawer from S-12. The GM keeps Drafts, Published, or Archived, and can also show one category at a time. All clears the type filter. The choice is an attribute on the dashboard root so S-17 can read it. This slice does not add search.

## Current State Analysis

`/dashboard` loads the signed-in GM's handouts, including `background_category`, and renders three `HandoutList` sections. The root is `<div data-dashboard data-status-filter="draft">` (`src/pages/dashboard.astro`). Published and Archived sections carry the HTML `hidden` attribute. Drafts is visible on first paint.

`DashboardDrawer` (`src/components/organisms/DashboardDrawer.tsx`) writes `data-status-filter` and shows one `[data-handout-list]`. At `min-width: 1024px` the panel is a sidebar portaled into `[data-dashboard-drawer-slot]`. Below that width an icon opens an overlay portaled into `[data-dashboard]`, and choosing a status closes it. There is no pin control. `getDrawerPresentation` in `src/lib/dashboard-drawer.ts` only checks `isWide`.

Categories are `fantasy`, `horror`, and `scifi` (`src/types.ts`). Labels and gradients live in `BACKGROUND_CONFIGS` (`src/lib/backgrounds.ts`): High Fantasy, Eldritch, Grimdark. `BackgroundPicker` (`src/components/molecules/BackgroundPicker.tsx`) renders those three as native buttons, in `BACKGROUND_CATEGORY_OPTIONS` order, inside `flex gap-3`. The roadmap word postapo is this `horror` row. The visible label is Eldritch.

`HandoutCard` prints the label and does not put `background_category` on the article. Empty copy in `HandoutList` is hidden with `[data-handout-grid]:has(article) + [data-handout-empty]`. Archive and restore move that same `article` node (`src/lib/archive-handout-card-dom.ts`). They use the `hidden` class for actions and for the old archived section. Status visibility uses the `hidden` attribute.

## Desired End State

On `/dashboard`, the drawer still opens as it does today. Under the status buttons, a separator, then All, High Fantasy, Eldritch, and Grimdark. All is selected on first paint. Every card in the selected state is visible.

Choosing Grimdark sets `data-type-filter="scifi"` and hides cards of the other categories in all three lists. The selected state list stays the one on screen. Choosing Published afterward still shows only grimdark cards, inside Published. All sets `data-type-filter="all"` and shows every card in the selected state.

A state list with cards, none of the selected type, shows "No handouts of this type." It does not show "No drafts." and it does not show "Create your first handout". A state list with no cards still shows its existing empty copy.

On a narrow viewport, choosing a type or All closes the overlay. At 1024px and up the sidebar stays open. Reload returns to Drafts and All.

The creation and edit category control looks and behaves as it does today.

Verify by signing in, opening `/dashboard` and `/handouts/new`, and walking the Phase 3 manual steps.

### Key Discoveries

- Status already lives on `[data-dashboard]` as `data-status-filter`. `readStatusFilter` and `applyStatusFilter` are the pattern to copy (`src/components/organisms/DashboardDrawer.tsx`, lines 19-34 and 141-165).
- The wide query is `(min-width: 1024px)`, matching `lg:w-64` on the slot (`src/pages/dashboard.astro`, line 69). The overlay panel is `w-64` (line 227 of the drawer).
- Picker classes to copy are the `cn()` pair, the inline `background` / `backgroundSize` / `backgroundPosition`, and the white drop-shadow label (`src/components/molecules/BackgroundPicker.tsx`, lines 20-33).
- `[data-handout-grid]:has(article)` still matches a card that is only marked type-hidden (`src/components/organisms/HandoutList.astro`, lines 42-45). Replacing that selector with "visible cards only" would reveal "No drafts." and the create link.
- Card movers prepend the existing article (`src/lib/archive-handout-card-dom.ts`, lines 138 and 181). Attributes set on the article stay on it after archive or restore.
- Lessons that bind this slice: no abbreviated names, exports at the end of the file, `@/` imports, atomic design, `cn()` in TSX, `class:list` in Astro.

## What We're NOT Doing

- S-17 search: no search field, no grouped results, no query saved across reload, no markdown-body matching.
- A new category, a `postapo` or `grimdark` stored value, or a rename of Eldritch.
- Edits to `src/components/molecules/BackgroundPicker.tsx` or `src/components/organisms/HandoutEditor.tsx`.
- Changes to status-button labels, the 1024px breakpoint, or the overlay close behavior for status.
- A pin control, `localStorage`, or a URL query.
- A schema change, a migration, an API route, or a second Supabase query.
- An edit to `context/foundation/prd.md`. The roadmap already marks the new FR as TBD.
- Reverting the uncommitted S-17 and S-18 edits in `context/foundation/roadmap.md`.

## Implementation Approach

Keep the SSR list. Status continues to show one `[data-handout-list]` with the HTML `hidden` attribute. Type is a second attribute, `data-type-filter`, on the same dashboard root. A pure helper reads it and sets `data-type-hidden` on cards in every list. CSS hides those cards. The drawer renders one filter stack into both the sidebar portal and the overlay portal.

The type buttons are a molecule. The organism owns the separator and the status buttons. The editor picker stays on its own markup, with the same classes copied into the molecule. The panel is 16rem wide, so the copied buttons stack at full width. `flex-1` stays on the editor row only.

## Critical Implementation Details

`data-type-hidden` is the only hide signal for type. Do not put the HTML `hidden` attribute on `[data-handout-card]`. Status sections own that attribute. Archive and restore own the `hidden` class on actions. S-17 must hide a search miss with a different attribute, then treat a card as visible only when neither attribute is set.

`applyDashboardTypeFilter` runs against every card inside `[data-dashboard]`, including cards in lists that are currently `hidden`. `applyStatusFilter` calls it after it swaps lists. A status change leaves `data-type-filter` as it is.

The card `display: none` rule belongs in `HandoutCard.astro`, on the `article` that component renders. A scoped rule in `HandoutList.astro` does not match that child article. The empty-copy rules stay in `HandoutList.astro`, because those nodes are in that template. `:has([data-handout-card])` from the list still sees the child article.

Keep this empty rule as it is:

```css
[data-handout-grid]:has(article) + [data-handout-empty] {
  display: none;
}
```

Add a separate `[data-handout-type-empty]` node after `[data-handout-empty]`. Hide it by default. Show it only when the grid contains at least one `[data-handout-card][data-type-hidden]` and contains no `[data-handout-card]` without `data-type-hidden`:

```css
[data-handout-type-empty] {
  display: none;
}

[data-handout-grid]:has([data-handout-card][data-type-hidden]):not(:has([data-handout-card]:not([data-type-hidden])))
  ~ [data-handout-type-empty] {
  display: block;
}
```

Do not put the HTML `hidden` attribute on `[data-handout-type-empty]`. The author `display` rule has to win.

In the component `<style>` blocks, wrap the parts that are not in that file's template with `:global()`. The card rule is `article[data-handout-card]:global([data-type-hidden])`. The type-empty show rule keeps `[data-handout-grid]` and `[data-handout-type-empty]` scoped and wraps the `:has()` clause in `:global()`. Astro emits the same selectors as the blocks above. `astro/no-unused-css-selector` then matches the template-owned part. Do not delete these rules, and do not turn that lint rule off. The empty-copy unit fixture still inlines the unwrapped selectors, because that fixture is not an Astro component.

Clicking the already selected type does not clear it. Only All clears it. On a narrow overlay, that click still closes the panel, same as a status click.

## Phase 1: Type filter contract

### Overview

Add the pure type-filter module and its unit tests. No drawer UI in this phase.

### Changes Required

#### 1. Filter module

**File**: `src/lib/dashboard-type-filter.ts`

**Intent**: Give the drawer and the later search slice one definition of the type filter, the match rule, and the card attribute update.

**Contract**: Export these names at the end of the file. Import `BackgroundCategory` from `@/types`.

- `DashboardTypeFilter` is `'all' | BackgroundCategory`.
- `isDashboardTypeFilter(value: string | null): value is DashboardTypeFilter`. Accept `all`, `fantasy`, `horror`, and `scifi`. Reject every other string, including `postapo`, `grimdark`, `eldritch`, empty string, and `null`.
- `handoutMatchesTypeFilter(category: BackgroundCategory, typeFilter: DashboardTypeFilter): boolean`. `all` matches every category. Any other filter matches only that category.
- `readDashboardTypeFilter(dashboard: Element): DashboardTypeFilter`. Read `data-type-filter`. A missing or rejected value returns `all`.
- `applyDashboardTypeFilter(dashboard: Element): void`. Read the filter from `dashboard`. For each `[data-handout-card]` inside it, read `data-background-category`. Remove `data-type-hidden` when the filter is `all` or the category matches. Set `data-type-hidden=""` otherwise, including when the category attribute is missing or not a `BackgroundCategory`.

No React, no `localStorage`, no network.

#### 2. Unit tests

**File**: `__tests__/lib/dashboard-type-filter.test.ts`

**Intent**: Lock the match rule and the DOM update before the drawer calls them.

**Contract**: The file starts with `// @vitest-environment jsdom`. The unit project in `vitest.config.ts` sets `environment: 'node'`, and a DOM test without that docblock fails before any assertion. Cover `all`, each matching category, a mismatched category, and the rejected strings above. Cover `applyDashboardTypeFilter` with three cards (`fantasy`, `horror`, `scifi`) under `[data-dashboard]`:

- `data-type-filter="scifi"` sets `data-type-hidden` on the fantasy and horror cards and leaves the scifi card without it.
- `data-type-filter="all"` removes `data-type-hidden` from all three.
- A missing attribute, and `data-type-filter="postapo"`, leave all three without `data-type-hidden`.
- A card with no `data-background-category` gets `data-type-hidden` when the filter is `horror`.

### Success Criteria

#### Automated Verification

- `handoutMatchesTypeFilter` returns true for `all` and for a matching category, and false for a different category.
- `isDashboardTypeFilter` accepts `all`, `fantasy`, `horror`, and `scifi`, and rejects `postapo`, `grimdark`, and `eldritch`.
- `applyDashboardTypeFilter` sets and clears `data-type-hidden` from `data-type-filter`, and treats a missing or unknown value as `all`.
- `npm test -- --project unit` passes `__tests__/lib/dashboard-type-filter.test.ts`.
- `npm run lint` passes.

**Implementation Note**: Phase 2 can start when those automated checks pass. There is no manual step in this phase.

---

## Phase 2: Card marker and empty copy

### Overview

Cards expose their category. A type-filtered list that still has cards shows its own empty sentence. The status empty copy stays for a list that has no cards at all.

### Changes Required

#### 1. Category on the card

**File**: `src/components/molecules/HandoutCard.astro`

**Intent**: Let the filter helper read the category from the article that archive and restore already move.

**Contract**: On the existing `<article data-handout-card>`, set `data-background-category` to `handout.background_category`. Add a scoped rule so `article[data-handout-card][data-type-hidden]` is `display: none`. Leave the strip, title, label, and actions as they are.

#### 2. Type empty copy

**File**: `src/components/organisms/HandoutList.astro`

**Intent**: Tell the GM when the selected state has handouts, and none of them are the selected type.

**Contract**: Keep the current `[data-handout-empty]` block, including "No drafts." and the create-handout link, "No published handouts.", and "No archived handouts." Keep the existing `:has(article)` rule that hides that block. After it, render `<p class="text-muted-foreground" data-handout-type-empty>No handouts of this type.</p>` with the two CSS rules in Critical Implementation Details. The create link stays inside `[data-handout-empty]` only.

#### 3. Empty-copy test

**File**: `__tests__/lib/handout-list-type-empty.test.ts`

**Intent**: Lock the three empty cases in jsdom, using the same style text as `HandoutList.astro` and the card hide rule from `HandoutCard.astro`.

**Contract**: The file starts with `// @vitest-environment jsdom`, same as `__tests__/lib/archive-handout-card-dom.test.ts`. The unit project defaults to `node`. Inline those rules in the fixture, the way that archive test inlines the older empty rule.

- A draft grid with no `article` shows `[data-handout-empty]` and hides `[data-handout-type-empty]`.
- A grid with one article and no `data-type-hidden` hides `[data-handout-empty]`. `[data-handout-type-empty]` stays hidden.
- A grid whose every `[data-handout-card]` has `data-type-hidden` hides `[data-handout-empty]` and shows "No handouts of this type." The create-handout link is not visible because it sits inside `[data-handout-empty]`. Assert that on the empty container: `getComputedStyle` display `none`, or a visibility check that includes ancestors. The link's own computed `display` stays `inline`.
- `npm test -- --project unit` still passes `__tests__/lib/archive-handout-card-dom.test.ts`. That file's inline style can stay. Its archived grid has no article, so the older rule still shows the empty node.

### Success Criteria

#### Automated Verification

- The empty-copy fixture shows the status sentence when the grid has no articles.
- The empty-copy fixture shows "No handouts of this type." when every card has `data-type-hidden`, and does not show the create-handout link.
- `npm test -- --project unit` passes `__tests__/lib/handout-list-type-empty.test.ts` and `__tests__/lib/archive-handout-card-dom.test.ts`.
- `npm run lint` passes.

#### Manual Verification

- On `/dashboard`, a handout article has `data-background-category` equal to that handout's category. The drawer does not show type controls yet.

**Implementation Note**: After the automated checks pass, confirm the manual step before Phase 3.

---

## Phase 3: Drawer type controls

### Overview

The drawer shows the separator and the type controls, writes `data-type-filter`, and applies it together with the current status.

### Changes Required

#### 1. Default attribute

**File**: `src/pages/dashboard.astro`

**Intent**: First paint is All, in the same place S-17 will read.

**Contract**: On the loaded dashboard root, add `data-type-filter="all"` beside `data-status-filter="draft"`. Leave the query, the three lists, and the header actions unchanged.

#### 2. Type controls molecule

**File**: `src/components/molecules/DrawerTypeFilters.tsx`

**Intent**: Render All and the three category buttons with the creation-picker look, without editing that picker.

**Contract**: Named export `DrawerTypeFilters` at the end of the file. Props interface `DrawerTypeFiltersProps` with `typeFilter: DashboardTypeFilter` and `onTypeFilterChange: (typeFilter: DashboardTypeFilter) => void`. Import the type from `@/lib/dashboard-type-filter`. Import `BACKGROUND_CATEGORY_OPTIONS`, `BACKGROUND_CONFIGS`, and `cn` from their `@/` modules.

Root element: `role="group"`, `aria-label="Handout type"`, `className="flex flex-col gap-3"`.

All is the first native `<button type="button">`. Label text `All`. `aria-pressed` is true when `typeFilter` is `all`. Classes, via `cn()`:

- Base: `flex w-full cursor-pointer flex-col items-center gap-1 rounded-[0.5rem] border-2 p-3 transition-all`
- Pressed: `border-primary ring-primary ring-offset-background ring-2 ring-offset-2`
- Not pressed: `border-border hover:border-primary/50`
- Label: `text-foreground text-xs font-semibold`

No inline background on All.

Then one native button per `BACKGROUND_CATEGORY_OPTIONS` entry, in that array's order. `aria-pressed` is true when `typeFilter` equals that category. Same base, pressed, and not-pressed classes as All. Inline style matches the picker: `background` from `BACKGROUND_CONFIGS[option].cssBackground`, `backgroundSize: 'cover'`, `backgroundPosition: 'center'`. Label span: `text-xs font-semibold text-white drop-shadow`, text from `BACKGROUND_CONFIGS[option].label`.

`flex-1` is not used here. The editor row keeps it. These buttons use `w-full` because the drawer panel is `w-64`.

Clicking All calls `onTypeFilterChange('all')`. Clicking a category calls `onTypeFilterChange` with that category. Use the shadcn `Button` for status only. These controls stay native buttons so the gradient is not fighting a button variant.

#### 3. Wire the drawer

**File**: `src/components/organisms/DashboardDrawer.tsx`

**Intent**: Show the type group under the status buttons in both panels, and keep the two filters combined.

**Contract**: Read the initial type with `readDashboardTypeFilter` on `[data-dashboard]`, defaulting the same way `readStatusFilter` does when the node is missing. Hold it in state for `aria-pressed`.

Build one filter stack and pass that stack into both the sidebar portal and the overlay portal. Order inside the stack: the existing status buttons, then `<div role="separator" className="border-border my-2 border-t" />`, then `DrawerTypeFilters`.

`applyTypeFilter` sets `data-type-filter` on `[data-dashboard]`, updates state, then calls `applyDashboardTypeFilter` on that element. If the presentation is overlay, call `closeOverlay` after that. `applyStatusFilter` still sets `data-status-filter` and the list `hidden` attributes, then calls `applyDashboardTypeFilter`, then closes the overlay when it already does. It does not change `data-type-filter`.

A click on the selected type still calls `applyTypeFilter` with that same value, so the narrow overlay closes.

#### 4. Drawer tests

**File**: `__tests__/components/organisms/DashboardDrawer.test.tsx`

**Intent**: Prove the combination, the attribute S-17 will read, and the overlay close, without dropping the existing status tests.

**Contract**: Extend `renderDrawerFixture` with one article per category in each list. Each article is `[data-handout-card]` with `data-background-category` set to `fantasy`, `horror`, or `scifi`. Keep the existing three tests passing, including the absence of Pin sidebar and Unpin sidebar.

Add:

- After opening the overlay, the panel contains a `separator`, then buttons named All, High Fantasy, Eldritch, and Grimdark. All is pressed.
- Choosing Grimdark sets `data-type-filter` to `scifi`, sets `data-type-hidden` on fantasy and horror cards, leaves scifi cards without it, and closes the overlay. Assert the close inside `waitFor`, as the Published test does. `closeOverlay` keeps the panel mounted for 200ms (`PANEL_MOTION_MS`) before it unmounts.
- Choosing All sets `data-type-filter` to `all` and removes `data-type-hidden`.
- Choosing Grimdark, then Published, leaves `data-type-filter="scifi"`, shows `[data-handout-list="published"]`, and hides the draft list.
- With `matchMedia` wide, choosing Eldritch leaves the sidebar mounted and sets `data-type-filter` to `horror`.

### Success Criteria

#### Automated Verification

- Choosing Grimdark sets `data-type-filter` to `scifi` and marks the other cards with `data-type-hidden`.
- Choosing All sets `data-type-filter` to `all` and clears `data-type-hidden`.
- A later status choice keeps the current `data-type-filter`.
- A narrow type choice closes the overlay. A wide type choice leaves the sidebar open.
- The existing DashboardDrawer status tests still pass.
- `npm test -- --project unit` passes.
- `npm run lint` passes.

#### Manual Verification

- The separator sits between Drafts / Published / Archived and the type controls.
- All, High Fantasy, Eldritch, and Grimdark use the copied border, radius, and selected ring. The three category buttons use that category's gradient and white label. All has no gradient.
- With Published selected, Grimdark shows only published grimdark cards. Drafts and Archived stay hidden.
- All shows every card in the selected state.
- A state that has cards of other types only shows "No handouts of this type." and does not show "Create your first handout".
- A state with zero handouts still shows its existing empty sentence.
- `/handouts/new` still shows the same three category buttons, in a row, with the same gradients and labels.
- Reload shows Drafts and All.

**Implementation Note**: After the automated checks pass, pause for the manual steps before calling this slice done.

---

## Testing Strategy

### Unit Tests

- Match rule for `all`, each category, and a mismatch.
- Guard rejects `postapo`, `grimdark`, and `eldritch`.
- `applyDashboardTypeFilter` on a three-card fixture, including an unknown attribute and a card with no category.
- Empty-copy fixture for no cards, a visible card, and every card type-hidden.
- Drawer tests for the attribute, the combined status, overlay close, and the wide sidebar.
- Existing `DashboardDrawer` and `archive-handout-card-dom` tests stay green.

### Integration Tests

- No new integration test. This slice does not change Supabase, RLS, or API routes.

### Manual Testing Steps

1. Sign in and open `/dashboard`. Confirm Drafts, the separator, All pressed, and all three category buttons.
2. Select Grimdark. Confirm only grimdark drafts remain, and the sidebar stays open on a wide window.
3. Select Published. Confirm only published grimdark cards, or the type empty sentence if none exist.
4. Select All. Confirm every published card is back.
5. Narrow the window below 1024px, open the overlay, choose Eldritch, and confirm the overlay closes on the filtered list.
6. Open a state with handouts of other types only. Confirm the type empty sentence and the absence of the create link.
7. Open `/handouts/new` and confirm the category row is unchanged.
8. Reload `/dashboard`. Confirm Drafts and All.

## Performance Considerations

The dashboard already renders the GM's own handouts. The type filter walks those cards in the document. No extra query and no virtualization.

## Migration Notes

No migration. Existing rows already store `background_category`. Reload drops the type choice because the root attribute is rendered as `all`.

## References

- Roadmap S-18, and the S-12 drawer this extends: `context/foundation/roadmap.md`
- S-17 handout search, which must read `data-type-filter` and must not be built here
- PRD FR-002 and FR-005. New FR stays TBD. Do not edit `context/foundation/prd.md`
- Linear TEC-39
- Picker look: `src/components/molecules/BackgroundPicker.tsx` lines 12-36
- Category labels: `src/lib/backgrounds.ts` lines 3-21
- Status filter: `src/components/organisms/DashboardDrawer.tsx` lines 141-165
- Empty rule to keep: `src/components/organisms/HandoutList.astro` lines 42-45
- Lessons: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append the commit sha when a step lands, using the suffix in `references/progress-format.md`. Do not rename step titles.

### Phase 1: Type filter contract

#### Automated

- [x] 1.1 `handoutMatchesTypeFilter` returns true for `all` and for a matching category, and false for a different category.
- [x] 1.2 `isDashboardTypeFilter` accepts `all`, `fantasy`, `horror`, and `scifi`, and rejects `postapo`, `grimdark`, and `eldritch`.
- [x] 1.3 `applyDashboardTypeFilter` sets and clears `data-type-hidden` from `data-type-filter`, and treats a missing or unknown value as `all`.
- [x] 1.4 `npm test -- --project unit` passes `__tests__/lib/dashboard-type-filter.test.ts`.
- [x] 1.5 `npm run lint` passes.

### Phase 2: Card marker and empty copy

#### Automated

- [x] 2.1 The empty-copy fixture shows the status sentence when the grid has no articles.
- [x] 2.2 The empty-copy fixture shows "No handouts of this type." when every card has `data-type-hidden`, and does not show the create-handout link.
- [x] 2.3 `npm test -- --project unit` passes `__tests__/lib/handout-list-type-empty.test.ts` and `__tests__/lib/archive-handout-card-dom.test.ts`.
- [x] 2.4 `npm run lint` passes.

#### Manual

- [ ] 2.5 On `/dashboard`, a handout article has `data-background-category` equal to that handout's category. The drawer does not show type controls yet.

### Phase 3: Drawer type controls

#### Automated

- [x] 3.1 Choosing Grimdark sets `data-type-filter` to `scifi` and marks the other cards with `data-type-hidden`.
- [x] 3.2 Choosing All sets `data-type-filter` to `all` and clears `data-type-hidden`.
- [x] 3.3 A later status choice keeps the current `data-type-filter`.
- [x] 3.4 A narrow type choice closes the overlay. A wide type choice leaves the sidebar open.
- [x] 3.5 The existing DashboardDrawer status tests still pass.
- [x] 3.6 `npm test -- --project unit` passes.
- [x] 3.7 `npm run lint` passes.

#### Manual

- [x] 3.8 The separator sits between Drafts / Published / Archived and the type controls.
- [x] 3.9 All, High Fantasy, Eldritch, and Grimdark use the copied border, radius, and selected ring. The three category buttons use that category's gradient and white label. All has no gradient.
- [x] 3.10 With Published selected, Grimdark shows only published grimdark cards. Drafts and Archived stay hidden.
- [x] 3.11 All shows every card in the selected state.
- [x] 3.12 A state that has cards of other types only shows "No handouts of this type." and does not show "Create your first handout".
- [x] 3.13 A state with zero handouts still shows its existing empty sentence.
- [x] 3.14 `/handouts/new` still shows the same three category buttons, in a row, with the same gradients and labels.
- [x] 3.15 Reload shows Drafts and All.
