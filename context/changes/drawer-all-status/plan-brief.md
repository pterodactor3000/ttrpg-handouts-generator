# All Status Filter Plan Brief

> Full plan: `context/changes/drawer-all-status/plan.md`
> Roadmap item: `context/foundation/roadmap.md` (S-19)

## What and Why

The dashboard drawer can show Drafts, Published, or Archived, one at a time. A GM who wants every handout has to switch states, or type a search. This slice adds All to those state filters so the three groups appear together, each under a heading that collapses only that group.

## Starting Point

`data-status-filter` is `draft`, `published`, or `archived`. `applyDashboardListVisibility` hides the other `[data-handout-list]` sections unless `data-search-active` is set. The type group already has an All button. The state buttons do not.

## Desired End State

A GM can press All in the state filters and see Drafts, Published, and Archived at once. Each heading collapses and expands only its own group. Pressing one state shows only that state, as it does today. Search still shows all three groups and does not leave a group collapsed.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Filter value | `data-status-filter="all"` | Same attribute the drawer and search already share | Roadmap, code |
| Default | Stay on `draft` | One selected state must keep today's first view | Roadmap |
| Button label | `All` inside `Handout status` | Matches the request and stays distinct from the type All | Roadmap, code |
| Collapse | Heading button hides `[data-handout-list-body]` only while All is selected and search is off | The approved acceptance criteria collapse one group at a time | Roadmap |
| Persistence | None | Reload returns to Drafts. Collapse is not stored | Plan |
| Search | Clear collapse and show every list | Search must not hide a group | Roadmap |

## Scope

**In scope:**

- An All control with Drafts, Published, and Archived.
- Showing all three lists when All is selected.
- A heading that collapses and expands one group.
- Keeping single-state filtering and search visibility.

**Out of scope:**

- Changing type All, search matching, or the default Drafts view.
- Saving All or a collapsed group across reload.
- Renaming Grimdark, landing examples, or the version footer.

## Approach

Extend the existing status attribute and `applyDashboardListVisibility`. Add the All button in a status group ahead of the three state buttons. Wrap each list body so a heading button can hide that body without hiding the heading or the other lists.

## Phases at a Glance

| Phase | Deliverable | Key risk |
| --- | --- | --- |
| 1. All status visibility | All shows three lists. One state and search stay as they are | A second button named All can hit the type All tests |
| 2. Collapsible headings | One heading hides only its body while All is on and search is off | Search or a state click can leave a group collapsed |

## Risks and Assumptions

- The type filter still hides cards inside whichever lists are visible.
- Empty copy stays in the collapsible body, so a collapsed empty group shows only its heading.
- Two accessible All buttons are safe when each sits in its own named group.

## Success Criteria

- Choosing All shows Drafts, Published, and Archived, and each heading toggles only that group.
- Choosing Drafts, Published, or Archived shows only that state.
- An active search shows all three groups with every body expanded.
