<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Squared UI Containers

- **Plan**: context/changes/square-ui-containers/plan.md
- **Scope**: Full plan (Phases 1-5)
- **Date**: 2026-07-19
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 2 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | PASS    |
| Success Criteria    | PASS    |

## Findings

### F1 — ShareDialog read-only field has no visible focus indicator

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (Accessibility)
- **Location**: src/components/organisms/ShareDialog.tsx:82
- **Detail**: Phase 4 review triage added `focus-visible:ring-0 focus-visible:border-surface` to cancel the Input atom's default focus ring, matching the pre-migration raw `<input>`'s bare `outline-none`. Re-examined at full-plan level: this leaves the field with zero visible focus indicator when tabbed to. Field is reachable by Tab (no `tabIndex={-1}`) and only cue left is native text-selection highlight from the `onFocus` select-all, which can be low-contrast or absent. Since the field is interactive (focusable, selectable), a visible focus indicator is a real accessibility expectation, not just visual parity with the old markup.
- **Fix**: Replace `focus-visible:ring-0 focus-visible:border-surface` with a minimal visible indicator, e.g. `focus-visible:ring-1 focus-visible:ring-ring/40`.
- **Decision**: FIXED

### F2 — Custom border-surface/bg-surface utilities not tailwind-merge aware

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/molecules/FormField.tsx, src/components/organisms/HandoutEditor.tsx, src/components/organisms/ShareDialog.tsx, src/components/molecules/TagsInput.tsx
- **Detail**: `cn()` (tailwind-merge) doesn't know about the project's custom `border-surface`/`bg-surface` utilities, so it can't dedupe them against the Input/Textarea atom's own `border-input` class. Both end up in the DOM class list; final border color depends on generated CSS rule order, not string order. This interaction didn't exist before Phase 4 (raw inputs had no atom default to compete with). No live defect found (build/lint/tests/manual verification all passed), just a latent fragility worth a glance if border tinting ever looks off after future Tailwind upgrades.
- **Fix**: No action required now. If a visual mismatch surfaces later, resolve via an explicit `border-input` cancellation on the call site.
- **Decision**: FIXED + ACCEPTED-AS-RULE: Custom Utility Classes Aren't tailwind-merge Aware — fixed at the source by registering `border-surface`/`bg-surface`/etc. as `extendTailwindMerge` custom class groups in `src/lib/utils.ts`, so `cn()` now dedupes them against shadcn atom defaults project-wide.

### F3 — Non-card/chip elements still use theme-linked rounded-lg/rounded-md (informational)

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: dashboard.astro, share/*.astro, HandoutEditor.tsx, Welcome.astro, HandoutCard.astro's Edit link (various)
- **Detail**: Buttons/links outside the plan's enumerated card/chip/badge list still carry `rounded-lg`/`rounded-md` classes. None of these were in Phase 1-5's "Changes Required" lists, and all resolve to `0` via Phase 1's token fix, so they render square correctly today. Flagging only so a future `--radius` value change doesn't silently un-square them without a corresponding plan.
- **Fix**: No action required; token-linked, renders correctly today.
- **Decision**: ACCEPTED-AS-RULE: Theme-Linked Radius Classes on Non-Enumerated Elements Are Still a Silent Dependency (no code change, no live defect)

## Automated Verification (re-run at full-plan scope)

- Build succeeds: `npm run build` — PASS
- Lint passes: `npm run lint` — PASS (0 errors, 11 pre-existing `no-console` warnings unrelated to this change)
- Full test suite: `npm test` (unit + integration) — PASS (17 files, 132 tests)
