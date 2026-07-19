<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Squared UI Containers

- **Plan**: context/changes/square-ui-containers/plan.md
- **Scope**: Phase 3 of 5
- **Date**: 2026-07-19
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 1 observation

## Verdicts

| Dimension           | Verdict |
| -------------------- | ------- |
| Plan Adherence       | WARNING (1 finding) |
| Scope Discipline     | PASS    |
| Safety & Quality     | PASS    |
| Architecture         | PASS    |
| Pattern Consistency  | PASS (1 observation) |
| Success Criteria     | PASS    |

## Findings

### F1 — `client:load` added to auth Cards, deviating from plan contract

- **Severity**: WARNING
- **Impact**: LOW — already fixed, tested, and confirmed working by the user; only a documentation gap remains
- **Dimension**: Plan Adherence
- **Location**: `src/pages/auth/signin.astro:15`, `src/pages/auth/signup.astro:15`
- **Detail**: Plan Phase 3 contract for auth cards said "Same import/usage pattern as dashboard.astro; no client directive needed." The first implementation attempt followed that literally (`Card` with no directive, `SignInForm`/`SignUpForm` keeping their own `client:load`). Manual testing caught a real defect this contract missed: nesting a `client:load` React organism inside an SSR-only React `Card` throws `ReactSharedInternals.H is null` and the form inputs vanish after hydration, because Astro can't split one JSX composition into two independent hydration roots. The fix moved `client:load` onto `Card` itself and dropped it from the nested forms, which is the correct pattern for this codebase's islands architecture, and was verified working (lint, tests, build, plus the user's live retest) before this commit landed.
- **Fix**: Add a short addendum to the plan (Phase 3's auth section or "Critical Implementation Details") documenting the rule: any SSR-styling wrapper (`Card`) that contains a `client:*` React child must itself carry the `client:*` directive and become the sole hydration root, dropping the directive from nested children. This rule is directly relevant to Phase 4 (`HandoutEditor`, `ShareDialog` inputs are already `client:load` islands), so surfacing it now avoids re-discovering the same bug there.
- **Decision**: FIXED — addendum added to `plan.md` under "## Addenda (from implementation review)"

### F2 — Card's default spacing/shadow required per-call-site overrides not named in the plan

- **Severity**: OBSERVATION
- **Impact**: LOW — cosmetic, already handled correctly everywhere it applies
- **Dimension**: Pattern Consistency
- **Location**: `src/pages/dashboard.astro:44,51,61,91`, `src/pages/share/[token].astro:70`, `src/pages/share/not-found.astro:11`, `src/pages/auth/signin.astro:17`, `src/pages/auth/signup.astro:17`, `src/pages/auth/confirm-email.astro:23`
- **Detail**: shadcn's `Card` ships `gap-6 py-6 shadow-sm` by default. The plan's contract only anticipated merging the existing `border-surface`/`bg-surface`/`backdrop-blur-xl` treatment via `className`, not that Card's own defaults would need cancelling (`gap-0 py-0 shadow-none`) to avoid introducing new visual spacing/shadow that wasn't in the original hand-rolled markup. Every call site in this phase correctly added the three overrides, so there's no live bug, just an omission in the plan's foresight worth noting for Phase 4 (Input/Textarea likely carry similar unstated defaults to check against FormField/HandoutEditor's existing classes).
- **Fix**: No code action needed. Optionally note the "always audit shadcn atom defaults against the classes being replaced" pattern in `context/foundation/lessons.md` if it recurs in Phase 4.
- **Decision**: ACCEPTED-AS-RULE — "Audit shadcn Atom Defaults Before Migrating Onto Them" appended to `context/foundation/lessons.md`

## Evidence

- Commit reviewed: `493ee83` — "feat(square-ui-containers): migrate cards to Card atom (p3)"
- All 7 planned files (`dashboard.astro`, `share/[token].astro`, `share/not-found.astro`, `signin.astro`, `signup.astro`, `confirm-email.astro`, `HandoutCard.astro`) migrated as planned; no unplanned files touched.
- `HandoutCard.astro` correctly used the plan's documented fallback ("keep the existing `<article>` wrapper... apply only the Card-equivalent radius/border treatment") since `Card` has no `asChild`; `data-handout-*` attribute selectors and `.closest('article')` DOM helpers verified unchanged.
- `class` used for plain HTML elements, `className` used for React (`Card`/`CardContent`) props throughout — consistent with the codebase's Astro-vs-React class convention.
- Re-ran automated checks against current HEAD: `npm run lint` (0 errors, 11 pre-existing unrelated warnings), `npm test -- --project unit` (72/72), `npm test -- --project integration` (60/60), `npm run build` passed.
- Manual verification (rows 3.5-3.7) confirmed by the user, including the post-fix retest of signin/signup with no console errors and visible inputs.

No critical or scope-discipline issues. One documented, already-resolved plan deviation (F1) and one low-impact plan-foresight gap (F2), both informational.
