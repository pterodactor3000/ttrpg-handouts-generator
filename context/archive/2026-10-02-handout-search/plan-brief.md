# Handout search plan brief

> Full plan: `context/changes/handout-search/plan.md`

## What and why

A GM can search their handouts by title, tags, and type. Search runs only after 2 characters. Matches appear in one view, always split into Drafts, Published, and Archived. The drawer state filter does not hide a group while search is active. The chosen type still narrows all three groups.

## Starting point

S-18 already stores the type choice as `data-type-filter` on `[data-dashboard]` and hides other categories with `data-type-hidden`. Status shows one `[data-handout-list]` through the HTML `hidden` attribute. The dashboard already renders title, tags, and category. It does not render the markdown body. The header card has the title and the action buttons, and no search field.

## Desired end state

The header card has a search field under the title and the buttons. Under 2 trimmed characters, Drafts, Published, or Archived and the current type behave as they do today. At 2 or more, all three sections stay on screen, the pressed status button stays put, and only title, tag, and type matches of the chosen type are visible. A miss still shows the three sections. Clearing the field restores the status section. Reload clears the field and returns to Drafts and All.

## Key decisions made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Where search runs | Client filter of cards already on the dashboard | The page already has the GM's handouts. No new API | Roadmap |
| Where the field sits | Full-width row in the header card, under the title and the buttons | That card is the dashboard header. The drawer stays status and type | Plan |
| Active threshold | Trimmed length of 2 or more | Spaces at the ends do not count. The field still shows the typed text | Plan |
| Match fields | Title, each tag in `data-handout-tags`, stored category, and the config label | The chip row drops overflow tags. Article text includes Edit and the status badge | Plan |
| Hide signal | `data-search-hidden` | S-18 owns `data-type-hidden`. A card is visible only with neither attribute | Roadmap |
| Status during search | Keep `data-status-filter`, show all three lists | The drawer choice must not hide a group. Clearing search restores it | Roadmap |
| Type during search | Leave `data-type-filter` and `data-type-hidden` to S-18 | The chosen type still narrows all three groups | Roadmap |
| Empty sections | Status sentence, type sentence, or "No handouts match this search." | A list with no cards keeps its sentence. A text miss must not reveal the create link | Plan |
| Persistence | None. Empty React state, no `name`, no `localStorage`, no URL | The search text does not survive a reload | Roadmap |
| Headings | Keep Drafts, Published, and Archived | Those headings are already on the three sections | Plan |
| Postapo | Not a match alias | The stored value is `horror` and the label is Eldritch | Plan |

## Scope

**In scope:**

- Search field in the dashboard header card
- Match on title, full tag list, stored category, and type label after 2 trimmed characters
- All three sections visible during search, then the status section again when search turns off
- Type filter still applied through `data-type-hidden`
- Search empty sentence, beside the existing status and type sentences

**Out of scope:**

- Markdown-body search, saved queries, server search, SQL, and new handout fields
- A `postapo` alias, renamed headings, and edits to the type-filter module or the archive movers
- Edits to `context/foundation/prd.md` or `context/foundation/roadmap.md`

## Architecture and approach

`src/lib/dashboard-search.ts` reads `data-search-active` and sets `data-search-hidden` on cards inside `[data-dashboard]`. While search is active it removes `hidden` from every list. While search is off it restores that attribute from `data-status-filter`. `DashboardSearch` is the input. `applyStatusFilter` calls the shared list function after it writes the status attribute, then still calls `applyDashboardTypeFilter`. CSS hides either attribute. `data-handout-tags` on the article holds the full tag JSON.

## Phases at a glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Search match contract | Match rule, `data-search-hidden`, list visibility | A short query hides every card, or a hit clears `data-type-hidden` |
| 2. Card tags and empty copy | Tag JSON on the article, search empty sentence | Replacing the `:has(article)` rule shows the create link |
| 3. Search field and status override | Header field, status clicks during search | A status click puts `hidden` back on the other lists |

**Prerequisites:** S-18 is on main. Branch `feature/S-17-handout-search` is checked out.
**Estimated effort:** One session across 3 phases.

## Open risks and assumptions

- Search reads `data-handout-tags` on the article. Archive and restore move that article. Restore replaces the title node and copies its text.
- React state starts empty, so hydration clears a browser-restored field value. The mount path does not copy the DOM value into state.
- A section whose cards are all the wrong type shows "No handouts of this type." during search. The search sentence is for cards of the chosen type that miss the query.
- The input uses the existing `.moon-chrome` input rule for the squared radius. It does not add a second radius class.

## Success criteria summary

- Two trimmed characters show Drafts, Published, and Archived together, narrowed by the current type, matched on title, tags, and type only.
- Under 2 trimmed characters, the drawer status filter and the type filter behave as they do today.
- A query with no matches still shows the three sections. Reload clears the field and returns to Drafts and All.
