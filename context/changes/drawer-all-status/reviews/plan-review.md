<!-- PLAN-REVIEW-REPORT -->

# Plan Review: All status filter

- **Plan:** `context/changes/drawer-all-status/plan.md`
- **Mode:** Deep
- **Date:** 2026-10-04
- **Grounding:** 5/5 paths verified (`src/lib/dashboard-search.ts`, `src/components/organisms/DashboardDrawer.tsx`, `src/components/organisms/HandoutList.astro`, `src/components/molecules/DrawerTypeFilters.tsx`, `__tests__/components/organisms/DashboardDrawer.test.tsx`). Symbols `applyDashboardListVisibility`, `applyStatusFilter`, `StatusFilter`, and the type All button match the cited lines. Brief and plan agree on scope and decisions.
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

### F1: Visibility cannot tell when All was just chosen

- **Severity:** WARNING
- **Impact:** MEDIUM
- **Dimension:** Plan Completeness
- **Location:** Phase 2 collapse helper contract
- **Detail:** The contract told `applyDashboardListVisibility` to expand bodies when the status becomes `all`. That function only reads the current attribute. Expanding on every `all` pass would undo a collapse the next time visibility runs. The function has no previous status.
- **Fix:** While All is selected and search is off, visibility shows every section and leaves collapse alone. `applyStatusFilter` expands every body before visibility, including when the next status is All. Search still expands every body.
- **Decision:** FIXED

## Triage

- F1: Fixed in `plan.md`. Visibility preserves collapse while All stays selected and search is off. Choosing All expands every body first.
