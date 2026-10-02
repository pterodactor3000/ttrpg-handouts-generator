<!-- IMPL-REVIEW-REPORT -->

# Implementation review: Theme switch

- **Change:** theme-switch
- **Scope:** phases 1 and 2
- **Date:** 2026-10-02
- **Grounding:** commits `860614b`, `259878a`, `a70c7c6`, `69ad16c` on `origin/main..HEAD`. Read `plan.md`, `plan-brief.md`, `change.md`, `lessons.md`, `chrome-theme.ts`, `Layout.astro`, `ThemeSwitch.tsx`, `settings.astro`, `global.css`, `chrome-theme.test.ts`, `sonner.tsx`, and both share pages. `npm test -- --project unit __tests__/lib/chrome-theme.test.ts` passed 8/8. After the F1 edit, `npm run lint` exits 0 with warnings only. Manual rows 1.8-1.10 and 2.3-2.6 stay unchecked.
- **Verdict:** APPROVED

## Analysis

`resolveChromeTheme`, the head `is:inline` boot script, html theme selectors, `selectChromeTheme`, and Settings-only `ThemeSwitch` match the contracts.

`--palette-*` and `.handout-article` were not edited. `.moon-chrome` radius rules stay ungated. `--background` on Darkest of Mines is `#09090b`.

Unplanned edits: `sonner.tsx` dropped `next-themes` and follows the chrome store. Share empty states now use `bg-background` / `bg-card`.

`ThemeSwitch` is absent from dashboard, new, edit, landing, auth, share, and account-closed.

## Verdicts

| Dimension | Verdict |
| --- | --- |
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety and Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1: Lint fails on ThemeSwitch prettier

- **Severity:** WARNING
- **Impact:** HIGH
- **Dimension:** Success Criteria
- **Location:** `src/components/molecules/ThemeSwitch.tsx:36`
- **Detail:** Phase 2.2 and `npm run lint` were marked complete at `259878a`. The tree at review time failed lint. Prettier rejected the wrapped `cn()` argument. Unit tests still passed. Manual rows remained pending, not falsely checked.
- **Fix:** Collapse the `className={cn('...')}` call onto one line so `npm run lint` exits 0.
- **Decision:** FIXED. Applied the recommended one-line `cn()` edit. `npm run lint` now exits 0.

## Verdict

APPROVED: contracts match, and lint is green after F1. Manual rows 1.8-1.10 and 2.3-2.6 remain pending.
