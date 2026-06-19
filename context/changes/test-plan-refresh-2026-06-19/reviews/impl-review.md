<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Test Plan 2026-06-19 Refresh

- **Plan**: context/changes/test-plan-refresh-2026-06-19/plan.md
- **Scope**: All 3 phases (Guide Reconciliation, RLS + Migration Safety, E2E CI Wiring)
- **Date**: 2026-06-19
- **Verdict**: APPROVED
- **Findings**: 0 critical, 6 warnings, 1 observation

## Verdicts

| Dimension           | Verdict           |
| ------------------- | ----------------- |
| Plan Adherence      | PASS ✅           |
| Scope Discipline    | PASS ✅           |
| Safety & Quality    | PASS ✅           |
| Architecture        | PASS ✅           |
| Pattern Consistency | PASS ✅           |
| Success Criteria    | PASS ✅           |

## Findings

### F1 — GM CRUD uses raw client insert, not POST handler

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: `__tests__/integration/migration/rls-policy-matrix.integration.test.ts:126-137`
- **Detail**: Phase 2 contract says `gmA` creates via `POST /api/handouts` handler. Implementation uses authenticated Supabase client `.insert()` directly. Suite still proves RLS on fresh Supabase, but diverges from written contract.
- **Fix A ⭐ Recommended**: Amend plan Phase 2 contract to document direct authenticated-client CRUD as chosen pattern for Risk #8 matrix testing.
  - Strength: Matches file header intent ("RLS policies are the subject under test"); avoids `vi.mock`.
  - Tradeoff: Plan becomes slightly moving target.
  - Confidence: HIGH — approach is coherent for migration-safety testing.
  - Blind spot: App-layer handler regressions not caught by this suite.
- **Fix B**: Refactor GM CRUD test to call `POST /api/handouts` via route handler with signed-in client (no mock).
  - Strength: Matches original plan contract; exercises app + RLS stack.
  - Tradeoff: More harness code; handler bugs could mask RLS signal.
  - Confidence: MEDIUM — need `makeContext` pattern from §6.2 suites.
  - Blind spot: Handler auth middleware edge cases.
- **Decision**: FIXED (Fix B — POST/PUT handlers via cookie auth, no vi.mock)

### F2 — GM own-row DELETE not covered in RLS matrix

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `__tests__/integration/migration/rls-policy-matrix.integration.test.ts:119-178`
- **Detail**: "GM own-row CRUD" block tests insert + update only. No positive delete for archived handouts (`gm_delete_archived` policy) and no negative test that draft/published rows cannot be deleted. Risk #8 response guidance requires "GM own-row CRUD succeeds."
- **Fix**: Add tests: (a) owner deletes own archived handout → row gone; (b) owner attempts delete on draft → admin read-back shows row unchanged.
- **Decision**: FIXED

### F3 — Cross-owner INSERT denial untested

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `__tests__/integration/migration/rls-policy-matrix.integration.test.ts` (absent)
- **Detail**: Cross-owner block covers SELECT, UPDATE, DELETE but not INSERT with another user's `gm_id`. `gm_insert_own` (`with check (gm_id = auth.uid())`) is a primary widening vector for Risk #8.
- **Fix**: Add test: `otherOwnerClient.from('handouts').insert({ gm_id: ownerUserId, … })` → expect error; admin confirms no row created.
- **Decision**: FIXED

### F4 — Abbreviated variable names (gmA/gmB)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `__tests__/integration/migration/rls-policy-matrix.integration.test.ts:41-44`
- **Detail**: `gmAClient`, `gmBClient`, `gmAUserId`, `gmBUserId` abbreviate role names. `lessons.md` forbids abbreviated names; sibling `handout-ownership.integration.test.ts` uses `ownerUserId`, `otherOwnerUserId`, `ownerAuthenticatedClient`.
- **Fix**: Rename to `ownerUserId` / `otherOwnerUserId` / `ownerAuthenticatedClient` / `otherOwnerAuthenticatedClient`.
- **Decision**: FIXED

