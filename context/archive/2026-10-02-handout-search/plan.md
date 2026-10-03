# Handout search implementation plan

## Overview

S-17 adds a dashboard search field. After 2 characters, the GM sees matches from title, tags, and type in one view, split into the existing Drafts, Published, and Archived sections. The drawer status choice does not hide a section during that view. The S-18 type choice still narrows all three sections. Under 2 characters, status and type behave as they do today.

## Current state analysis

`/dashboard` loads the signed-in GM's handouts and renders three `HandoutList` sections. The select list is `id, title, tags, status, background_category, share_token, created_at` (`src/pages/dashboard.astro`, lines 23-26). The select omits `markdown_content`. The loaded root is `<div data-dashboard data-status-filter="draft" data-type-filter="all">` (lines 66-70). Published and Archived sections carry the HTML `hidden` attribute. Drafts is visible on first paint.

The header card is a title row plus New handout, Settings, and Sign out (`src/pages/dashboard.astro`, lines 78-116). The card stops after those action buttons. The sign-out control is its own form.

`DashboardDrawer` writes `data-status-filter` and sets the `hidden` attribute on the other `[data-handout-list]` sections (`src/components/organisms/DashboardDrawer.tsx`, lines 161-187). It then calls `applyDashboardTypeFilter`. Type selection stays on `[data-dashboard]` as `data-type-filter`. `applyDashboardTypeFilter` sets or removes `data-type-hidden` on every `[data-handout-card]` and does not read search state (`src/lib/dashboard-type-filter.ts`, lines 30-46).

`HandoutCard` puts the title in `[data-handout-title]`, the stored category in `data-background-category`, and the visible label in a paragraph from `BACKGROUND_CONFIGS` (`src/components/molecules/HandoutCard.astro`, lines 49-87). Labels are High Fantasy, Eldritch, and Grimdark for `fantasy`, `horror`, and `scifi` (`src/lib/backgrounds.ts`, lines 3-18). `HandoutTagRow` renders only the chips that fit. Overflow tags are omitted from the row until the dialog opens (`src/components/molecules/HandoutTagRow.tsx`, lines 14-28). The status badge text is Draft, Published, or Archived. The footer contains Edit and the other actions.

`[data-handout-grid]:has(article)` hides `[data-handout-empty]` whenever any card exists, including a card that is only type-hidden. A separate `[data-handout-type-empty]` sentence covers that case (`src/components/organisms/HandoutList.astro`, lines 20-58). Archive and restore move the same `article` node (`src/lib/archive-handout-card-dom.ts`, lines 138 and 181). Archive removes the `hidden` class from the archived section (lines 153-154). Status visibility uses the `hidden` attribute.

The unit project in `vitest.config.ts` uses `environment: 'node'`. DOM tests need a `// @vitest-environment jsdom` docblock. The React plugin is already registered.

## Desired end state

On `/dashboard`, the header card shows a search field under the title row and the action buttons. The field is empty on load. Drafts is visible. Published and Archived stay hidden. All, or the current type, still filters cards inside the visible section.

A trimmed query shorter than 2 characters leaves that behavior in place. The field may still show the typed character.

At 2 or more trimmed characters, Drafts, Published, and Archived are all on screen. The pressed status button does not change, and it does not hide a section. Cards whose title, any tag, stored category, or type label contains the trimmed query stay eligible. The current type still sets `data-type-hidden` on the other categories. A card is visible only when it has neither `data-type-hidden` nor `data-search-hidden`.

A section with no cards keeps its current sentence, including "Create your first handout" on an empty Drafts section. A section whose cards are all the wrong type keeps "No handouts of this type." A section that has cards of the chosen type, and none of them match the query, shows "No handouts match this search." A query that matches nothing leaves all three sections on screen.

Clearing the field, or deleting it under 2 trimmed characters, removes the search hide marks and shows only the section named by `data-status-filter`. The type filter stays as it was. Reload drops the field text and returns to Drafts and All, because those are the server-rendered defaults.

Verify by signing in, opening `/dashboard`, and walking the Phase 3 manual steps.

### Key discoveries

