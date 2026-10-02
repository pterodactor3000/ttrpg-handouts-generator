<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Dashboard Tile Style

- **Plan:** `context/changes/dashboard-tile-style/plan.md`
- **Mode:** Deep
- **Date:** 2026-09-30
- **Grounding:** 8/8 existing paths verified. New symbols `getHandoutStripImageUrl`, `fitTagChips`, and `HandoutTagRow` are absent, as the plan proposes to add them. Brief and plan agree on phases, scope, and the locked decisions. `contract-surfaces.md` is absent, so that check was skipped.
- **Verdict:** SOUND

## Dimension Verdicts

| Dimension | Verdict |
| --- | --- |
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | PASS |
| Plan Completeness | PASS |

## Findings

### F1: Horror strip crop shows the cream margin

- **Severity:** WARNING
- **Impact:** HIGH
- **Dimension:** End-State Alignment
- **Location:** Critical Implementation Details; Phase 2 manual check; plan-brief Open Risks
- **Detail:** The plan said the horror top edge is a dark band and that `background-position: top center` shows it. Rows 0-36 of `horror-border.png` are cream, about rgb(255, 255, 240). A 48px strip with `background-size: 100% auto` shows source rows 0-49 on a 360px card. Manual step 2 asked for a dark frame edge. That CSS does not produce it.
- **Fix:** Show the border-image slice in the strip, not file row 0. Horror and fantasy use the 80px slice. Scifi uses the 60px slice. State that horror rows 0-36 are cream. Check the strip at phone width and in the three-column grid.
- **Decision:** FIXED
- **Chosen fix:** The strip contract now aligns the 80px fantasy and horror slice, and the 60px scifi slice, onto the 48px strip. Top alignment is recorded as the wrong crop.

### F2: Phase 2 leaves wrapping tags inside a fixed card

- **Severity:** WARNING
- **Impact:** MEDIUM
- **Dimension:** Blind Spots
- **Location:** Phase 2 overview versus Critical Implementation Details
- **Detail:** Phase 2 said tag wrapping stays until Phase 3. The card is a fixed-height column with `overflow-hidden`, and the footer must sit on the bottom edge. The current tag row is `flex-wrap`. Extra rows can push the footer past the clip.
- **Fix:** In Phase 2, limit the tag region to one non-wrapping line with overflow hidden. Phase 3 adds `+N` in that same line. Remove the sentence that wrapping stays unchanged.
- **Decision:** FIXED
- **Chosen fix:** Phase 2 now requires one `flex-nowrap overflow-hidden` tag line. Phase 3 adds `+N` in that line.

### F3: Fit retry says both once and until it fits

- **Severity:** WARNING
- **Impact:** MEDIUM
- **Dimension:** Plan Completeness
- **Location:** Phase 3 tag-row contract and Critical Implementation Details
- **Detail:** The phase said the measure effect repeats once. The critical section said to call `fitTagChips` again with one fewer chip until the control fits or the visible count is 0.
- **Fix:** Say the effect remeasures and decrements the visible count until the control fits or the visible count is 0.
- **Decision:** FIXED
- **Chosen fix:** Both the critical section and the Phase 3 contract now decrement until the control fits or the visible count is 0.

### F4: Empty chip list has no progress check

- **Severity:** WARNING
- **Impact:** LOW
- **Dimension:** Plan Completeness
- **Location:** Phase 3 contract, Testing Strategy, and Progress
- **Detail:** The `fitTagChips` contract and the testing strategy require an empty `chipWidths` result: visible 0, hidden 0, `showOverflow` false. Phase 3 success criteria and Progress items 3.1-3.3 covered fit, overflow, and zero-visible only.
- **Fix:** Add that empty result as an automated success criterion and as Progress item 3.10. Leave 3.1-3.9 numbered as they are.
- **Decision:** FIXED
- **Chosen fix:** The empty result is an automated success criterion and Progress item 3.10. Items 3.1-3.9 kept their numbers.

### F5: Accessible name mixes hidden count and total

- **Severity:** OBSERVATION
- **Impact:** LOW
- **Dimension:** Plan Completeness
- **Location:** Phase 3 tag-row contract
- **Detail:** The contract said the accessible name states the hidden count, and the example was `Show all 6 tags`. The dialog lists every tag, so 6 reads as the total, while `+N` is the hidden count.
- **Fix:** Visible label is `+{hiddenCount}`. Accessible name is `Show all {tags.length} tags`.
- **Decision:** FIXED
- **Chosen fix:** The visible label is `+{hiddenCount}`. The accessible name is `Show all {tags.length} tags`.