### F5 — `npm run test:e2e` fails; Progress 3.1 rubber-stamped

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: `e2e/seed.spec.ts:3-12`
- **Detail**: Automated check 3.1 marked `[x]` but `npm run test:e2e` exits 1 locally: `seed.spec.ts` times out waiting for `+ New handout` (never navigates to `/dashboard`). Line 12 also calls `Date.now()` twice — title mismatch. `player-share-link.spec.ts` (2 tests) passes; seed fails.
- **Fix A ⭐ Recommended**: Fix `seed.spec.ts` — add `page.goto('/dashboard')` before click; capture title in variable for assertion.
  - Strength: Full e2e suite green; 3.1 becomes honest.
  - Tradeoff: Seed test may need further stabilization beyond navigation fix.
  - Confidence: HIGH — failure is clear from error context.
  - Blind spot: Auth/storageState issues on dashboard.
- **Fix B**: Exclude `seed.spec.ts` from default run (`testIgnore` or separate project) and narrow CI to `e2e/player-share-link.spec.ts`.
  - Strength: Immediate green on Risk #2 target.
  - Tradeoff: Seed test stays broken; tech debt.
  - Confidence: HIGH for share-path signal.
  - Blind spot: Seed test purpose unclear.
- **Decision**: FIXED (seed.spec.ts rewritten — API create + dashboard assert; full e2e green)

### F6 — CI e2e runs full suite, not share-path only

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: `.github/workflows/ci.yml:63-65`
- **Detail**: Phase 3 contract targets Risk #2 share SSR path (`player-share-link.spec.ts`). CI runs `npm run test:e2e` (all `e2e/*.spec.ts`). Combined with `continue-on-error: true` and broken `seed.spec.ts`, CI e2e signal is always red/meaningless even when share-path is healthy.
- **Fix**: Change CI step to `npx playwright test e2e/player-share-link.spec.ts` until seed is fixed, or fix seed first (see F5).
- **Decision**: FIXED

### F7 — Unrelated files bundled in implementation commits

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Scope Discipline
- **Location**: commit `c1664ed` (git diff `eed734c^..HEAD`)
- **Detail**: Phase 3 code (`playwright.config.ts`, `ci.yml`, `e2e/auth.setup.ts`) landed in `c1664ed` (`docs(cavecrew): ...`) alongside ~80 unrelated files: `.agents/skills/cave*/**`, `.cursor/**`, `context/archive/**`, `src/styles/global.css`, `playwright-report/`, etc. Blurs change boundary for future reviews.
- **Fix A ⭐ Recommended**: Document in change epilogue that `c1664ed` mixed tooling churn with Phase 3; future commits should isolate change-scoped files.
  - Strength: Preserves work; sets expectation for reviewers.
  - Tradeoff: History stays messy; cannot unbundle without rebase.
  - Confidence: HIGH — git log confirms bundling.
  - Blind spot: Whether any bundled file affects test behavior.
- **Fix B**: Cherry-pick Phase 3 files into a clean follow-up commit on a branch for audit trail.
  - Strength: Clean attribution.
  - Tradeoff: Rewrites history; low value if main already merged.
  - Confidence: LOW — depends on merge state.
  - Blind spot: None significant.
- **Decision**: FIXED (epilogue added to change.md)

### F8 — Anon share-read scenarios duplicate share-token-read suite

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `__tests__/integration/migration/rls-policy-matrix.integration.test.ts:181-267`
- **Detail**: Four anon share-read cases mirror `share-token-read.integration.test.ts`. Matrix omits null `share_token` on published rows (covered in share-token-read). Acceptable for Risk #8 matrix completeness but risks silent drift.
- **Fix**: Add cross-reference comment pointing to `share-token-read.integration.test.ts` for null-token edge case, or add that case here.
- **Decision**: FIXED