- Status and type already share `[data-dashboard]`. `applyDashboardTypeFilter` keeps owning `data-type-filter` and `data-type-hidden` (`src/lib/dashboard-type-filter.ts`, lines 30-46). Search uses a different hide attribute.
- The card text includes the status badge and Edit. A text search of the whole article would match those words. Overflow tags are not in the article text (`src/components/molecules/HandoutTagRow.tsx`, lines 17-18).
- The type label on the card is `BACKGROUND_CONFIGS[category].label`. The roadmap word postapo is not stored and is not that label (`src/lib/backgrounds.ts`, lines 3-18).
- Section headings are already Drafts, Published, and Archived (`src/components/organisms/HandoutList.astro`, line 16, with the heading passed from `src/pages/dashboard.astro`, lines 119-121).
- `.moon-chrome [data-slot='input']` already sets `border-radius: 0.5rem` (`src/styles/global.css`, lines 266-273). The dashboard sits inside `.moon-chrome`.
- Lessons that apply here: no abbreviated names, exports at the end of the file, `@/` imports, atomic design, `cn()` in TSX, `class:list` in Astro, and the jsdom docblock for DOM unit tests.

## What we're not doing

- A new API route, a SQL change, a migration, or a second Supabase query. Do not add `markdown_content` to the dashboard select.
- A saved query, `localStorage`, a URL query, or a debounce timer.
- Search of the markdown body, the status badge, or the action labels.
- A `postapo` alias. Horror matches `horror` and Eldritch only.
- Rebuilding type-filter state, or hiding a search miss with `data-type-hidden`, the HTML `hidden` attribute, or the `hidden` class on `[data-handout-card]`.
- Renaming the section headings to Draft, Published, and Archived.
- Edits to `src/lib/dashboard-type-filter.ts`, `src/lib/archive-handout-card-dom.ts`, `src/components/molecules/BackgroundPicker.tsx`, or `src/components/organisms/HandoutEditor.tsx`.
- Edits to `context/foundation/prd.md` or `context/foundation/roadmap.md`.
- A change to `vitest.config.ts`. The React plugin is already there.

## Implementation approach

Keep the server-rendered lists. Add a pure search module that reads fields off each card, sets `data-search-hidden` on misses, and shows every `[data-handout-list]` while the trimmed query has at least 2 characters. When the query is shorter, the same module clears those search marks and puts the `hidden` attribute back from `data-status-filter`.

The search field is a molecule mounted in the header card. It holds the query in React state and calls the module on each input event. `applyStatusFilter` stops owning the list `hidden` loop. It writes `data-status-filter`, then calls the shared list-visibility function, then still calls `applyDashboardTypeFilter`.

Type filtering stays in `applyDashboardTypeFilter`. Search never sets or removes `data-type-hidden`. CSS hides a card that has either attribute.

## Critical implementation details

`data-search-hidden` is the only hide signal for a search miss. Do not put the HTML `hidden` attribute on `[data-handout-card]`. Status sections own that attribute. Archive and restore own the `hidden` class on actions. A card is visible only when neither `data-search-hidden` nor `data-type-hidden` is set. Two CSS rules, one per attribute. Do not require both attributes in one selector.

`applyStatusFilter` must write `data-status-filter` before it calls `applyDashboardListVisibility`. While `data-search-active` is present, that function removes `hidden` from every list in the dashboard and does not put it back. A status click during search still updates the pressed button and still calls `applyDashboardTypeFilter`. It does not clear search attributes. When the query drops under 2 trimmed characters, `applyDashboardSearch` removes `data-search-active` and `data-search-hidden`, then the list function restores `hidden` from `data-status-filter`. An invalid or missing status value restores Drafts.

Do not match `textContent` of the article. Match the title in `[data-handout-title]`, each string in `data-handout-tags`, the raw `data-background-category`, and the `BACKGROUND_CONFIGS` label when that category is `fantasy`, `horror`, or `scifi`. `data-handout-tags` is a JSON array on the article because the chip row drops overflow tags, and because restore replaces the title node. `JSON.parse` failure, a missing attribute, or a non-array leaves the tag list empty. Log the failure with the raw attribute value, then continue. Do not match the raw JSON text. The match is a case-insensitive substring, using `toLowerCase`, against each field on its own. `watch gate` does not match tags `watch` and `gate`. Leading and trailing spaces do not count toward the 2 characters and are not part of the substring. The characters the GM typed stay in the field.

