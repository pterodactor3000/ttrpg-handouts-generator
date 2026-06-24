<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Extract Shared handoutInputSchema

- **Plan**: `context/changes/refactor-opportunities/plan.md`
- **Mode**: Deep
- **Date**: 2026-06-24
- **Verdict**: SOUND
- **Findings**: 0 critical, 0 warnings, 1 observation

## Verdicts

| Dimension             | Verdict |
| --------------------- | ------- |
| End-State Alignment   | PASS    |
| Lean Execution        | PASS    |
| Architectural Fitness | PASS    |
| Blind Spots           | PASS    |
| Plan Completeness     | WARNING |

## Grounding

4/5 source paths ✓ (new file `src/lib/handout-schema.ts` expected to not exist yet), integration test path ❌ wrong (fixed during triage); 8/8 symbols ✓ (schema definitions at lines 8-13 in both routes, `z.treeifyError` at index.ts:45 and [id].ts:55, `z.uuid()` at [id].ts:41 and 107, all confirmed); brief↔plan ✓.

## Findings

### F1 — Wrong integration test file path

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: References section + Key Discoveries bullet 3
- **Detail**: Plan referenced `src/pages/api/handouts/__tests__/handout-validation.integration.test.ts` in both Key Discoveries and References. Actual path is `__tests__/integration/handouts/handout-validation.integration.test.ts`. The underlying claim ("no test changes needed") is correct — file exists and covers schema paths. No executable step uses the path directly (success criterion runs `npm test -- --project integration`).
- **Fix**: Update both occurrences to `__tests__/integration/handouts/handout-validation.integration.test.ts`.
- **Decision**: FIXED
