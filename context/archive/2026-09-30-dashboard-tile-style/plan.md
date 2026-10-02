# Dashboard Tile Style Implementation Plan

## Overview

S-11 makes every dashboard handout tile the same height and replaces the gradient strip with the border-image slice of that handout's border frame. The title is one line. Tags stay on one row, and a `+N` control opens a dialog that lists every tag when the row overflows. This covers FR-002. The GM still sees their handouts, with a stable tile and the same style art used on the preview and the shared view.

## Current State Analysis

`src/pages/dashboard.astro` loads every handout for the signed-in GM and renders three `HandoutList` sections: Drafts, Published, and Archived. All three pass each row to `HandoutCard`.

`HandoutCard` (`src/components/molecules/HandoutCard.astro`) is an `article`. The top strip is a `h-12` div whose inline `background` is `BACKGROUND_CONFIGS[category].cssBackground`, a gradient from `src/lib/backgrounds.ts`. The title uses `break-words` on a link when `share_token` is set, and on an `h3` when it is not. A category label (`High Fantasy`, `Eldritch`, or `Grimdark`) sits under the title. Tags render as wrapping `data-moon-chip` spans when the array is non-empty. The footer holds Edit, Archive, Delete, and copy. Archived cards already hide Edit and Archive and show Delete.

The grid in `HandoutList` is `grid-cols-1`, `sm:grid-cols-2`, and `lg:grid-cols-3`. Cards have no fixed height. A row stretches to the tallest card in that row.

The preview and the shared handout do not use those gradients for the frame. `.handout-article[data-category]` in `src/styles/global.css` applies `border-image` from `public/borders/fantasy-border.png`, `horror-border.png`, and `scifi-border.png`. Those files are frames with a large middle. `cssBackground` is still used by the editor preview, the share page backdrop, and the background picker. Those callers stay on the gradient.

Archive and delete are React islands inside the Astro card (`client:idle`), and both open `Dialog` from `src/components/atoms/dialog.tsx`. There is no Astro render harness in Vitest. Unit tests cover TypeScript modules and React components.

## Desired End State

On Drafts, Published, and Archived, every tile is the same height. The strip shows that category's border-image slice, scaled across the card width, with the middle of the file left out. A long title is one line and ends with an ellipsis. The full title is on the element's `title` attribute. The category label remains. Tags occupy one row under that label. When they fit, there is no `+N` control. When they do not, `+N` is the last control on the row, and activating it opens a small dialog that lists every tag on that handout. The footer sits on the bottom edge of the card. Edit, archive, delete, and copy follow the same status rules as today.

Verify by signing in, opening `/dashboard`, and walking the manual steps in Phases 2 and 3.

### Key Discoveries

- The strip markup and the gradient inline style are `HandoutCard.astro` lines 22-27. The title branches are lines 32-42. The label is line 46. The tag row is lines 47-56. The footer is lines 58-86.
- Category labels and gradients live in `BACKGROUND_CONFIGS` in `src/lib/backgrounds.ts`. The border files are already referenced at `src/styles/global.css` lines 533-556.
- `cssBackground` has three other callers: `HandoutEditor.tsx`, `src/pages/share/[token].astro`, and `BackgroundPicker.tsx`. The strip change must leave those alone.
- `.moon-chrome article:not(.handout-article)` in `global.css` sets the card radius and shadow. The tile is an `article`, so that rule already styles it. Do not change `--radius`.
- Chip color is `.moon-chrome [data-moon-chip]`. A dialog portaled to `document.body` only picks that up when `DialogContent` itself has the `moon-chrome` class, which `DeleteHandoutButton` already does.
- `archive-handout-card-dom.ts` finds the card with `.closest('article')`. The root element stays an `article`.

## What We're NOT Doing

- Drawer behavior, status filters, or pin state from S-12
- Unarchive from S-14, or any new action on archived cards
- Account deletion from S-13
- A new image file, a schema change, or an API change
- Replacing `cssBackground` on the editor, the share page, or the background picker
- Applying `border-image` to the whole dashboard tile
- Removing the category label
- A two-line title, a scrolling card, or a `+N` count with no dialog
- An Astro container test or a screenshot test
- A change to `--radius` or to status-badge colors

## Implementation Approach

Add a pure URL helper next to the existing category map, and point the strip at that URL, aligned to the border-image slice. Give the article one fixed height, pin the footer to the bottom, and clamp the title with `truncate`.

Tag overflow cannot be known on the server. Column width changes at the `sm` and `lg` grid breakpoints, and the dashboard drawer changes the content width. A React island measures the row and calls a pure fit function. The first render shows every chip in a single non-wrapping row with overflow hidden, so server HTML and the first client render match. After layout, the island swaps the tail for `+N` when the function says the row overflows. The dialog is the existing `Dialog` atom and lists every tag, including chips still visible on the card.