Keep the status empty rule as it is. A search-hidden card is still an `article`, so changing this rule to "visible cards only" would show "No drafts." and the create link:

```css
[data-handout-grid]:has(article) + [data-handout-empty] {
  display: none;
}
```

Keep the type-empty rules as they are. Add `[data-handout-search-empty]` after `[data-handout-type-empty]`. Hide it by default. Show it only when the grid has at least one search-hidden card that is not type-hidden, and has no card that lacks both hide attributes. A section whose every card is type-hidden keeps the type sentence, even when those cards are also search-hidden. A section with no cards keeps the status sentence.

```css
[data-handout-search-empty] {
  display: none;
}

[data-handout-grid]:has([data-handout-card][data-search-hidden]:not([data-type-hidden])):not(:has([data-handout-card]:not([data-type-hidden]):not([data-search-hidden])))
  ~ [data-handout-search-empty] {
  display: block;
}
```

Do not put the HTML `hidden` attribute on `[data-handout-search-empty]`. The author `display` rule has to win.

In the component `<style>` blocks, wrap the parts that are not in that file's template with `:global()`. The card rule is `article[data-handout-card]:global([data-search-hidden])`. The search-empty show rule keeps `[data-handout-grid]` and `[data-handout-search-empty]` scoped and wraps the `:has()` clause in `:global()`, same as the type-empty rule in `HandoutList.astro`. Do not delete these rules, and do not turn `astro/no-unused-css-selector` off. The empty-copy unit fixture inlines the unwrapped selectors, because that fixture is not an Astro component.

`moveHandoutCardToArchivedSection` removes the `hidden` class from the archived section. It does not remove the `hidden` attribute. List visibility in this slice stays on the attribute. Do not switch it to the class, and do not edit the mover. The article node keeps `data-handout-tags`, `data-background-category`, `data-search-hidden`, and `data-type-hidden` when it moves. Restore copies the title text onto a new `[data-handout-title]`.

The query lives in React state that starts as `""`. Do not read a browser-restored DOM value, `localStorage`, or the URL into that state. Give the input no `name`, and set `autoComplete="off"`. A reload server-renders an empty field, Drafts, and All.

## Phase 1: Search match contract

### Overview

Add the pure search module and its unit tests. No search field in this phase.

### Changes required

#### 1. Search module

**File**: `src/lib/dashboard-search.ts`

**Intent**: Give the field and the drawer one definition of the active query, the match rule, the search hide mark, and list visibility while search is on or off.

**Contract**: Export the public names at the end of the file, values first and the interface type second, same as `src/lib/dashboard-type-filter.ts`. Import `BACKGROUND_CONFIGS` from `@/lib/backgrounds`. Import `BackgroundCategory` from `@/types`. No React, no `localStorage`, no network.

- `HandoutSearchFields` is an interface with `title: string`, `tags: string[]`, and `backgroundCategory: string | null`.
- `isDashboardSearchActive(query: string): boolean`. True when `query.trim().length >= 2`.
- `handoutMatchesSearchQuery(fields: HandoutSearchFields, query: string): boolean`. Return false when the query is not active. Otherwise return true when the trimmed query is a case-insensitive substring of the title, of any tag, of `backgroundCategory`, or of `BACKGROUND_CONFIGS[category].label` when `backgroundCategory` is `fantasy`, `horror`, or `scifi`. Compare each field on its own. `postapo` does not match `horror`.
- `applyDashboardListVisibility(dashboard: Element): void`. If the dashboard has `data-search-active`, remove `hidden` from every `[data-handout-list]` inside it. Otherwise read `data-status-filter`. Treat a missing or rejected value as `draft`. Remove `hidden` from the matching list and set `hidden=""` on the other lists inside the dashboard. Do not add or remove the `hidden` class.
- `applyDashboardSearch(dashboard: Element, query: string): void`. When the query is not active, remove `data-search-active` from the dashboard and remove `data-search-hidden` from every `[data-handout-card]` inside it. When it is active, set `data-search-active=""` and, for each card, set `data-search-hidden=""` on a miss and remove it on a hit. Then call `applyDashboardListVisibility`. Never set or remove `data-type-hidden`, `data-type-filter`, or `data-status-filter`.

