<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: First Handout Creation and Sharing

- **Plan**: context/changes/first-handout-creation-and-sharing/plan.md
- **Scope**: Phase 3 of 4
- **Date**: 2026-05-31
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 2 observations

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

### F1 — ShareDialog lacks accessible modal semantics

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/handout/ShareDialog.tsx:40-77
- **Detail**: Custom overlay has no `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape-to-close, or focus trap. Screen readers and keyboard users get a weaker experience than shadcn/Radix dialogs elsewhere in the stack.
- **Fix A ⭐ Recommended**: Replace with shadcn `<Dialog>` (`npx shadcn@latest add dialog`) — Radix handles ARIA, Escape, and focus in one change.
  - Strength: Matches project shadcn convention; fixes all three gaps at once.
  - Tradeoff: Slightly larger diff than inline ARIA patches.
  - Confidence: HIGH — standard pattern for this repo.
  - Blind spot: None significant.
- **Fix B**: Add ARIA attributes, Escape `useEffect`, and manual focus trap to the existing markup.
  - Strength: Smaller diff; no new dependency.
  - Tradeoff: Easy to get focus trap wrong; duplicates what Dialog already provides.
  - Confidence: MEDIUM.
  - Blind spot: Focus-trap edge cases on mobile.
- **Decision**: FIXED (Fix A — shadcn Dialog)

### F2 — Share button stays enabled after publish

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/handout/HandoutEditor.tsx:160
- **Detail**: `disabled` checks `handoutId`, `isSaving`, `isPublishing` but not `shareToken`. A second Share click hits publish again; draft filter returns 404 with a misleading error.
- **Fix**: Add `|| !!shareToken` to the Share button `disabled` expression (or hide the button once published).
- **Decision**: FIXED

### F3 — Fetch errors on publish route not logged

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/handouts/[id]/publish.ts:54-58
- **Detail**: UPDATE failures log via `console.error`; SELECT failures return 404 without logging. Infrastructure/DB errors on fetch are invisible in logs (lesson: log raw errors server-side).
- **Fix**: `if (fetchError) console.error('DB error fetching handout for publish:', fetchError);` before the 404 response.
- **Decision**: FIXED

### F4 — `published_at` set in app layer

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/handouts/[id]/publish.ts:75
- **Detail**: `new Date().toISOString()` may skew vs DB `now()` if the column has a default. Not wrong for MVP; optional alignment with migration defaults.
- **Fix**: If migration defaults `published_at`, omit from update payload.
- **Decision**: SKIPPED — migration has no `published_at` default; app-layer timestamp is required.
