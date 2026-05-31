<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: First Handout Creation and Sharing

- **Plan**: context/changes/first-handout-creation-and-sharing/plan.md
- **Scope**: Phase 2 of 4
- **Date**: 2026-05-30
- **Verdict**: APPROVED (after triage fixes applied)
- **Findings**: 1 critical  4 warnings  2 observations

## Verdicts

| Dimension | Verdict |
|---|---|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS (after fixes) |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — PUT /api/handouts/[id] missing gm_id ownership filter

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is one line
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/handouts/[id].ts:56
- **Detail**: UPDATE filtered only on id and status='draft'. No .eq('gm_id', user.id). Any authenticated user who knows a UUID could overwrite another GM's handout.
- **Fix**: Added .eq('gm_id', user.id) to the update chain.
- **Decision**: FIXED + ACCEPTED-AS-RULE: "Always Assert Row Ownership at the Application Layer"

### F2 — renderHandoutHtml runs on every keystroke (no memoization)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; one-line fix
- **Dimension**: Safety & Quality
- **Location**: src/components/handout/HandoutEditor.tsx:21
- **Detail**: Full remark→rehype pipeline called on every re-render. Progressive lag at large document sizes.
- **Fix**: Wrapped in useMemo; documented options in docs/PotentialScalability.md.
- **Decision**: FIXED — Option A (useMemo) applied. Options B (debounce) and C (Web Worker) documented.

### F3 — Individual tag strings have no length cap

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; one-line fix
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/handouts/index.ts:11, [id].ts:11
- **Detail**: z.array(z.string()).max(20) allows unbounded tag strings.
- **Fix**: Changed to z.array(z.string().max(50)).max(20) in both routes.
- **Decision**: FIXED

### F4 — Raw Supabase error messages leaked to HTTP clients

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/handouts/index.ts:64, [id].ts:70
- **Detail**: PostgREST errors expose schema internals. Should return generic message.
- **Fix**: Both routes now return 'Failed to save handout' generic message.
- **Decision**: FIXED + ACCEPTED-AS-RULE: "Never Expose Raw Database Error Messages to HTTP Clients"

### F5 — params.id not validated as UUID before DB query

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/handouts/[id].ts:35
- **Detail**: Non-UUID string caused Postgres type-mismatch returning 500 instead of 400.
- **Fix**: Added z.uuid().safeParse(handoutId) — returns 400 if invalid format.
- **Decision**: FIXED

### F6 — title has no minimum length (empty draft title is valid)

- **Severity**: 👀 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/handouts/index.ts:8, [id].ts:8
- **Detail**: z.string().max(300) allows "". Plan explicitly permits empty draft titles; publish-time validates non-empty (Phase 3).
- **Decision**: ACCEPTED — empty draft titles are intentional per plan.

### F7 — /share/:token is already outside /handouts

- **Severity**: 👀 OBSERVATION
- **Impact**: 🏃 LOW — informational
- **Dimension**: Architecture
- **Location**: src/middleware.ts:4
- **Detail**: Safety agent flagged potential conflict. Plan already places share route at /share/[token], outside protected prefix.
- **Fix**: Added clarifying comment to PROTECTED_ROUTES in middleware.ts.
- **Decision**: FIXED