Read a card's title from `[data-handout-title]` `textContent`, or `""` when that node is missing. Read tags with `JSON.parse` on `data-handout-tags`. On failure, a missing attribute, or a value that is not an array of strings, use `[]` and log a parse failure with the raw value. Ignore entries that are not strings.

#### 2. Unit tests

**File**: `__tests__/lib/dashboard-search.test.ts`

**Intent**: Lock the threshold, the field list, and the DOM update before the field calls them.

**Contract**: The file starts with `// @vitest-environment jsdom`. Cover:

- `isDashboardSearchActive` is false for `""`, `"a"`, `" g"`, and `"  "`, and true for `"ab"`, `"  ab"`, and `"  ga"`.
- A title `Map` matches `ma` and `MAP`. A tag `city watch` matches `watch` and does not match `watch gate` when the other tag is `gate`. Category `horror` matches `horror` and `eld`. Category `scifi` matches `scifi` and `grimdark`. Category `horror` does not match `postapo`. A query shorter than 2 trimmed characters does not match a title that contains that character.
- `applyDashboardSearch` on a dashboard with Drafts visible and Published and Archived hidden. One card per list. The draft card title is `Map`, category `fantasy`, tags `["city watch"]`, and it already has `data-type-hidden`. The other cards do not match `ma`. Put the word `Edit` and the sentence `A dragon sleeps here` in each card, outside `[data-handout-title]`. Query `ma` sets `data-search-active`, leaves the Map card without `data-search-hidden`, sets `data-search-hidden` on the other two, removes `hidden` from all three lists, and leaves `data-type-hidden` on the Map card. Query `dragon`, query `edit`, and query `["` set `data-search-hidden` on the Map card too. Query `  ` removes `data-search-active` and `data-search-hidden`, and restores `hidden` on Published and Archived. With `data-status-filter="published"`, that short query leaves Published visible and hides the other two. With `data-status-filter="nope"`, the short query shows Drafts. A query that matches no card still leaves `data-search-active` set and all three lists visible. `data-type-filter` and `data-status-filter` stay as the fixture set them.

### Success criteria

#### Automated verification:

- `isDashboardSearchActive` is false when the trimmed query has fewer than 2 characters, and true at 2.
- `handoutMatchesSearchQuery` matches the title, one tag, the type label, and the stored category, and rejects `postapo`.
- An active query sets `data-search-active`, sets `data-search-hidden` on misses, ignores Edit and markdown text, shows all three lists, and leaves `data-type-hidden` unchanged.
- A short query removes the search attributes and restores list `hidden` from `data-status-filter`.
- `npm test -- --project unit __tests__/lib/dashboard-search.test.ts` passes.
- `npm run lint` passes.

**Implementation note**: Phase 2 can start when those automated checks pass. There is no manual step in this phase.

---

## Phase 2: Card tags and empty copy

### Overview

Cards expose the full tag list. A search with no visible hit in a section shows its own sentence. The status sentence and the type sentence stay for the cases they already cover.

### Changes required

#### 1. Tags on the card, and the search hide rule

**File**: `src/components/molecules/HandoutCard.astro`

**Intent**: Let search read every tag from the article that archive and restore already move, and hide a search miss without using the type attribute.

**Contract**: On the existing `<article data-handout-card>`, set `data-handout-tags` to `JSON.stringify(handout.tags)`, including `[]`. Leave the strip, title, label, tag row, and actions as they are. Add a scoped rule so `article[data-handout-card][data-search-hidden]` is `display: none`, with `:global()` as in Critical implementation details. Leave the existing `data-type-hidden` rule in place.

#### 2. Search empty copy

**File**: `src/components/organisms/HandoutList.astro`

**Intent**: Tell the GM when this section has cards of the chosen type and none of them match the query.

**Contract**: Keep `[data-handout-empty]` immediately after the grid, including "No drafts." and the create link, "No published handouts.", and "No archived handouts." Keep the `:has(article)` rule and the type-empty rules. After `[data-handout-type-empty]`, render `<p class="text-muted-foreground" data-handout-search-empty>No handouts match this search.</p>` with the two CSS rules in Critical implementation details. The create link stays inside `[data-handout-empty]` only.

#### 3. Empty-copy test

**File**: `__tests__/lib/handout-list-search-empty.test.ts`

**Intent**: Lock the empty cases in jsdom, using the same style text as `HandoutList.astro` and both card hide rules from `HandoutCard.astro`.

