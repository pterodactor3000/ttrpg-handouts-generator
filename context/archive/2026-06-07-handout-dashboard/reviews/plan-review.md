<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Handout Dashboard List View

- **Plan**: context/changes/handout-dashboard/plan.md
- **Mode**: Deep
- **Date**: 2026-06-07
- **Verdict**: REVISE → SOUND (all findings fixed during triage)
- **Findings**: 1 critical, 2 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | WARNING |
| Architectural Fitness | PASS |
| Blind Spots | PASS |
| Plan Completeness | FAIL |

## Grounding

11/11 paths ✓, 3/3 symbols ✓ (`gm_select_own` SELECT-all-own RLS, `unit` vitest project, `format` script), brief↔plan ✓. No sub-agent needed — all referenced code was read directly during this session.

## Findings

### F1 — Phase-block checkboxes break the Progress parser

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1/2/3 — "Success Criteria" blocks
- **Detail**: Success Criteria bullets inside each Phase block were written as `- [ ]` checkboxes. The progress-format contract requires Phase blocks to use plain `- ` bullets and reserves `[ ]`/`[x]` for the single `## Progress` section. `/10x-implement` computes the next step as "the first `- [ ]` line in document order" (references/progress-format.md:58, 10x-implement/SKILL.md:45); since phase blocks precede `## Progress`, the parser would lock onto a phase Success Criteria bullet instead of Progress step 1.1, and `/10x-implement` only mutates `## Progress` — stalling the run.
- **Fix**: Convert every `- [ ]` in the three Phase "Success Criteria" blocks to plain `- ` bullets; leave `## Progress` checkboxes intact.
- **Decision**: FIXED — converted all phase-block Success Criteria to plain bullets across Phases 1–3; first pending `- [ ]` now resolves to Progress step 1.1.

### F2 — Archived section renders a permanently-empty section until S-04

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Lean Execution
- **Location**: Phase 2, change #3 — Archived section on the dashboard
- **Detail**: No row can reach `archived` status until S-04 ships, so an always-rendered "Archived" section with an empty state can never become non-empty via in-app action. Component cost is low (reused HandoutList/HandoutCard); the concern is the user-facing dead empty section. User had chosen during planning to build the section with its own empty state.
- **Fix A ⭐ Recommended**: Render the Archived section only when `archived.length > 0`.
  - Strength: Keeps reused components + partition logic but hides UI users can't populate; S-04 lights it up automatically.
  - Tradeoff: Drops the always-visible archived empty state; one extra conditional.
  - Confidence: HIGH — render guard, no logic change.
  - Blind spot: None significant.
- **Fix B**: Defer the entire Archived section to S-04.
  - Strength: Maximally lean — S-02 ships only FR-002 (draft+published list).
  - Tradeoff: Re-touches dashboard.astro in S-04.
  - Confidence: HIGH — scope removal.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A — Phase 2 guards the section on `archived.length > 0`; updated Desired End State, Phase 2 overview, manual criterion 2.5 + Progress 2.5, and the brief's Open Risks note.

### F3 — `npm run format` success criterion is not a real gate

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Success Criteria 1.3 / 3.4
- **Detail**: The `format` script is `prettier --write .` (package.json:12), which rewrites files and always succeeds — it never reports a clean/dirty verdict, so "reports clean" can't fail as a gate.
- **Fix**: Use `npx prettier --check .` as the automated gate.
- **Decision**: FIXED — criteria 1.3 and 3.4 (phase blocks + Progress) now use `npx prettier --check .`.

### F4 — Supabase select result needs an explicit cast to HandoutListItem[]

- **Severity**: 🔭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1, change #5 — dashboard query
- **Detail**: `partitionHandouts` is typed `(handouts: HandoutListItem[])`, but the untyped Supabase client returns loosely-typed rows (cf. the `as HandoutQueryResult` cast in api/handouts/index.ts:51). The plan should note casting `data` and coalescing null→[] before partitioning so `npm run build` type-checks.
- **Fix**: Add a one-line note: cast `.select()` data to `HandoutListItem[]` and coalesce null to `[]`.
- **Decision**: FIXED — note added to the Phase 1 dashboard query contract.

### F5 — Copy-button test needs the jsdom env docblock

- **Severity**: 🔭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 3, change #3 — CopyLinkButton tests
- **Detail**: The `unit` project runs `environment: 'node'` (vitest.config.ts:24). RTL `render()` needs a DOM, so the test must start with `// @vitest-environment jsdom` and stub `window.location.origin` (as HandoutEditor.test.tsx:1,16-22 does). The plan implied this via "follow the RTL pattern" but didn't spell it out.
- **Fix**: Note the `// @vitest-environment jsdom` docblock + window.location stub explicitly in the test contract.
- **Decision**: FIXED — test contract now spells out the jsdom docblock + window.location stub requirement.

## Triage Summary

- Fixed: F1, F2 (Fix A), F3, F4, F5
- Skipped: —
- Accepted: —
- Dismissed: —
- Verdict after fixes: SOUND
