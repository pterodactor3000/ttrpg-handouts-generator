<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Squared UI Containers

- **Plan**: context/changes/square-ui-containers/plan.md
- **Scope**: Phase 4 of 5
- **Date**: 2026-07-19
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | WARNING |
| Safety & Quality    | PASS    |
| Architecture        | PASS    |
| Pattern Consistency | WARNING |
| Success Criteria    | PASS    |

## Findings

### F1 — TagsInput inherits Input w-full

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/molecules/TagsInput.tsx:63
- **Detail**: Original tag field used `min-w-32 flex-1` only. Input atom ships `w-full`. In `flex flex-wrap`, that can force the field onto its own row. Violates the atom-defaults lesson from Phase 3.
- **Fix**: Add `w-auto` to the TagsInput Input className to cancel `w-full`.
- **Decision**: FIXED

### F2 — ShareDialog gains focus ring originals lacked

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/organisms/ShareDialog.tsx:82
- **Detail**: Original read-only URL field had `outline-none` and no focus ring. Call site cancels height/shadow/bg but leaves Input's `focus-visible:ring-[3px]` / `ring-ring/50` / `border-ring`.
- **Fix**: Add `focus-visible:ring-0` and `focus-visible:border-surface` to cancel the new focus chrome.
- **Decision**: FIXED

### F3 — FormField focus border shifts to ring token

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/molecules/FormField.tsx:6-7,52-55
- **Detail**: Original used colored `focus:ring-2` only; no focus border change. Input still applies `focus-visible:border-ring`, so focus border overrides `border-white/20` / `border-red-400/60`.
- **Fix**: In the error ternary, add matching focus borders (`focus-visible:border-white/20` / `focus-visible:border-red-400/60`).
- **Decision**: FIXED

### F4 — Commit bundled non-Phase-4 files

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: commit 248c1ae
- **Detail**: Commit also included lessons.md, favicon.png, template.png delete, and impl-review-phase-3.md. User explicitly chose "stage all" during the phase-end ritual. Not code drift.
- **Fix**: No code change. Prefer narrower phase commits next time.
- **Decision**: FIXED — acknowledged; no code change

### F5 — Textarea field-sizing-content / min-h-16

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/organisms/HandoutEditor.tsx:216-226
- **Detail**: Textarea atom adds `field-sizing-content` and `min-h-16` the raw textarea lacked. With `rows={16}` likely minor; worth cancelling so rows drive height.
- **Fix**: Add `field-sizing-fixed min-h-0` to the HandoutEditor Textarea className.
- **Decision**: FIXED
