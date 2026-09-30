# Dashboard Tile Style Plan Brief

> Full plan: `context/changes/dashboard-tile-style/plan.md`
> Roadmap: `context/foundation/roadmap.md` (S-11)

## What & Why

Dashboard tiles grow with the title and the tag list, and the top strip is a category gradient. S-11 gives every tile one height and shows the border-image slice of the same border frame the preview and the shared view already use.

## Starting Point

`HandoutCard.astro` renders a 48px gradient strip from `BACKGROUND_CONFIGS.cssBackground`, a wrapping title, a category label, wrapping tag chips, and a footer. The border PNGs are already on `.handout-article` as `border-image`. Drafts, Published, and Archived all use this card. The card has no fixed height.

## Desired End State

Every dashboard tile is the same height. The strip shows that category's border-image slice. The title is one line with an ellipsis. Tags stay on one row. When they overflow, `+N` opens a dialog that lists every tag. The footer stays on the bottom edge, and archived cards stay read-only.

## Key Decisions Made

| Decision       | Choice                                              | Why                                                                                          | Source |
| -------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ |
| Strip          | Border-image slice, not file row 0                  | Horror rows 0-36 are cream. Top alignment hides the ornament on a wide card.                | Plan   |
| Height         | Fixed height, footer on the bottom edge             | The grid stays even, and Edit, archive, and copy stay reachable.                            | Plan   |
| Title          | One line, then an ellipsis                          | A wrapping title would push the footer. The full string stays on the `title` attribute.     | Plan   |
| Tags           | One row. `+N` opens a dialog of every tag.          | Column width changes with the grid and the drawer, so the count is measured in the browser. | Plan   |
| Tests          | Pure helpers. The card is checked by hand.          | Vitest covers TypeScript modules. This repo does not render Astro templates.                | Plan   |
| Category label | Stays under the title                               | Horror rows 0-36 are a cream margin. The label still names the style.                       | Plan   |

## Scope

**In scope:**

- Strip URL helper for `fantasy`, `horror`, and `scifi`
- Fixed-height `HandoutCard` with a top-cropped strip and a one-line title
- Tag-row island, `fitTagChips`, and a dialog that lists every tag

**Out of scope:**

- Drawer behavior, unarchive, and account deletion
- New image files, schema changes, and API changes
- Gradients on the editor, the share page, and the background picker
- A full `border-image` frame on the dashboard tile
- Astro container tests and screenshot tests

## Architecture / Approach

`getHandoutStripImageUrl` lives beside the category map. The Astro card paints the strip and the fixed column. `HandoutTagRow` is a `client:idle` island, same mounting style as archive and delete. It measures chip widths, calls `fitTagChips`, and opens the existing `Dialog`. The first render shows every chip in a non-wrapping row so hydration matches. The dialog content carries `moon-chrome` because the portal renders outside the dashboard root.

## Phases at a Glance

| Phase              | What it delivers                                      | Key risk                                                          |
| ------------------ | ----------------------------------------------------- | ----------------------------------------------------------------- |
| 1. Strip asset map | Three border URLs locked by a unit test              | A second category map could drift from `BackgroundCategory`       |
| 2. Card frame      | Fixed height, slice strip, one-line title, one tag line | A top-aligned crop shows horror's cream margin on a wide card |
| 3. Tag overflow    | `+N` and a dialog of every tag                       | Deciding `+N` on the first render would mismatch the server HTML  |

**Prerequisites:** S-02 and S-09 are done. The border PNGs are already in `public/borders/`.
**Estimated effort:** one pass across 3 phases.

## Open Risks & Assumptions

- Horror rows 0-36 of `horror-border.png` are cream. The strip must show the 80px border-image slice, checked at phone width and in the three-column grid. The category label stays.
- `+N` gets wider as the hidden count gains a digit. The fit pass decrements until the control fits or no chip remains.
- The drawer width animation changes the row size. One `ResizeObserver` per tagged card covers that. Untagged cards do not mount the island.

## Success Criteria (Summary)

- Tiles in Drafts, Published, and Archived share one height on a phone and on the wide grid.
- Each strip shows that category's border-image slice, and a long title ends in an ellipsis.
- `+N` appears only when the tag row overflows, and the dialog lists every tag on that handout.