**Contract**: The file starts with `// @vitest-environment jsdom`. Inline the unwrapped selectors. Leave `__tests__/lib/handout-list-type-empty.test.ts` on its current fixture.

- A draft grid with no `article` shows `[data-handout-empty]` and hides `[data-handout-type-empty]` and `[data-handout-search-empty]`.
- A grid with one article and neither hide attribute hides all three empty nodes.
- A grid whose every card has `data-search-hidden` and no `data-type-hidden` hides the status sentence and the type sentence, and shows "No handouts match this search." The create link is not visible because it sits inside `[data-handout-empty]`. Assert that on the empty container: `getComputedStyle` display `none`. The link's own computed `display` stays `inline`.
- A grid whose every card has both `data-type-hidden` and `data-search-hidden` shows "No handouts of this type." and hides the search sentence.
- A grid with one type-hidden card and one search-hidden card shows the search sentence and hides the type sentence.

### Success criteria

#### Automated verification:

- The empty-copy fixture shows the status sentence when the grid has no articles.
- The empty-copy fixture shows "No handouts match this search." when every card that is not type-hidden is search-hidden, and does not show the create link.
- The empty-copy fixture shows "No handouts of this type." when every card is type-hidden, including cards that are also search-hidden.
- `npm test -- --project unit __tests__/lib/handout-list-search-empty.test.ts __tests__/lib/handout-list-type-empty.test.ts` passes.
- `npm run lint` passes.

#### Manual verification:

- On `/dashboard`, a handout article has `data-handout-tags` for that handout's tags. The search field is not on the page yet.

**Implementation note**: After the automated checks pass, confirm the manual step before Phase 3.

---

## Phase 3: Search field and status override

### Overview

The header card shows the search field. Typing drives `applyDashboardSearch`. A status click during an active search records the choice and leaves all three sections visible.

### Changes required

#### 1. Search field

**File**: `src/components/molecules/DashboardSearch.tsx`

**Intent**: Put the query in the header and run the match on each input event, without storing it anywhere else.

**Contract**: Named export `DashboardSearch` at the end of the file. No props. Import `Input` from `@/components/atoms/input` and `applyDashboardSearch` from `@/lib/dashboard-search`. Use `cn` only if a `className` merges more than one string.

Hold the query in `useState` with initial value `""`. Do not initialize it from the DOM, `localStorage`, or `location.search`. On each change, store the typed value and, when `[data-dashboard]` is an `HTMLElement`, call `applyDashboardSearch` with that element and the typed value. Do not trim the value stored in state. Do not call `applyDashboardSearch` on mount.

Render a wrapper `div` with `className="mt-4"`. The input uses the `Input` atom, `id="handout-search"`, `type="search"`, `value` from state, `placeholder="Search handouts"`, `aria-label="Search handouts"`, `autoComplete="off"`, and `data-handout-search`. No `name` attribute. No extra radius class. The page is already inside `.moon-chrome`, which styles `[data-slot='input']`.

#### 2. Mount the field

**File**: `src/pages/dashboard.astro`

**Intent**: Show the field on the loaded dashboard only, in the header card, outside the sign-out form.

**Contract**: Import `{ DashboardSearch }` from `@/components/molecules/DashboardSearch`. Inside the loaded-dashboard branch, render `<DashboardSearch client:load />` after the flex row that holds the title and the action buttons, still inside `CardContent`. Leave the Supabase select, the three lists, `data-status-filter`, and `data-type-filter` unchanged. Do not render the field on the unavailable or load-error cards.

#### 3. Status clicks defer to search

**File**: `src/components/organisms/DashboardDrawer.tsx`

**Intent**: A status click during search must not hide the other sections, and a status click with search off must keep today's list behavior.

**Contract**: Import `applyDashboardListVisibility` from `@/lib/dashboard-search`. In `applyStatusFilter`, keep the `data-status-filter` write, the `setStatusFilter` call, the `applyDashboardTypeFilter` call, and the overlay close. Replace the `[data-handout-list]` loop with `applyDashboardListVisibility(dashboard)` after the status attribute is set. Do not change `applyTypeFilter`. Do not clear `data-search-active` or `data-search-hidden`.

#### 4. Field and drawer tests

**File**: `__tests__/components/molecules/DashboardSearch.test.tsx`

