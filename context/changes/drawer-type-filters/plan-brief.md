# Drawer type filters plan brief

> Full plan: `context/changes/drawer-type-filters/plan.md`

## What & Why

A GM can filter the dashboard from the left drawer by one handout type at a time, or choose All. The type combines with Drafts, Published, or Archived. S-17 search will read this same choice later. This slice does not build search.

## Starting Point

S-12 already shows one status at a time. `data-status-filter` on `[data-dashboard]` hides the other lists. The drawer is a sidebar at 1024px and an overlay below that. Handouts already have `background_category` (`fantasy`, `horror`, `scifi`), labeled High Fantasy, Eldritch, and Grimdark on the creation picker.

## Desired End State

The drawer shows a separator under the status buttons, then All and the three category buttons. All is the default. Grimdark, High Fantasy, or Eldritch hides the other categories inside the selected state. All shows every card in that state. Reload returns to Drafts and All. The creation picker is unchanged.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Where the type lives | `data-type-filter` on `[data-dashboard]` | Same place as status, so S-17 can read it without the drawer state | Plan |
| Stored values | `all`, `fantasy`, `horror`, `scifi` | Those are the categories already on the row | Roadmap, code |
| Postapo | The `horror` category, label Eldritch | The product word maps to that row. The label stays Eldritch | Plan |
| Look | Native buttons, picker classes, stacked `w-full` | The panel is `w-64`. A horizontal `flex-1` row does not fit | Plan |
| All | First type control, same border and ring, no gradient | It clears the type filter and is not a fourth category | Roadmap |
| Combination | Status hides lists. Type sets `data-type-hidden` on cards | The filters stay independent, including on hidden lists | Plan |
| Empty copy | Keep the status empty rule. Add "No handouts of this type." | Ignoring hidden cards in the old `:has(article)` rule would show "No drafts." and the create link | Plan |
| Persistence | None. Reload is Drafts and All | Status already resets on reload | Plan |
| Overlay | A type choice closes the narrow overlay and leaves the wide sidebar open | Same as a status choice. Breakpoint stays 1024px | Plan |
| Editor | No edits to the category picker or the editor | The control stays as it is. Classes are copied | Roadmap |

## Scope

**In scope:**

- Separator between status buttons and type controls
- All, High Fantasy, Eldritch, Grimdark, one type at a time
- Type combined with the selected state
- `data-type-filter` and `handoutMatchesTypeFilter` for S-17
- Type empty sentence when the state has cards of other types only

**Out of scope:**

- Search field, grouped search results, saved query, markdown-body search
- New categories, or renaming Eldritch
- Edits to `BackgroundPicker.tsx` or `HandoutEditor.tsx`
- Schema, API, pin, `localStorage`, URL query
- PRD edit, and any revert of the uncommitted roadmap edits

## Architecture / Approach

`src/lib/dashboard-type-filter.ts` reads `data-type-filter` and sets `data-type-hidden` on every `[data-handout-card]` inside the dashboard. `HandoutCard` hides that attribute with CSS. `HandoutList` keeps the current status empty rule and adds a second sentence. `DrawerTypeFilters` is the button group. `DashboardDrawer` renders it under a separator in both portals and calls the helper after a type change and after a status change.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Type filter contract | Match rule and `data-type-hidden` updates | A rejected value such as `postapo` is treated as `all`, so every card stays visible |
| 2. Card marker and empty copy | Category on the article, type empty sentence | Replacing the `:has(article)` rule shows the create link |
| 3. Drawer type controls | Separator, buttons, combined filters | Card `hidden` would fight the status lists |

**Prerequisites:** S-12 is done. Branch `feature/S-18-drawer-type-filters` is checked out.
**Estimated effort:** One session across 3 phases.

## Open Risks & Assumptions

- The editor picker is not edited, so a later class change there will not update the drawer. This slice copies the class string instead.
- S-17 must read `data-type-filter` and must hide search misses with an attribute other than `data-type-hidden`.
- Archive and restore move the article node, so `data-background-category` and `data-type-hidden` stay on the card. The movers do not need a type-filter call.
- The card hide rule has to live on `HandoutCard`. A scoped style in `HandoutList` does not match that child article.

## Success Criteria (Summary)

- The drawer filters by one type inside the selected state, and All clears that filter.
- A state with no cards of that type shows "No handouts of this type." A state with no cards at all keeps its current empty copy.
- Reload is Drafts and All, and `/handouts/new` still shows the same category row.
