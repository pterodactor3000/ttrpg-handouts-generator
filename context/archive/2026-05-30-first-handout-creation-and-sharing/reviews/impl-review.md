<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: First Handout Creation and Sharing

- **Plan**: context/changes/first-handout-creation-and-sharing/plan.md
- **Scope**: Full plan (Phases 1-4)
- **Date**: 2026-05-31
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Draft create/update routes skip server-side error logging

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — one-line fix per route
- **Dimension**: Pattern Consistency / Safety & Quality
- **Location**: src/pages/api/handouts/index.ts:~63-67 · src/pages/api/handouts/[id].ts:~75-79
- **Detail**: Both return the generic message (lesson #7 satisfied) but never `console.error` the raw DB error, unlike publish.ts. Insert/update failures are invisible in logs.
- **Fix**: Add `console.error('DB error ...:', error)` before the 500 in each route.
- **Decision**: FIXED

### F2 — Publish UPDATE is not an atomic compare-and-set

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — low-likelihood concurrency tradeoff
- **Dimension**: Safety & Quality (Data Safety)
- **Location**: src/pages/api/handouts/[id]/publish.ts:~77-87
- **Detail**: Fetch asserts status='draft' but the UPDATE filters only id+gm_id. Concurrent publishes could each mint a different share_token (last write wins).
- **Fix**: Add `.eq('status', 'draft')` to the UPDATE.
- **Decision**: FIXED

### F3 — not-found.astro is effectively dead code

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW
- **Dimension**: Scope Discipline
- **Location**: src/pages/share/not-found.astro
- **Detail**: [token].astro renders its 404 inline (ESLint-forced adaptation), so /share/not-found is never reached by the share flow. Was a plan deliverable but now redundant.
- **Fix A**: Keep it (valid standalone 404 route).
- **Fix B**: Delete it and rely on inline 404.
- **Decision**: KEPT (Fix A — retained as standalone 404 route)

### F4 — Save button stays enabled after publish

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Reliability
- **Location**: src/components/organisms/HandoutEditor.tsx:~154-164
- **Detail**: Post-publish, Save issues a PUT the server rejects (no draft row) → confusing error. Mirror the Share button `!!shareToken` guard.
- **Fix**: Add `|| !!shareToken` to the Save button disabled expression.
- **Decision**: FIXED (disable Save after publish; edit-after-publish deferred to S-03)

### F5 — Player query filters share_token only, not status

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Security (defense in depth)
- **Location**: src/pages/share/[token].astro:~26-30
- **Detail**: Safe today (token set only at publish + RLS). Adding `.eq('status','published')` is belt-and-suspenders.
- **Fix**: Add `.eq('status', 'published')` to the query.
- **Decision**: FIXED (used `.in('status', ['published','archived'])` to match the `anon_select_shared` RLS policy)

### F6 — Not-found logged as DB error (log noise)

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Reliability
- **Location**: src/pages/share/[token].astro:~32-36
- **Detail**: A legit PGRST116 (no row) is console.error'd as a DB error. Distinguish not-found from real errors.
- **Fix**: Only log when `error.code !== 'PGRST116'`.
- **Decision**: FIXED

### F7 — Editor title hardcoded "New Handout"

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Pattern Consistency
- **Location**: src/components/organisms/HandoutEditor.tsx:101
- **Detail**: Fine for this creation-only slice; will mislead if reused for edit (S-03). Out of scope now.
- **Fix**: Defer to S-03.
- **Decision**: SKIPPED — out of scope for this slice (editor reuse is S-03)