**Intent**: Prove the field drives the module and that a short query returns the status lists.

**Contract**: The file starts with `// @vitest-environment jsdom`. Render a `[data-dashboard]` with `data-status-filter="draft"` and `data-type-filter="all"`, a Drafts list that is visible, and Published and Archived lists with the `hidden` attribute. One card in each list, with `[data-handout-title]`, `data-background-category`, and `data-handout-tags`. The draft title is `Map`. The others do not contain `ma`. Mount `DashboardSearch` inside that dashboard. Before typing, Published stays hidden and `data-search-active` is absent. Typing `ma` sets `data-search-active`, leaves the Map card without `data-search-hidden`, sets `data-search-hidden` on the other cards, and removes `hidden` from all three lists. `data-type-filter` stays `all`. `window.location.search` stays empty. Backspacing to `m` removes `data-search-active` and `data-search-hidden`, and restores `hidden` on Published and Archived.

**File**: `__tests__/components/organisms/DashboardDrawer.test.tsx`

**Intent**: Prove a status click during search does not hide lists, without dropping the existing status and type tests.

**Contract**: Add one test. Set `data-search-active` on the fixture dashboard, open the overlay, and choose Published. `data-status-filter` becomes `published`. All three `[data-handout-list]` nodes have no `hidden` attribute. `data-search-active` is still present. Keep the existing tests, including the one that chooses Published with search off and expects Drafts and Archived to be hidden.

### Success criteria

#### Automated verification:

- Typing two characters sets `data-search-active`, marks misses with `data-search-hidden`, and removes `hidden` from all three lists.
- Deleting the query under two characters clears the search attributes and restores the status lists.
- Choosing a status while `data-search-active` is set updates `data-status-filter` and leaves all three lists visible.
- The existing DashboardDrawer status and type tests still pass.
- `npm test -- --project unit` passes.
- `npm run lint` passes.

#### Manual verification:

- The search field is in the header card, under the title and the action buttons, and uses the same input look as the other signed-in fields.
- One character leaves Drafts, Published, or Archived as the drawer last set them, and the type filter still applies.
- Two characters show Drafts, Published, and Archived together. The drawer status button stays pressed, and it does not hide a group.
- The chosen type still hides the other categories in all three groups.
- A query that matches nothing still shows the three headings, with "No handouts match this search." or the existing empty sentence for a group that has no cards.
- Clearing the field restores the status-filtered list and the current type.
- Reload clears the field and returns to Drafts and All.

**Implementation note**: After the automated checks pass, pause for the manual steps before calling this slice done.

---

## Testing strategy

### Unit tests

- Threshold for empty, one character, surrounding spaces, and two characters.
- Title, one tag, a tag that does not contain the whole query, Eldritch, Grimdark, the stored category, and a rejected `postapo` query.
- `applyDashboardSearch` shows all three lists, sets `data-search-hidden` only on misses, ignores Edit and extra body text, and leaves `data-type-hidden` in place.
- A short query restores list `hidden` for `draft`, `published`, and an invalid status value.
- Empty-copy fixture for no cards, a visible card, a search miss, a type miss, and a mix of one type-hidden card and one search-hidden card.
- Field test for typing `ma` and backspacing to `m`.
- Drawer test for a status click while `data-search-active` is set.
- Existing `DashboardDrawer`, `handout-list-type-empty`, and `dashboard-type-filter` tests stay green.

### Integration tests

- No new integration test. This slice does not change Supabase, RLS, or API routes.

### Manual testing steps

1. Sign in and open `/dashboard`. Confirm the search field is under the title and the buttons, Drafts is showing, and the field is empty.
2. Type one character. Confirm the visible section and the type filter stay as they were.
3. Type a second character that matches one handout in another section. Confirm Drafts, Published, and Archived are all on screen, the pressed status button is unchanged, and only matching cards of the chosen type are visible.
4. Choose another type in the drawer. Confirm the other categories stay hidden in all three sections.
5. Type a query that matches nothing. Confirm the three headings stay, and each section shows "No handouts match this search." or its existing empty sentence when it has no cards. Confirm "Create your first handout" appears only on a Drafts section that has no cards at all.
6. Clear the field. Confirm only the section selected in the drawer remains, with the current type still applied.
7. Reload `/dashboard`. Confirm the field is empty, Drafts is showing, and All is the type.

