<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: API + DB Integration Harness & Handout-Route Coverage

- **Plan**: context/changes/testing-api-db-handout-coverage/plan.md
- **Scope**: Full plan (Phases 1–3)
- **Date**: 2026-06-04
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING ⚠️ |
| Scope Discipline | PASS ✅ |
| Safety & Quality | WARNING ⚠️ |
| Architecture | PASS ✅ |
| Pattern Consistency | WARNING ⚠️ |
| Success Criteria | WARNING ⚠️ |

## Findings

### F1 — Phase 2 manual checks still pending

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: context/changes/testing-api-db-handout-coverage/plan.md (Progress §2.3–2.4)
- **Detail**: Automated Phase 2 items are done and committed, but Progress still has `- [ ]` for 2.3 (Studio/SQL confirmation of unchanged title) and 2.4 (regression probe by temporarily removing `.eq('gm_id', user.id)`). The cross-owner PUT test asserts DB state in code, so 2.3 is partially covered; 2.4 was never run per plan’s implementation note.
- **Fix**: Run the two manual steps once, then flip 2.3/2.4 to `[x]` in Progress; or document in the plan that 2.4 is deferred and accept test-only evidence for 2.3.
  - Strength: Aligns Progress with evidence the plan authors expected.
  - Tradeoff: Short manual session vs. leaving rollout “complete” with open manual rows.
  - Confidence: HIGH — rows are explicitly unchecked in Progress.
  - Blind spot: None significant.
- **Decision**: FIXED — user confirmed manual checks; Progress 2.3/2.4 marked complete

### F2 — Integration env loaded via `loadEnv` merge, not isolated `.env.test`

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/integration/setup-env.ts:3
- **Detail**: Plan specified `envFile: '.env.test'` on the integration vitest project. Implementation uses `setupFiles` + `Object.assign(process.env, loadEnv('test', process.cwd(), ''))`, which merges `.env`, `.env.local`, `.env.test`, etc. A missing key in `.env.test` can inherit production-like values from root `.env`, so fixtures may hit the wrong Supabase project.
- **Fix A ⭐ Recommended**: Load only `.env.test` (e.g. `dotenv` with `path: '.env.test'` and `override: true`, or vitest `envFile` if projects support it in this version) and keep `requireEnv` throws in helpers.
  - Strength: Matches plan intent; eliminates silent wrong-project runs.
  - Tradeoff: Small harness change; verify Vitest 4 project `envFile` behavior.
  - Confidence: MED — `envFile` failed in Phase 1 without per-project `sharedConfig`; isolated load is still straightforward.
  - Blind spot: Whether CI will use the same loader in Phase 4.
- **Fix B**: Document in `.env.test.example` that all three keys must be set and root `.env` must not override them; add a startup check that `SUPABASE_URL` contains `127.0.0.1` for integration.
  - Strength: No vitest config churn.
  - Tradeoff: Weaker guarantee if a developer’s root `.env` points at staging.
  - Confidence: MED.
  - Blind spot: Remote Supabase URLs that are still “local” tunnels.
- **Decision**: FIXED via Fix A — setup-env.ts now loads only `.env.test`

### F3 — `gmA` / `gmB` identifiers violate naming lesson

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/integration/handouts/handout-ownership.integration.test.ts (e.g. lines 84–98); src/integration/handouts/handout-validation.integration.test.ts (e.g. lines 35–36)
- **Detail**: Variables `gmAId`, `gmBId`, `gmAClient`, `gmBClient` abbreviate “game master” contrary to `lessons.md` (“Never Abbreviate Variable or Function Names”).
- **Fix**: Rename to explicit names (e.g. `ownerUserId`, `otherOwnerUserId`, `ownerAuthenticatedClient`, `otherOwnerAuthenticatedClient`) in both integration test files.
- **Decision**: FIXED — renamed to ownerUserId / otherOwnerUserId / *AuthenticatedClient

### F4 — Plan env contract drift (`envFile` vs `setup-env`)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: vitest.config.ts:31–36; src/integration/setup-env.ts
- **Detail**: Functional equivalent exists (`.env.test` loads in test mode), but the implementation path differs from the written plan. Future readers following only `plan.md` may configure the wrong loader.
- **Fix**: Add a one-line comment in `vitest.config.ts` and/or a short note in `plan.md` Progress addendum explaining `setup-env.ts` replaces `envFile` for Vitest 4 projects.
- **Decision**: FIXED — plan Phase 1 implementation note added

### F5 — Cross-owner PUT expects HTTP 500 (documented contract debt)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/integration/handouts/handout-ownership.integration.test.ts:184
- **Detail**: Test correctly matches current route behavior (`500` + generic message) and asserts no DB mutation, per plan and research. `change.md` notes still mention “403/404” from the original risk wording — implementation and `plan.md` are aligned; only the change identity file is stale.
- **Fix**: Update `change.md` Notes to say PUT cross-owner returns 500 until a future route refinement.
- **Decision**: FIXED — change.md Notes updated

### F6 — Mocked `createClient` skips cookie-based SSR auth path

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: handout-ownership.integration.test.ts:11–15; handout-validation.integration.test.ts:11–15
- **Detail**: Plan explicitly chose handler import + `vi.mock('@/lib/supabase')` with bearer-injected clients. Real `createClient(headers, cookies)` from `@/lib/supabase` is never exercised. Risk #1 (middleware) remains out of scope for this change — acceptable, but worth documenting in test-plan §6.2 when filled in.
- **Fix**: Add a one-sentence comment at the top of each integration suite file stating the mock seam intentionally bypasses cookie SSR.
- **Decision**: FIXED — file-header comments added to both suites

### F7 — `change.md` status still `implementing`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/testing-api-db-handout-coverage/change.md:4
- **Detail**: All three implementation phases are coded and committed; Progress has only Phase 2 manual items open. Status was not flipped to `implemented` (epilogue not run).
- **Fix**: After manual 2.3/2.4 resolved or waived, set `status: implemented` and run `/10x-archive` when ready.
- **Decision**: FIXED — status set to `implemented`

## Automated verification (re-run 2026-06-04)

| Command | Result |
|---------|--------|
| `npm test -- --project integration` | PASS — 21 tests, 2 files |
| `npm test -- --project unit` | PASS — 24 tests, 2 files |
| `npm run lint -- src/integration/` | PASS — 0 errors (5 pre-existing `no-console` warnings in API routes) |

## Plan vs git diff summary

- **Expected and present**: vitest projects, helpers, ownership + validation suites, `.env.test.example`, `.gitignore`, smoke removed.
- **Extra (benign)**: `package-lock.json` refresh (jsdom for unit tests), `setup-env.ts`, unit `exclude: ['src/integration/**']`, planning artifacts (`research.md`, `plan-brief.md`).
- **Absent (intentional)**: Risk #5 archive tests, CI integration gate, `.env.test` in git.
