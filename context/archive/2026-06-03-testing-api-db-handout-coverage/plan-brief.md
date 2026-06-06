# API + DB Integration Harness & Handout-Route Coverage — Plan Brief

> Full plan: `context/changes/testing-api-db-handout-coverage/plan.md`
> Research: `context/changes/testing-api-db-handout-coverage/research.md`

## What & Why

Establish the first integration test harness for this project and cover Risks #4, #6,
and #7 from `context/foundation/test-plan.md` Phase 1. The harness unblocks all future
API/DB test phases — it is the capability gap identified in the test-plan interview
("always had a problem with testing API and DB").

## Starting Point

`vitest` is configured with two pure-unit/component test files. No integration
infrastructure exists — no service-role client, no env wiring, no fixture helpers,
no route-handler test pattern. The three handout API routes are implemented and working;
their sole external dependency is `createClient` from `@/lib/supabase`.

## Desired End State

`npm test -- --project integration` runs a suite that exercises the three handout routes
against a real local Supabase instance, proving: a GM cannot mutate another GM's handout
(app layer + RLS), invalid inputs are rejected cleanly, and no error response leaks schema
artefacts. The pattern established here is the reference for Phase 2 of the test rollout.

## Key Decisions Made

| Decision                          | Choice                                              | Why (1 sentence)                                                                                                               | Source          |
| --------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| Supabase strategy                 | Real local (`npx supabase start`)                   | RLS must execute for Risk #4 to be genuinely tested; a mocked DB cannot catch policy regressions                               | Plan            |
| Route-handler test seam           | `vi.mock('@/lib/supabase')` + direct handler import | All three routes import only `createClient`; mocking one module injects any authenticated client without a running HTTP server | Research        |
| Test file location                | `src/integration/` top-level directory              | Keeps integration tests visually separate from unit tests and matches a separate vitest project config                         | Plan            |
| Fixture isolation                 | Per-suite (beforeAll / afterEach / afterAll)        | Faster than per-test user creation while preventing cross-test state leakage                                                   | Plan            |
| Env setup                         | `.env.test` (gitignored) + vitest `envFile`         | Keeps local Supabase secrets out of git; clean per-project config                                                              | Plan            |
| Wrong-owner PUT assertion         | Assert `500` + "no mutation persisted"              | Route currently returns 500 (not 403) for cross-owner attempts; assert both status and DB-state truth                          | Research / Plan |
| Risk #5 (archive link-permanence) | Deferred entirely                                   | Archive route (S-04) not implemented; no stubs added                                                                           | Plan            |

## Scope

**In scope:** vitest integration project setup, `.env.test` wiring, admin/test-user/context-stub
helpers, ownership tests (Risk #4 — IDOR on PUT and publish), unauthenticated 401 baseline,
input-boundary validation tests (Risk #6), schema-leakage assertion helper (Risk #7).

**Out of scope:** Risk #5 archive tests, GET-by-id IDOR, fixing the wrong-owner 500 response,
CI gate wiring, e2e via HTTP.

## Architecture / Approach

Two Supabase clients per test suite: an admin (service-role) client for fixture
setup/teardown that bypasses RLS, and one authenticated anon-key client per test GM
(obtained by signing in with a password-created test user). `vi.mock('@/lib/supabase')`
swaps `createClient` with a `vi.fn()` that returns whichever GM's client the test configures.
Route handlers are imported and called directly with a minimal `APIContext` stub — no HTTP
server needed.

## Phases at a Glance

| Phase                                         | What it delivers                                                                                         | Key risk                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1. Integration harness bootstrap              | vitest integration project, `.env.test`, admin client, test-user factory, context stub, smoke test       | vitest projects config may need adjustment if it conflicts with existing unit test setup       |
| 2. Ownership tests (Risk #4)                  | Two-user cross-owner tests + unauthenticated 401 baseline; own-row happy path                            | Regression-probe step (remove ownership filter) needed to confirm test isn't vacuously passing |
| 3. Validation + error hygiene (Risks #6 + #7) | Boundary-input tests on POST/PUT/publish + `assertNoSchemaLeakage` helper applied to all error responses | Empty-title POST returning 201 must be documented as a known gap, not a test bug               |

**Prerequisites:** `npx supabase start` must be running; local Supabase service-role and anon keys in `.env.test`.
**Estimated effort:** ~2–3 sessions across 3 phases.

## Open Risks & Assumptions

- The vitest `projects` array API is available in Vitest 4.x (confirmed in `package.json` — `vitest ^4.1.7`).
- `supabase.auth.admin.createUser` is available on the local Supabase instance's admin API — standard in all `npx supabase start` environments.
- The wrong-owner PUT returning `500` is a stable characteristic; if it's changed to `404` before implementation, the ownership test assertion needs updating.

## Success Criteria (Summary)

- `npm test -- --project integration` passes with all three phases' tests green.
- Temporarily removing `.eq('gm_id', user.id)` from `[id].ts` causes the cross-owner PUT test to fail (proving the test is not vacuously green).
- No error response in the integration suite contains any of: `handouts`, `gm_id`, `share_token`, `PostgREST`, `constraint`.