## Performance considerations

The dashboard already renders the GM's own handouts. Each input event walks those cards in the document. There is no debounce and no extra query.

## Migration notes

No migration. Existing rows already store `title`, `tags`, and `background_category`. Reload drops the query because the input state starts empty and the root is rendered with `data-status-filter="draft"` and `data-type-filter="all"`.

## References

- Roadmap S-17, and the S-18 drawer this follows: `context/foundation/roadmap.md`
- S-18 contracts for `data-type-filter` and `data-type-hidden`: `context/changes/drawer-type-filters/plan.md`
- PRD FR-002, FR-005, and FR-006. The new functional requirement stays for a separate PRD edit. Do not edit `context/foundation/prd.md`
- Dashboard select and header: `src/pages/dashboard.astro` lines 23-26 and 78-116
- Status list loop to replace: `src/components/organisms/DashboardDrawer.tsx` lines 161-187
- Type hide rule to leave alone: `src/lib/dashboard-type-filter.ts` lines 30-46
- Empty rules to keep: `src/components/organisms/HandoutList.astro` lines 43-58
- Tag overflow: `src/components/molecules/HandoutTagRow.tsx` lines 14-28
- Category labels: `src/lib/backgrounds.ts` lines 3-18
- Lessons: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append the commit sha when a step lands, using the suffix in `references/progress-format.md`. Do not rename step titles.

### Phase 1: Search match contract

#### Automated

- [x] 1.1 `isDashboardSearchActive` is false when the trimmed query has fewer than 2 characters, and true at 2.
- [x] 1.2 `handoutMatchesSearchQuery` matches the title, one tag, the type label, and the stored category, and rejects `postapo`.
- [x] 1.3 An active query sets `data-search-active`, sets `data-search-hidden` on misses, ignores Edit and markdown text, shows all three lists, and leaves `data-type-hidden` unchanged.
- [x] 1.4 A short query removes the search attributes and restores list `hidden` from `data-status-filter`.
- [x] 1.5 `npm test -- --project unit __tests__/lib/dashboard-search.test.ts` passes.
- [x] 1.6 `npm run lint` passes.

### Phase 2: Card tags and empty copy

#### Automated

- [x] 2.1 The empty-copy fixture shows the status sentence when the grid has no articles.
- [x] 2.2 The empty-copy fixture shows "No handouts match this search." when every card that is not type-hidden is search-hidden, and does not show the create link.
- [x] 2.3 The empty-copy fixture shows "No handouts of this type." when every card is type-hidden, including cards that are also search-hidden.
- [x] 2.4 `npm test -- --project unit __tests__/lib/handout-list-search-empty.test.ts __tests__/lib/handout-list-type-empty.test.ts` passes.
- [x] 2.5 `npm run lint` passes.

#### Manual

- [x] 2.6 On `/dashboard`, a handout article has `data-handout-tags` for that handout's tags. The search field is not on the page yet.

### Phase 3: Search field and status override

#### Automated

- [x] 3.1 Typing two characters sets `data-search-active`, marks misses with `data-search-hidden`, and removes `hidden` from all three lists.
- [x] 3.2 Deleting the query under two characters clears the search attributes and restores the status lists.
- [x] 3.3 Choosing a status while `data-search-active` is set updates `data-status-filter` and leaves all three lists visible.
- [x] 3.4 The existing DashboardDrawer status and type tests still pass.
- [x] 3.5 `npm test -- --project unit` passes.
- [x] 3.6 `npm run lint` passes.

#### Manual

- [x] 3.7 The search field is in the header card, under the title and the action buttons, and uses the same input look as the other signed-in fields.
- [x] 3.8 One character leaves Drafts, Published, or Archived as the drawer last set them, and the type filter still applies.
- [x] 3.9 Two characters show Drafts, Published, and Archived together. The drawer status button stays pressed, and it does not hide a group.
- [x] 3.10 The chosen type still hides the other categories in all three groups.
- [x] 3.11 A query that matches nothing still shows the three headings, with "No handouts match this search." or the existing empty sentence for a group that has no cards.
- [x] 3.12 Clearing the field restores the status-filtered list and the current type.
- [x] 3.13 Reload clears the field and returns to Drafts and All.
