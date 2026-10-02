<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Drawer type filters

- **Plan**: context/changes/drawer-type-filters/plan.md
- **Scope**: Phase 3 of 3 (full plan, working tree on `feature/S-18-drawer-type-filters`)
- **Date**: 2026-10-02
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 1 observation

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | PASS    |
| Architecture        | PASS    |
| Pattern Consistency | WARNING |
| Success Criteria    | PASS    |

## Findings

### F1: Type-hide selectors fail astro/no-unused-css-selector

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW. Quick decision. Fix is obvious and narrowly scoped.
- **Dimension**: Pattern Consistency
- **Location**: src/components/molecules/HandoutCard.astro:129, src/components/organisms/HandoutList.astro:52
- **Detail**: `npm run lint` exits 0 and still warns. This change added two warnings: `article[data-handout-card][data-type-hidden]` and the type-empty `:has([data-handout-card][data-type-hidden])` rule. The selectors are live. Astro emits them with the component scope class only on elements this file renders, so a script-set `data-type-hidden` still hides the card, and `:has()` still sees the child article. The lint rule only matches attributes and elements written in that file's template. `data-type-hidden` is set from `applyDashboardTypeFilter`. The card article is rendered by `HandoutCard`, not by `HandoutList`.
- **Fix**: Keep both rules. Spell the parts the template does not contain with `:global()`, which is how this rule treats selectors it should not drop. Card: `article[data-handout-card]:global([data-type-hidden])`. List: scope `[data-handout-grid]` and `[data-handout-type-empty]`, and wrap the `:has()` clause in `:global()`. Compiled CSS stays the selectors in the plan. Do not delete the rules and do not turn the lint rule off.
- **Decision**: FIXED

### F2: Older empty-copy selector still warns

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW. Quick decision. Fix is obvious and narrowly scoped.
- **Dimension**: Pattern Consistency
- **Location**: src/components/organisms/HandoutList.astro:44
- **Detail**: `[data-handout-grid]:has(article) + [data-handout-empty]` still warns. That rule was already in the file before this change. The plan says to keep it as written. The article lives in `HandoutCard`, so the template checker cannot see it. Runtime CSS still hides the status empty copy when a card is present.
- **Fix**: Leave the rule as the plan wrote it.
- **Decision**: DEFERRED. The plan freezes this selector, and the warning predates the slice.

## Checks

- `npm test -- --project unit __tests__/lib/dashboard-type-filter.test.ts __tests__/lib/handout-list-type-empty.test.ts __tests__/lib/archive-handout-card-dom.test.ts __tests__/components/organisms/DashboardDrawer.test.tsx`: 4 files, 30 tests, passed.
- `npm test -- --project unit`: 21 files, 136 tests, passed.
- `npm run lint`: exit 0, 27 warnings. The two new type-hide warnings are gone. The remaining `HandoutList.astro` warning is F2. The other warnings are existing `no-console` hits.
- Progress checkboxes were left as they were. The fix does not change which steps were verified.
- Manual 2.5 stays open. Its text says the drawer has no type controls yet, and phase 3 added those controls.
- Phase 3 manual boxes 3.8 through 3.15 match the drawer tests, the copied button classes, the SSR `data-type-filter="all"` attribute, and the untouched `BackgroundPicker`.

## Triage

- Fixed: F1 (1)
- Deferred: F2 (1)
