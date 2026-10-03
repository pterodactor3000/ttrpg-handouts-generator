<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Drawer type filters

- **Plan**: `context/changes/drawer-type-filters/plan.md`
- **Mode**: Deep
- **Date**: 2026-10-02
- **Verdict before fixes**: REVISE
- **Verdict**: SOUND
- **Findings**: 0 critical, 2 warnings, 2 observations

## Verdicts

| Dimension             | Verdict before fixes | Verdict after fixes |
| --------------------- | -------------------- | ------------------- |
| End-State Alignment   | PASS                 | PASS                |
| Lean Execution        | PASS                 | PASS                |
| Architectural Fitness | PASS                 | PASS                |
| Blind Spots           | WARNING              | PASS                |
| Plan Completeness     | WARNING              | PASS                |

## Grounding

9/9 existing paths verified. Four new paths are creates (`src/lib/dashboard-type-filter.ts`, `__tests__/lib/dashboard-type-filter.test.ts`, `src/components/molecules/DrawerTypeFilters.tsx`, `__tests__/lib/handout-list-type-empty.test.ts`). Symbols `BACKGROUND_CONFIGS`, `BACKGROUND_CATEGORY_OPTIONS`, `readStatusFilter`, `applyStatusFilter`, and `getDrawerPresentation` match the cited files. No `docs/reference/contract-surfaces.md`.

Category map checked against `src/lib/backgrounds.ts` and `src/lib/fonts.ts`. `fantasy` is High Fantasy (paper). `horror` is Eldritch (cream newspaper gradient, typewriter font), which is the roadmap word postapo. `scifi` is Grimdark (green CRT). Grimdark sets `data-type-filter="scifi"`. Eldritch sets `horror`. The plan matches the code. Not a finding.

Scoped CSS was compiled with `@astrojs/compiler`. `:has()` stays unscoped and sees child-card attributes. A hide rule written in `HandoutList.astro` does not match the `HandoutCard` article. The plan's split is right. The empty selector shows "No handouts of this type." only when every card is type-hidden, checked in jsdom.

`HandoutCard` is rendered only from `HandoutList.astro`. Archive and restore prepend the same article (`archive-handout-card-dom.ts` lines 138 and 181), so the new attributes ride along. `BackgroundPicker.tsx` and `HandoutEditor.tsx` stay out of the edit list.

Brief and plan disagreed on rejected values. That is F1.

Progress has one `## Progress` block. Phase names match. Each success-criterion bullet has a matching checkbox. Phase bodies use plain bullets. No progress retitle was required.

## Findings

### F1. Brief says a postapo value matches nothing

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW. Quick decision. Fix is obvious and narrowly scoped.
- **Dimension**: Plan Completeness
- **Location**: `plan-brief.md`, Phases at a Glance, phase 1 risk
- **Detail**: The brief said a `postapo` value would match nothing. Phase 1 says `readDashboardTypeFilter` returns `all` for a rejected value, and the unit contract says `data-type-filter="postapo"` leaves all three cards without `data-type-hidden`. Those cards stay visible. `postapo` is not a stored category.
- **Fix**: State that a rejected value such as `postapo` is treated as `all`, so every card stays visible.
- **Decision**: FIXED
- **Chosen fix**: Brief phase 1 risk now says a rejected value such as `postapo` is treated as `all`, so every card stays visible.

### F2. New DOM tests never name the jsdom docblock

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW. Quick decision. Fix is obvious and narrowly scoped.
- **Dimension**: Plan Completeness
- **Location**: Phase 1 unit tests, Phase 2 empty-copy test
- **Detail**: The unit project in `vitest.config.ts` sets `environment: 'node'`. `DashboardDrawer.test.tsx` and `archive-handout-card-dom.test.ts` start with `// @vitest-environment jsdom`. Phase 1 says "jsdom" and Phase 2 points at the archive test's inline CSS, but neither new file is told to start with that docblock. Without it, `document` is undefined and `npm test -- --project unit` fails. Same gap as the S-12 plan review.
- **Fix**: Require `// @vitest-environment jsdom` at the top of both new test files.
- **Decision**: FIXED
- **Chosen fix**: Both new test contracts require `// @vitest-environment jsdom` and name the unit project's `node` environment.

### F3. Overlay close is not immediate

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW. Quick decision. Fix is obvious and narrowly scoped.
- **Dimension**: Blind Spots
- **Location**: Phase 3, drawer tests, Grimdark overlay bullet
- **Detail**: `closeOverlay` marks the panel closed, then unmounts it after `PANEL_MOTION_MS` (200). The Published test waits with `waitFor` until the button is gone. The new Grimdark bullet said the overlay closes and did not name that wait. A synchronous absence check fails while the panel is still mounted.
- **Fix**: Assert the close inside `waitFor`, matching the Published test.
- **Decision**: FIXED
- **Chosen fix**: The Grimdark bullet tells the test to assert the close inside `waitFor` because the panel stays mounted for 200ms.

### F4. The create link's own display stays inline

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW. Quick decision. Fix is obvious and narrowly scoped.
- **Dimension**: Plan Completeness
- **Location**: Phase 2, empty-copy test, all-cards-hidden case
- **Detail**: In jsdom, `getComputedStyle` on the create link stays `inline` when `[data-handout-empty]` is `display: none`. The link is not on screen. The archive test reads computed display on the empty node. A display assertion on the link itself fails.
- **Fix**: Assert visibility on the empty container, not on the link's own computed display.
- **Decision**: FIXED
- **Chosen fix**: The all-hidden bullet says to assert the empty container, and notes that the link's own computed `display` stays `inline`.

## Triage

- Fixed: F1, F2, F3, F4
- Deferred: none
- Verdict after fixes: SOUND