## Critical Implementation Details

The article height is a fixed height, shared by every card. A minimum height would let a long tag list grow the card. The column is: strip, then title, category label, and tag row at the top, then the footer on the bottom edge. Leftover space sits between the tag row and the footer. A handout with no tags omits the tag row and keeps that same outer height.

The strip keeps `h-12` and `overflow-hidden`. The article itself stays transparent and unbordered, because `.moon-chrome article` would paint `var(--card)` and a border behind the strip. The block under the strip is the solid `bg-card` tile, with the card border on its sides and bottom only. Set `background-image` to the helper URL and `background-repeat: no-repeat`. A linear gradient from transparent to `var(--card)`, plus an inset shadow in `var(--card)`, covers the bottom of the strip so the art fades into that solid block. Show the same border-image slice the handout frame uses, not file row 0. Fantasy and horror use the 80px slice from `global.css`. Scifi uses the 60px slice. Scale the image so that slice height maps onto the 48px strip, and align the slice to the strip. `background-position: top center` with `background-size: 100% auto` is the wrong crop: `horror-border.png` rows 0-36 are a cream margin, so a wide card paints cream and misses the ornament. `background-size: cover` would center the empty middle of the file and hide the frame.

Check the strip at phone width and in the three-column grid. The category label under the title still names the style.

Both the share link and the draft `h3` use `truncate` and set the native `title` attribute to the full handout title. Remove `break-words` from those two elements so the ellipsis can appear.

The overflow control's width depends on how many digits `+N` has. Measure that control for the candidate hidden count and pass that width into `fitTagChips`. If the control still does not fit, call `fitTagChips` again with one fewer visible chip, and repeat that decrement until the control fits or the visible count is 0. A visible count of 0 still renders `+N`.

Measure in `useLayoutEffect`, then again from a `ResizeObserver` on the row. Disconnect the observer on unmount. Do not decide `+N` during the first render. The server render and the first client render both show every chip in a `flex-nowrap overflow-hidden` row, with no `+N`. The effect updates after that, which avoids a hydration mismatch. The article's fixed height and the row's overflow hidden keep the card from growing during that update.

`DialogContent` is portaled outside the dashboard's `moon-chrome` root. Put `moon-chrome` on `DialogContent`, as `DeleteHandoutButton` does, so chips inside the dialog match the card chips.

## Phase 1: Strip asset map

### Overview

A pure helper maps each background category to the border PNG already used on the handout frame. Vitest locks the three URLs. No card markup changes in this phase.

### Changes Required

#### 1. Strip URL helper

**File**: `src/lib/backgrounds.ts`

**Intent**: Give the dashboard strip one URL per category without a second map that can drift from `BackgroundCategory`.

**Contract**: Export `getHandoutStripImageUrl(category: BackgroundCategory): string` at the end of the file. It returns `/borders/fantasy-border.png`, `/borders/horror-border.png`, or `/borders/scifi-border.png`. Leave `cssBackground` and `BACKGROUND_CATEGORY_OPTIONS` in place.

#### 2. Unit coverage for the three URLs

**File**: `__tests__/lib/backgrounds.test.ts`

**Intent**: Fail the build if a category points at the wrong file or at a gradient.

**Contract**: For each `BackgroundCategory`, assert the helper returns the path above. Assert the three results are distinct. Keep the existing gradient and label tests.

### Success Criteria

#### Automated Verification

- `getHandoutStripImageUrl` returns `/borders/fantasy-border.png`, `/borders/horror-border.png`, and `/borders/scifi-border.png` for those categories.
- `npm test -- --project unit` passes `__tests__/lib/backgrounds.test.ts`.

**Implementation Note**: After the automated checks pass, continue to Phase 2. This phase has no manual check.

---

## Phase 2: Card frame

### Overview

`HandoutCard` uses the strip URL, one fixed height, a one-line title, and a footer on the bottom edge. The tag region is one non-wrapping line with overflow hidden, so wrapped chips cannot push the footer out of the card. Phase 3 adds `+N` in that same line. Drafts, Published, and Archived all use this card.

### Changes Required

#### 1. Fixed card and cropped strip

**File**: `src/components/molecules/HandoutCard.astro`

**Intent**: Make every tile the same height and show the border-image slice instead of the gradient.

**Contract**: The root stays an `article`. It is a fixed-height column with `overflow-hidden`. The strip stays `h-12` and uses `getHandoutStripImageUrl(handout.background_category)` with the slice crop described in Critical Implementation Details. The body is a column that fills the remaining height. The category label stays. When tags exist, the tag region is one `flex-nowrap overflow-hidden` line. It does not use `flex-wrap`. The footer stays the last region and sits on the bottom edge. Edit, Archive, Delete, and copy keep their current status conditions. Cards with and without tags share the same outer height.

