<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Access-Control Critical Path — Test Coverage (Phase 1)

- **Plan**: context/changes/testing-access-control-critical-path/plan.md
- **Scope**: Phase 1 of 2
- **Date**: 2026-06-06
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 3 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS ✅ |
| Scope Discipline    | WARNING ⚠️ (1 finding) |
| Safety & Quality    | PASS ✅ |
| Architecture        | PASS ✅ |
| Pattern Consistency | WARNING ⚠️ (1 finding) |
| Success Criteria    | PASS ✅ |

## Findings

### F1 — Unplanned Vitest alias and `astro:middleware` stub

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: vitest.config.ts:7, src/integration/helpers/astro-middleware-stub.ts
- **Detail**: Plan stated new integration suites drop in without config changes (`plan.md:19`). Phase 1 commit `667739d` added `astro-middleware-stub.ts` and a one-line `astro:middleware` alias in `vitest.config.ts`. Both are functionally necessary — `@/middleware` imports `defineMiddleware` from `astro:middleware`, which Vitest/Node cannot resolve natively. The stub is a minimal identity passthrough enabling direct `onRequest(ctx, ctx.next)` invocation as planned.
- **Fix A ⭐ Recommended**: Document in plan as discovered infrastructure (addendum to Phase 1 "Changes Required")
  - Strength: Preserves working implementation; updates source of truth before Phase 2 review.
  - Tradeoff: Plan becomes a slightly moving target.
  - Confidence: HIGH — alias is required for any middleware import in Vitest.
  - Blind spot: None significant.
- **Fix B**: Remove stub and defer middleware tests until Astro test harness exists
  - Strength: Strict scope discipline.
  - Tradeoff: Loses Phase 1 coverage entirely; blocks Risk #1 closure.
  - Confidence: LOW — no simpler alternative exists today.
  - Blind spot: Whether Astro 6 ships a Vitest-native middleware resolver soon.
- **Decision**: FIXED via Fix A — plan addendum documents stub + alias

### F2 — Duplicated `requireEnv` helper with weaker error message

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/integration/middleware/auth-gate.integration.test.ts:16–22
- **Detail**: Local `requireEnv` duplicates the same helper in `test-users.ts` and `handout-ownership.integration.test.ts`, but omits the `.env.test` setup instructions present in `test-users.ts:6–8`. Same pattern exists in sibling suites — not unique to this file, but the new suite continues the drift.
- **Fix**: Extract `requireEnv` to `src/integration/helpers/env.ts` with the fuller message from `test-users.ts` and import it in all integration suites (can be a follow-up; not blocking Phase 2).
- **Decision**: FIXED — extracted to `src/integration/helpers/env.ts`; imported in auth-gate, handout-ownership, test-users, admin-client

### F3 — `createClient` null branch not exercised

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/integration/middleware/auth-gate.integration.test.ts:51–53, src/middleware.ts:16–18
- **Detail**: Mock always returns a Supabase client. Middleware's `createClient(...) === null` branch (missing env vars) silently downgrades to anonymous. Plan explicitly excluded `getUser()` error scenarios; null-client is a related but distinct fail-closed path.
- **Fix**: Optional follow-up — one test where mock returns `null`, assert protected routes still redirect and `locals.user` stays `null`.
- **Decision**: FIXED — added `missing Supabase configuration` describe with protected + public cases

### F4 — `createClient` call signature not asserted

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/integration/middleware/auth-gate.integration.test.ts:56–57
- **Detail**: Tests never assert `createAppSupabaseClient` was called with `(context.request.headers, context.cookies)`. A refactor dropping those args would not be caught despite middleware depending on them.
- **Fix**: Add `expect(createAppSupabaseClient).toHaveBeenCalledWith(context.request.headers, context.cookies)` on one anonymous and one authenticated case.
- **Decision**: FIXED — assertions added to anonymous and authenticated `/dashboard` cases

### F5 — `afterAll` teardown lacks guard against partial `beforeAll` failure

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Reliability
- **Location**: src/integration/middleware/auth-gate.integration.test.ts:46–48
- **Detail**: `afterAll` calls `deleteTestUser(adminClient, testUserId)` unconditionally. If `beforeAll` fails after user creation but before `testUserId` is set, orphan users may remain. Same pattern exists in sibling suites.
- **Fix**: Guard with `if (testUserId)` or wrap in try/catch — align across all integration suites in a dedicated cleanup pass.
- **Decision**: FIXED — `afterAll` guarded with `if (testUserId)` in auth-gate suite

## Success Criteria Verification

### Automated (Phase 1)

| Check | Command | Result |
| ----- | ------- | ------ |
| 1.1 Auth-gate + all integration tests | `npm test -- --project integration` | ✅ PASS — 3 files, 30 tests |
| 1.2 Phase 1 regression | (same run) | ✅ PASS |
| 1.3 Lint clean | `npm run lint` | ✅ PASS — 0 errors (5 pre-existing `no-console` warnings in API/share routes) |

### Manual (Phase 1)

| Check | Evidence | Result |
| ----- | -------- | ------ |
| 1.4 Test file under `src/integration/middleware/` | File exists; picked up by integration project `include` | ✅ Verified |
| 1.5 Real `User` shape in `locals.user` | Lines 131–132, 142–143, 160–161 assert `id` and `email` against live `testUserId`/`testUserEmail` | ✅ Verified |
