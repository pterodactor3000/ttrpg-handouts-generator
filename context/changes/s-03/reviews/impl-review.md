<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Edit Handout Implementation Plan

- **Plan**: context/changes/s-03/plan.md
- **Scope**: Full plan (Phases 1–4)
- **Date**: 2026-06-21
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 3 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | PASS    |
| Architecture        | PASS    |
| Pattern Consistency | PASS    |
| Success Criteria    | PASS    |

## Automated Verification

| Command | Result |
| ------- | ------ |
| `npm run lint` | PASS (0 errors, 11 pre-existing console warnings) |
| `npm test -- --project unit` | PASS (71/71) |
| `npm test -- --project integration` | PASS (60/60) |

## Manual Verification (Progress)

All Progress manual rows for Phases 1–3 marked `[x]` with commit SHAs. Phase 4 manual items (back-button regression, `/handouts/new` unaffected) confirmed by user; covered by unit suite — no separate Progress rows exist for them.

## Findings

### F1 — Share enabled while form has unsaved edits

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/organisms/HandoutEditor.tsx:248–251, 130–136
- **Detail**: Share button stays enabled when `isDirty`. On published edit, Share opens the existing link dialog without saving first. Share page serves DB content, not in-memory editor state — user can open/copy link while edits are unsaved. Same class of issue exists on create flow (publish without save), but edit mode makes it more likely.
- **Fix**: Disable Share while `isDirty`, or prompt to save before opening ShareDialog.
- **Decision**: FIXED — Share button, view-link button, and handleShare guard disabled when `isDirty`; unit test added.

### F2 — PUT returns 500 for no-row cases; siblings return 404

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/handouts/[id].ts:76–83
- **Detail**: PGRST116 / zero-row PUT returns `500 { error: 'Failed to save handout' }`. Archive and publish routes return `404` for equivalent no-row cases. **Plan-intentional** — Phase 4 integration tests assert 500 for archived and non-owner PUT. Inconsistent with siblings but matches plan contract.
- **Fix**: No action required for s-03; consider 404 alignment in a follow-up if API consistency matters.
- **Decision**: SKIPPED — plan-intentional

### F3 — edit-handout integration suite omits 401 case

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: __tests__/integration/handouts/edit-handout.integration.test.ts
- **Detail**: Archive integration suite includes unauthenticated `401` test; edit-handout suite does not. Coverage exists in `handout-ownership.integration.test.ts` PUT 401 test — not a gap in total coverage, only suite symmetry.
- **Fix**: Add 401 PUT test to edit-handout suite for parity with archive pattern.
- **Decision**: SKIPPED — covered in ownership suite

### F4 — Validation error object may not render as string

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Reliability
- **Location**: src/components/organisms/HandoutEditor.tsx:112–113
- **Detail**: On 400 responses, API returns `z.treeifyError()` object. Code assigns `responseData.error` directly to string state. **Pre-existing** from create flow — not introduced by s-03. Low likelihood in normal edit use (validation rarely fails after initial save).
- **Fix**: Normalize API error to string before `setSaveError`.
- **Decision**: SKIPPED — pre-existing, out of s-03 scope

## Plan Drift Summary

| Planned item | Verdict |
| ------------ | ------- |
| PUT filter `.neq('status', 'archived')` | MATCH |
| `InitialHandout` type | MATCH |
| `HandoutEditor` initialHandout prop + button behavior | MATCH |
| SSR edit page + HandoutCard Edit link | MATCH (query extracted to `load-handout-for-edit.ts`) |
| Unit + integration tests | MATCH |

**Extras (justified):** `load-handout-for-edit.ts`, `archive-handout-card-dom` Edit hide, `eslint.config.js` astro rule, SSR-safe `shareUrl` useMemo, validation test update.

**Scope boundaries:** All six "What We're NOT Doing" items respected.

## Commits Reviewed

`8a5f74f` → `2e981d3` (p1–p4 + epilogue)
