<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Filter dashboard handouts from a left drawer

- **Plan:** `context/changes/dashboard-drawer-nav/plan.md`
- **Mode:** Deep
- **Date:** 2026-09-29
- **Grounding:** 9/9 existing paths verified, 5/5 current symbols verified, brief and plan consistent.
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

### F1: The hidden attribute never reaches the list section

- **Severity:** WARNING
- **Impact:** MEDIUM
- **Dimension:** Plan Completeness
- **Location:** Phase 1, "One visible list" and "Per-status empty copy"
- **Detail:** `dashboard.astro` is told to give the published and archived sections the `hidden` attribute. The `<section data-handout-list>` is rendered inside `HandoutList.astro`, and that contract never sets `hidden`. Astro does not copy an undeclared attribute from the parent onto that section. Phase 1 unit tests can pass on a hand-built fixture while the first paint still shows all three lists.
- **Fix:** In the `HandoutList` contract, set the HTML `hidden` attribute on the section when `listKind` is not `draft`.
- **Decision:** FIXED
- **Chosen fix:** `HandoutList` sets the HTML `hidden` attribute on its section when `listKind` is not `draft`.

### F2: The drawer test would run in node

- **Severity:** WARNING
- **Impact:** MEDIUM
- **Dimension:** Blind Spots
- **Location:** Phase 2, `DashboardDrawer.test.tsx`
- **Detail:** The unit project in `vitest.config.ts` uses `environment: 'node'`. Every current DOM component test, including `ArchiveButton.test.tsx`, starts with `// @vitest-environment jsdom`. The new drawer test renders an island and reads `document`, and the plan never sets that environment. `npm test -- --project unit` for that file fails as written.
- **Fix:** Require `// @vitest-environment jsdom` and the `@testing-library/jest-dom/vitest` import on `DashboardDrawer.test.tsx`, matching `ArchiveButton.test.tsx`.
- **Decision:** FIXED
- **Chosen fix:** `DashboardDrawer.test.tsx` starts with `// @vitest-environment jsdom` and `import '@testing-library/jest-dom/vitest'`, matching `ArchiveButton.test.tsx`.

### F3: One overlay pair is missing from the pin test contract

- **Severity:** OBSERVATION
- **Impact:** LOW
- **Dimension:** Plan Completeness
- **Location:** Phase 3, `dashboard-drawer.test.ts`
- **Detail:** Criterion 3.1 says `overlay` for the other three input pairs. The test contract lists pinned+wide, pinned+narrow, and unpinned+wide. It omits `{ isPinned: false, isWide: false }`.
- **Fix:** Add that call and expect `overlay`.
- **Decision:** FIXED
- **Chosen fix:** The Phase 3 test contract expects `overlay` for `{ isPinned: false, isWide: false }`.
