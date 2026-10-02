<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Dashboard Drawer Navigation

- **Plan**: context/changes/dashboard-drawer-nav/plan.md
- **Scope**: completed phases 1-3
- **Date**: 2026-09-30
- **Verdict**: APPROVED
- **Findings**: 0 critical, 3 warnings, 0 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | WARNING |
| Scope Discipline    | PASS    |
| Safety and Quality  | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | PASS    |
| Success Criteria    | WARNING |

## Findings

### F1: Plan still specifies pin and Filters after 7474098

- **Severity:** WARNING
- **Impact:** MEDIUM
- **Dimension:** Plan Adherence
- **Location:** context/changes/dashboard-drawer-nav/plan.md
- **Detail:** HEAD matches change.md: no pin, wide viewport is a sidebar, narrow viewport is an icon overlay. The written plan still described a Pin button, four isPinned pairs, a localStorage.setItem spy, and a visible Filters label.
- **Fix A:** Rewrite those plan sections and Progress 3.1-3.2 to match change.md and the current tests.
  - Strength: Matches the locked product and commit 7474098.
  - Tradeoff: The original pin contract leaves the written plan.
  - Confidence: HIGH. Code, tests, and change.md already agree.
  - Blind spot: None significant.
- **Fix B:** Restore the Phase 3 pin control and the four-pair helper.
  - Strength: Matches the original Phase 3 contract.
  - Tradeoff: Contradicts the 2026-09-29 product lock in change.md.
  - Confidence: LOW for this change. The later commit removed pin on purpose.
  - Blind spot: Whether stakeholders still want pin.
- **Decision:** FIXED
- **Resolution:** Fix A. Overview, desired end state, presentation helper, Phase 2 trigger, Phase 3, testing steps, Progress 3.1-3.2, and plan-brief.md now describe the wide sidebar with no pin control.

### F2: Closed overlay still covers the grid for 200ms

- **Severity:** WARNING
- **Impact:** LOW
- **Dimension:** Safety and Quality
- **Location:** src/components/organisms/DashboardDrawer.tsx:73
- **Detail:** closeOverlay sets isOverlayShown to false and keeps isOverlayMounted true for PANEL_MOTION_MS. The backdrop stayed fixed inset-0 z-40 with no pointer-events-none on data-state=closed. A tap right after choosing a status could hit the scrim instead of a card.
- **Fix:** Add data-[state=closed]:pointer-events-none on the backdrop and overlay panel.
- **Decision:** FIXED
- **Resolution:** The backdrop and overlay panel use data-[state=closed]:pointer-events-none. Reduced motion still unmounts immediately.

### F3: Empty copy uses :empty, which text nodes can defeat

- **Severity:** WARNING
- **Impact:** MEDIUM
- **Dimension:** Success Criteria
- **Location:** src/components/organisms/HandoutList.astro:43
- **Detail:** The empty-copy rule was [data-handout-grid]:not(:empty). The template has newlines inside the grid. :empty is false when whitespace remains, so the empty copy can stay display: none after the last card leaves.
- **Fix:** Change the rule to [data-handout-grid]:has(article) + [data-handout-empty] { display: none; }.
- **Decision:** FIXED
- **Resolution:** The style rule now hides the empty copy only when the grid contains an article. Astro scopes that selector as :has(article) on the grid, so HandoutCard articles still match.