#### 2. One-line title

**File**: `src/components/molecules/HandoutCard.astro`

**Intent**: A long title cannot grow the card, and the GM can still read the full string.

**Contract**: The share link and the draft `h3` both use `truncate` and set `title` to `handout.title`. Remove `break-words` from those two elements. The status badge stays on the same row.

### Success Criteria

#### Automated Verification

- `npm run lint` passes.

#### Manual Verification

- Drafts, Published, and Archived cards share one height, including a card with no tags next to a card with tags.
- Fantasy, horror, and grimdark strips each show that category's border-image slice. Horror shows the ornament, not the cream margin at the top of the file. Confirm this at phone width and in the three-column grid.
- A long title is one line, ends with an ellipsis, and exposes the full title through the `title` attribute.
- The footer sits on the bottom edge. Edit, archive, delete, and copy still follow the handout status.
- At a phone width the single column uses that same card height.

**Implementation Note**: After lint passes, pause for the manual checks before Phase 3.

---

## Phase 3: Tag overflow

### Overview

Tags render on one row. When they do not fit, `+N` opens a dialog that lists every tag. A pure function owns the fit math so the test does not measure CSS.

### Changes Required

#### 1. Fit helper

**File**: `src/lib/fit-tag-chips.ts`

**Intent**: Decide how many chips stay on the row once their pixel widths are known.

**Contract**: Export `fitTagChips` at the end of the file. Input is `chipWidths: number[]`, `gap: number`, `containerWidth: number`, and `overflowChipWidth: number`. Output is `visibleCount`, `hiddenCount`, and `showOverflow`.

- An empty `chipWidths` returns visible count 0, hidden count 0, and `showOverflow` false.
- When the chips and the gaps between them fit in `containerWidth`, `showOverflow` is false and every chip is visible.
- Otherwise `showOverflow` is true. `visibleCount` is the largest prefix that fits together with the gaps between those chips, one gap before the overflow control, and `overflowChipWidth`.
- When no prefix fits, `visibleCount` is 0 and `hiddenCount` is `chipWidths.length`.

#### 2. Fit unit tests

**File**: `__tests__/lib/fit-tag-chips.test.ts`

**Intent**: Lock the empty, fits, overflows, and zero-visible cases without a browser.

**Contract**: One test per bullet in the contract above. Use plain numbers. Do not read the DOM.

#### 3. Tag row island

**File**: `src/components/molecules/HandoutTagRow.tsx`

**Intent**: Measure one row and open the existing dialog with every tag.

**Contract**: Named export `HandoutTagRow` at the end of the file. Props are `tags: string[]` and `handoutTitle: string`. Mount it from `HandoutCard.astro` with `client:idle` only when `tags.length > 0`. The first render is `flex-nowrap overflow-hidden` and includes every chip, with no `+N`. The measure effect lives in `src/components/hooks/useFittedTagChips.ts`. It uses `useLayoutEffect` and a `ResizeObserver`, calls `fitTagChips`, and remeasures, decrementing the visible count until the measured `+N` control fits or the visible count is 0. Visible chips keep `data-moon-chip`. `+N` is a `type="button"`. Its visible label is `+{hiddenCount}`. Its accessible name is `Show all {tags.length} tags`. Activating it opens `Dialog`. `DialogContent` has `moon-chrome` and `sm:max-w-md`. The dialog title is `Tags`. The description names the handout. The body lists every tag, wraps, and scrolls inside the dialog when the list is long. Escape and the dialog close control dismiss it. When `showOverflow` is false, `+N` is absent.

### Success Criteria

#### Automated Verification

- `fitTagChips` shows every chip and no overflow control when the chips fit.
- `fitTagChips` reserves room for the overflow control and returns the hidden count when they do not fit.
- `fitTagChips` returns a visible count of 0 and a hidden count of every chip when the overflow control is the only thing that fits.
- `fitTagChips` returns visible count 0, hidden count 0, and `showOverflow` false when `chipWidths` is empty.
- `npm test -- --project unit` passes `__tests__/lib/fit-tag-chips.test.ts` and `__tests__/lib/backgrounds.test.ts`, and `npm run lint` passes.

#### Manual Verification

- A card whose tags fit on one row has no `+N` control.
- A card whose tags do not fit shows `+N`. Activating it opens a dialog that lists every tag on that handout.
- Escape or the dialog close control dismisses the dialog.
- Opening the dashboard drawer, or resizing across the one-column, two-column, and three-column widths, updates `+N` and leaves the card height unchanged.
- A handout with no tags has no tag row and the same card height as a tagged handout.

**Implementation Note**: After the automated checks pass, pause for the manual checks before calling this change done.

---

## Testing Strategy

### Unit Tests

- `getHandoutStripImageUrl` for `fantasy`, `horror`, and `scifi`, including that the three URLs differ.
- `fitTagChips` for an empty list, a row that fits, a row that needs `+N`, and a row where only `+N` fits.
- The zero-width and single-chip boundaries belong in the fit tests. A container of 0 with a positive overflow width yields visible count 0.

### Integration Tests

- None. The slice does not change a route, a query, or RLS.

### Manual Testing Steps

1. Sign in and open `/dashboard`. Compare two cards in the same list, one with many tags and one with none, and confirm the outer heights match.
2. Confirm the fantasy, horror, and grimdark strips show the border-image slice: the torn paper edge, the horror ornament rather than the cream margin, and the green CRT edge. Check phone width and the three-column grid.
3. Use a long title and confirm one line, an ellipsis, and the full string on hover.
4. On a card with many tags, activate `+N` and confirm the dialog lists every tag, including ones still shown on the card. Close it with Escape and with the close control.
5. Resize from phone width to the three-column grid, and open the drawer on a wide window. Confirm `+N` updates and the card height does not change.
6. On Archived, confirm Delete is present and Edit is absent.

## Performance Considerations

Each tagged card owns one `ResizeObserver` on its tag row and disconnects it on unmount. Do not add a window resize listener beside that observer. The drawer width transition already changes the row's size, so the observer covers it. Untagged cards do not mount the island.

## Migration Notes

No data migration. Revert the branch to restore the gradient strip and the wrapping tags. Handout rows, share links, and archive behavior stay as they are.

## References

- Roadmap: `context/foundation/roadmap.md` (S-11)
- PRD: `context/foundation/prd.md` (FR-002)
- `src/components/molecules/HandoutCard.astro`
- `src/lib/backgrounds.ts`
- `src/styles/global.css` (`.handout-article[data-category]` border images, `.moon-chrome article`, `.moon-chrome [data-moon-chip]`)
- `src/components/atoms/dialog.tsx`
- `src/components/atoms/DeleteHandoutButton.tsx` (`moon-chrome` on portaled `DialogContent`)
- `context/foundation/lessons.md` (atomic design, exports at end of file, `@/` imports, `class:list` in Astro, `cn()` in TSX, do not restyle `--radius` as a side effect)

## Progress

> `- [ ]` is pending and `- [x]` is complete. Append a commit SHA when a step lands. Do not rename step titles.

### Phase 1: Strip asset map

#### Automated

- [x] 1.1 `getHandoutStripImageUrl` returns `/borders/fantasy-border.png`, `/borders/horror-border.png`, and `/borders/scifi-border.png` for those categories. ba4fd05
- [x] 1.2 `npm test -- --project unit` passes `__tests__/lib/backgrounds.test.ts`. ba4fd05

### Phase 2: Card frame

#### Automated

- [x] 2.1 `npm run lint` passes. 09b3dca

#### Manual

- [x] 2.2 Drafts, Published, and Archived cards share one height, including a card with no tags next to a card with tags. 09b3dca
- [x] 2.3 Fantasy, horror, and grimdark strips each show that category's border-image slice. Horror shows the ornament, not the cream margin at the top of the file. Confirm this at phone width and in the three-column grid. 09b3dca
- [x] 2.4 A long title is one line, ends with an ellipsis, and exposes the full title through the `title` attribute. 09b3dca
- [x] 2.5 The footer sits on the bottom edge. Edit, archive, delete, and copy still follow the handout status. 09b3dca
- [x] 2.6 At a phone width the single column uses that same card height. 09b3dca

### Phase 3: Tag overflow

#### Automated

- [x] 3.1 `fitTagChips` shows every chip and no overflow control when the chips fit. cd63484
- [x] 3.2 `fitTagChips` reserves room for the overflow control and returns the hidden count when they do not fit. cd63484
- [x] 3.3 `fitTagChips` returns a visible count of 0 and a hidden count of every chip when the overflow control is the only thing that fits. cd63484
- [x] 3.4 `npm test -- --project unit` passes `__tests__/lib/fit-tag-chips.test.ts` and `__tests__/lib/backgrounds.test.ts`, and `npm run lint` passes. cd63484
- [x] 3.10 `fitTagChips` returns visible count 0, hidden count 0, and `showOverflow` false when `chipWidths` is empty. cd63484

#### Manual

- [x] 3.5 A card whose tags fit on one row has no `+N` control. cd63484
- [x] 3.6 A card whose tags do not fit shows `+N`. Activating it opens a dialog that lists every tag on that handout. cd63484
- [x] 3.7 Escape or the dialog close control dismisses the dialog. cd63484
- [x] 3.8 Opening the dashboard drawer, or resizing across the one-column, two-column, and three-column widths, updates `+N` and leaves the card height unchanged. cd63484
- [x] 3.9 A handout with no tags has no tag row and the same card height as a tagged handout. cd63484
