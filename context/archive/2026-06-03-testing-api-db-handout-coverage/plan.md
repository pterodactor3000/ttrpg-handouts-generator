# API + DB Integration Harness & Handout-Route Coverage — Implementation Plan

## Overview

Establish the first integration test harness for this project and use it to cover
three of the four risks assigned to test-plan Phase 1: Risk #4 (IDOR — cross-owner
mutations), Risk #6 (server-side input validation), and Risk #7 (DB error message
leakage). Risk #5 (archive link-permanence) is explicitly deferred until S-04 lands.

The harness is the primary deliverable — once it exists, future phases reuse it
without additional setup.

## Current State Analysis

No integration test infrastructure exists. `vitest` is configured (`vitest.config.ts`,
`environment: 'node'`, `@vitejs/plugin-react`, `@` alias) with two test files, both
pure-unit or DOM-component. No API/DB fixture helpers, no service-role client, no
env wiring for integration tests.

The three handout API routes (`POST /api/handouts`, `PUT /api/handouts/[id]`,
`POST /api/handouts/[id]/publish`) are working, all import `createClient` from
`@/lib/supabase` as their sole external dependency, and all call `supabase.auth.getUser()`
to resolve the session — no `context.locals` usage. This makes `vi.mock('@/lib/supabase')`
the clean seam: mocking it lets handlers be imported directly and called with a
minimal stub context.

RLS policies cover: `gm_select_own`, `gm_insert_own`, `gm_update_non_archived`,
`anon_select_shared`. No delete policy exists (S-04 unimplemented). The `anon_select_shared`
policy allows any row with `status IN ('published','archived') AND share_token IS NOT NULL`;
security depends on the app filtering by token.

## Desired End State

`npm test` runs the full suite including integration tests. A test file under
`src/integration/handouts/` proves:

- a GM cannot mutate another GM's handout via PUT or publish (assertions on both HTTP
  status and DB state);
- every input-boundary violation on POST and PUT is rejected with a clean 400/422;
- every error response contains only the expected generic message with no table, column,
  or constraint names.

Running integration tests requires `npx supabase start` and a populated `.env.test`.
The CI gate wiring (making this required before merge) is deferred to rollout Phase 4.

### Key Discoveries

- All three routes import only `createClient` from `@/lib/supabase` — mocking that one
  module is sufficient to inject any pre-authenticated Supabase client. (`research.md`)
- `astro:env/server` (used inside `supabase.ts`) is never reached when the whole module
  is mocked — no special vitest env shim is required. (`research.md`)
- Wrong-owner `PUT` returns `500 { error: 'Failed to save handout' }`, not `403`/`404`.
  This is a known characteristic; tests assert both the `500` status and that the DB row
  is unchanged. (`research.md § Risk #4`)
- Empty `title` and `markdownContent` pass POST/PUT zod validation (no `min(1)`); only
  the publish route rejects them at publish time. Tests must not assert that empty-field
  creates fail at the route level. (`research.md § Risk #6`)
- A vitest `projects` array in `vitest.config.ts` supports separate `unit` and
  `integration` configurations with different `include` globs and `envFile` values.

## What We're NOT Doing

- **Risk #5 (archive link-permanence)** — deferred until S-04 (`delete-handout`) is
  implemented. No placeholder or skipped tests are added.
- **GET-by-id IDOR** — no GET-by-id route exists; this surface will be covered when a
  dashboard detail route is built.
- **E2e / full HTTP integration** — the handler-import pattern covers the same logic
  without a running dev server; e2e is reserved for Phase 2 of the rollout (access-control
  critical path via the share page).
- **Fixing the wrong-owner 500** — the route's non-ideal 500 response on cross-owner PUT
  is a pre-existing design choice; this plan documents and tests around it, not corrects it.
- **CI gate wiring** — running integration tests in GitHub Actions is rollout Phase 4.

## Implementation Approach

Three phases ordered by dependency: (1) harness infrastructure, (2) ownership tests
(Risk #4), (3) validation + error hygiene (Risks #6 + #7).

The harness uses `vi.mock('@/lib/supabase')` to inject a real, pre-authenticated
`@supabase/supabase-js` client into each handler under test. The client is obtained by
signing in with a test user created via the service-role admin API before the suite runs.
A separate admin client (service-role key) handles fixture setup and teardown, bypassing
RLS. All tests run against a real local Supabase instance started with `npx supabase start`.

Test environment variables live in a gitignored `.env.test` file, sourced by a new
`integration` vitest project via `envFile: '.env.test'`.

## Critical Implementation Details

**Two Supabase clients in tests.** The admin client (service-role) is for setup/teardown
only and bypasses RLS entirely. The GM clients (anon key + signed-in session) are what
get injected into the mocked `createClient` — these respect RLS and are what the real app
uses. Never use the admin client as the injected client; that would silently bypass every
ownership check.

**Session acquisition.** `supabase.auth.admin.createUser({ email_confirm: true, password })`
creates the user, then `anonClient.auth.signInWithPassword({ email, password })` returns
a `session.access_token`. Construct the authenticated client as
`createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: 'Bearer <token>' } } })`.
Calling `getUser()` on this client returns the correct user, which is what every handler
calls after `createClient`.

**Per-suite fixture lifecycle.** `beforeAll`: create GM-A and GM-B users, sign them in,
obtain their authenticated clients. `afterEach`: delete all `handouts` rows owned by
GM-A and GM-B (service-role DELETE, no status filter). `afterAll`: delete GM-A and GM-B
users via admin API. This isolation keeps tests fast while preventing cross-test state leakage.

---

## Phase 1: Integration Harness Bootstrap

### Overview

Wire up the vitest `integration` project, create the `.env.test` file (gitignored), and
build the three helper modules that all subsequent integration tests import. Ends with a
smoke test that connects to local Supabase, creates a user, and deletes it — proving the
end-to-end harness chain works before any route tests are written.

### Changes Required

#### 1. Environment file

**File**: `.env.test` _(create, gitignored)_

**Intent**: Provide the three env vars integration tests need. This file must never be
committed — it holds the local Supabase service-role key.

**Contract**: Three keys: `SUPABASE_URL` (local default `http://127.0.0.1:54321`),
`SUPABASE_ANON_KEY` (local anon key from `npx supabase status`),
`SUPABASE_SERVICE_ROLE_KEY` (local service-role key from `npx supabase status`).

Also add `.env.test.example` (committed) listing the same three keys with placeholder values,
so other contributors know what's required.

#### 2. Add `.env.test` to `.gitignore`

**File**: `.gitignore`

**Intent**: Prevent accidental commit of the service-role key.

**Contract**: Append `.env.test` on its own line.

#### 3. Add `integration` project to vitest config

**File**: `vitest.config.ts`

**Intent**: Run integration tests as a separate vitest project so they can use `envFile`
without affecting the existing unit suite's environment.

**Contract**: Convert the top-level `test` config to a `test.projects` array. First
project (`unit`) keeps the current settings (`environment: 'node'`, react plugin,
`include: ['src/**/*.test.{ts,tsx}']`). Second project (`integration`) adds
`envFile: '.env.test'`, `environment: 'node'`, `include: ['src/integration/**/*.test.ts']`,
and the same `@` alias. Both projects share the `plugins` array.

**Implementation note (2026-06-04)**: Vitest 4 `test.projects` does not load per-project `envFile` reliably. Integration env is loaded exclusively from `.env.test` via `src/integration/setup-env.ts` (`setupFiles` in `vitest.config.ts`).

#### 4. Admin client helper

**File**: `src/integration/helpers/admin-client.ts` _(create)_

**Intent**: Export a function that creates a service-role Supabase client for test
fixture setup and teardown (bypasses RLS — only for before/afterAll use).

**Contract**: `createAdminClient(): SupabaseClient` — constructs a client using
`createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` from `@supabase/supabase-js`.
Throws with a descriptive message if either env var is absent so misconfigured
environments fail fast.

#### 5. Test-user fixture factory

**File**: `src/integration/helpers/test-users.ts` _(create)_

**Intent**: Provide `createTestUser` and `deleteTestUser` helpers used in `beforeAll`/`afterAll`
to manage the two test GMs. Also provides `signInAsUser`, which returns a pre-authenticated
anon Supabase client suitable for injection into the mocked `createClient`.

**Contract**:

- `createTestUser(adminClient, email, password): Promise<{ id: string }>` — calls
  `adminClient.auth.admin.createUser({ email, password, email_confirm: true })`.
- `deleteTestUser(adminClient, userId): Promise<void>` — calls
  `adminClient.auth.admin.deleteUser(userId)`.
- `signInAsUser(email, password): Promise<SupabaseClient>` — creates an anon client,
  calls `auth.signInWithPassword`, constructs and returns a bearer-token client.

#### 6. Astro context stub helper

**File**: `src/integration/helpers/context-stub.ts` _(create)_

**Intent**: Build the minimal `APIContext`-shaped object that route handlers receive.
Handlers under test use `context.request` (for body and headers fed to `createClient`),
`context.cookies` (passed to `createClient` but stubbed away), and `context.params` (path params).
Since `createClient` is mocked, only `request.json()` and `params` are exercised for real.

**Contract**: `makeContext(options: { body?: unknown, params?: Record<string, string>, method?: string }): APIContext` —
returns an object with a real `Request` (body JSON-serialised, `Content-Type: application/json`),
a stub `cookies` object (`set: vi.fn(), get: vi.fn()`), and `params` passed through.
Cast to `unknown as APIContext` to satisfy typing without importing Astro's full type surface.

#### 7. Smoke test

**File**: `src/integration/smoke.test.ts` _(create)_

**Intent**: Confirm the harness chain is working — local Supabase is reachable, the
service-role client can create and delete a user — before any route tests are written.
This test is deleted once Phase 2 lands (its assertions are superseded).

**Contract**: Single `it('connects to local Supabase and can create/delete a test user')`.
Creates a user with a random email, asserts the returned `user.id` is a non-empty UUID,
deletes the user, asserts no error.

### Success Criteria

#### Automated Verification

- `npm test` with `--project integration` passes with the smoke test green
- `npm test` with `--project unit` still passes (existing tests unaffected)
- `npm run lint` passes on all new files
- `npm run build` succeeds (integration helpers are not imported by app code)

#### Manual Verification

- `npx supabase start` is running; `npx supabase status` shows local anon and service-role keys
- `.env.test` is populated with values from `npx supabase status`; `.env.test` does not appear in `git status`
- Running `npm test -- --project integration` prints the smoke test as passing in the terminal

**Implementation Note**: After all automated verification passes, confirm manually that
`.env.test` is gitignored and the smoke test is green before proceeding to Phase 2.

---

## Phase 2: Ownership Tests (Risk #4)

### Overview

Use the Phase 1 harness to write the two-user fixture tests that prove a GM cannot
read or mutate another GM's handout. Covers Risk #4 (IDOR at the app layer) and
also tests the 401-unauthenticated path on all three routes as a baseline.

### Changes Required

#### 1. Ownership integration test file

**File**: `src/integration/handouts/handout-ownership.integration.test.ts` _(create)_

**Intent**: Prove that cross-owner mutations are blocked at both the app-layer and RLS
layers, and that unauthenticated requests are rejected cleanly.

**Contract**: The test suite uses the per-suite fixture lifecycle:

`beforeAll`: use `createTestUser` + `signInAsUser` to create GM-A and GM-B, obtaining
their IDs and authenticated Supabase clients. Use the admin client to insert one draft
handout owned by GM-A directly into the DB (bypass route layer for setup).

`afterEach`: use the admin client to delete all `handouts` rows with `gm_id IN (gmAId, gmBId)`.

`afterAll`: `deleteTestUser` for both users.

`vi.mock('@/lib/supabase', ...)` at the top of the file — mock `createClient` to return
whichever client `vi.fn().mockReturnValue(...)` is set to before each test.

**Test cases to include:**

_Unauthenticated baseline (all three routes):_

- `POST /api/handouts` with no session → `401 { error: 'Unauthorized' }`. Assert response body contains only `error` key with value `'Unauthorized'` and no schema artefacts.
- `PUT /api/handouts/[id]` with no session → `401`.
- `POST /api/handouts/[id]/publish` with no session → `401`.

_Cross-owner PUT (Risk #4, core case):_

- Set mock to return GM-B's client. Call `PUT /api/handouts/[id]` with GM-A's handout ID and valid body.
- Assert response status is `500`.
- Assert response body is exactly `{ error: 'Failed to save handout' }` — no other keys, no schema artefacts.
- Assert via admin client that the DB row's `title` and `markdown_content` are unchanged from the fixture values.

_Cross-owner publish (Risk #4, secondary case):_

- Set mock to return GM-B's client. Call `POST /api/handouts/[id]/publish` with GM-A's handout ID.
- Assert response status is `404`.
- Assert response body is exactly `{ error: 'Handout not found or not in draft status' }`.
- Assert via admin client that the DB row's `status` is still `'draft'` and `share_token` is `null`.

_Own-row happy path (baseline for contrast):_

- GM-A publishes their own draft → `200 { shareToken: <uuid> }`.
- Assert via admin client that `status = 'published'`, `share_token` is a non-null UUID,
  and `published_at` is a non-null ISO timestamp.

### Success Criteria

#### Automated Verification

- `npm test -- --project integration` passes with all ownership tests green
- `npm run lint` passes

#### Manual Verification

- Cross-owner PUT test: inspect the DB row via `npx supabase studio` or SQL to confirm
  the title was not modified
- Own-row publish test: confirm the returned `shareToken` resolves at `/share/<token>`
  in the browser (optional but recommended)

**Implementation Note**: After automated verification passes, confirm the DB-state
assertions are exercising real RLS by temporarily commenting out the `.eq('gm_id', user.id)`
line in `[id].ts` and verifying the cross-owner test now fails. Restore immediately after.

---

## Phase 3: Validation and Error Hygiene Tests (Risks #6 + #7)

### Overview

Verify that boundary-violating inputs are rejected cleanly by the three routes, and
that every error response in the integration suite contains only the expected generic
message with no schema artefacts. Risk #7 is implemented as a cross-cutting assertion
helper applied across all error responses rather than a standalone test file.

### Changes Required

#### 1. Schema-leakage assertion helper

**File**: `src/integration/helpers/assert-no-schema-leakage.ts` _(create)_

**Intent**: Provide a single reusable assertion that any error response body does not
contain known schema artefacts. Called on every non-2xx response throughout the integration suite.

**Contract**: `assertNoSchemaLeakage(body: string): void` — asserts that the string does
not match any of: `'handouts'`, `'gm_id'`, `'share_token'`, `'markdown_content'`,
`'background_category'`, `'published_at'`, `'archived_at'`, `'postgres'`, `'pgerror'`,
`'PostgREST'`, `'relation'`, `'constraint'`. Uses `expect(body).not.toContain(term)` for
each term. Callers pass `JSON.stringify(responseBody)`.

#### 2. Validation integration test file

**File**: `src/integration/handouts/handout-validation.integration.test.ts` _(create)_

**Intent**: Exercise the input-validation boundary on POST and PUT: each invalid input
produces a clean 400 with no schema artefacts in the response.

**Contract**: Uses a single GM-A user (no GM-B needed here). `beforeAll` creates the
user; `afterAll` deletes it. `vi.mock('@/lib/supabase')` injects GM-A's client.

**Test cases — POST `/api/handouts`:**

- Missing `backgroundCategory` → `400`; `assertNoSchemaLeakage` on body.
- `backgroundCategory` value not in enum (e.g. `'grimdark'`) → `400`.
- `title` exceeding 300 chars → `400`.
- `markdownContent` exceeding 50 000 chars → `400`.
- More than 20 tags → `400`.
- Non-JSON body (plain text `"hello"` without JSON header) → `400`.
- Empty `title` with valid other fields → `201` (documenting the known gap: empty title is NOT rejected at POST time; only publish rejects it).

**Test cases — PUT `/api/handouts/[id]`:**

- Non-UUID path param (`id = 'not-a-uuid'`) → `400 { error: 'Invalid handout id' }`.
- Missing UUID path param (empty string) → `400 { error: 'Missing handout id' }`.
- `backgroundCategory` not in enum → `400`.
- `title` exceeding 300 chars → `400`.
- Updating a published handout (own row, status=`published`) → `500 { error: 'Failed to save handout' }` (known characteristic: status gate collapses to 500, not 409).

All 400/500 responses: call `assertNoSchemaLeakage(JSON.stringify(body))`.

**Test cases — POST `/api/handouts/[id]/publish`:**

- Publish a handout with an empty `title` (saved as draft with empty title via admin insert) → `422`.
- Publish a handout with empty `markdown_content` → `422`.
- Publish a non-existent ID (random UUID, no row) → `404 { error: 'Handout not found or not in draft status' }`.
- `assertNoSchemaLeakage` on all non-2xx bodies.

### Success Criteria

#### Automated Verification

- `npm test -- --project integration` passes with all validation tests green (including the documenting `201` case for empty-title POST)
- `npm run lint` passes

#### Manual Verification

- Review test output: confirm the "empty title → 201" case is labelled with a comment
  making the gap explicit (e.g. `// known gap: zod does not enforce min(1) on title at POST time`)
- Confirm `assertNoSchemaLeakage` is called on every non-2xx response in both Phase 2
  and Phase 3 test files

**Implementation Note**: After all tests are green, delete `src/integration/smoke.test.ts`
(its assertions are superseded by Phases 2 and 3). Run `npm test -- --project integration`
one final time to confirm the smoke test deletion leaves no hanging references.

---

## Testing Strategy

### Integration Tests

Each Phase 2 and 3 test file uses the per-suite lifecycle:

- `beforeAll`: create test users via admin client, sign in to obtain authenticated clients.
- `afterEach`: delete all handout rows owned by test user IDs (admin client, no filter on status).
- `afterAll`: delete test users via admin client.

The `vi.mock('@/lib/supabase')` call at file scope replaces `createClient` with a `vi.fn()`.
Individual tests call `vi.mocked(createClient).mockReturnValue(userClient)` before invoking
the handler to control which user's session is active.

### Manual Testing Steps

1. Start local Supabase: `npx supabase start`.
2. Populate `.env.test` with values from `npx supabase status` (anon key, service-role key, URL).
3. Run `npm test -- --project unit` — confirm existing tests unaffected.
4. Run `npm test -- --project integration` — confirm all integration tests pass.
5. For Phase 2: temporarily remove the `.eq('gm_id', user.id)` ownership filter from
   `src/pages/api/handouts/[id].ts` and verify the cross-owner PUT test now **fails**.
   This confirms the test is exercising real ownership enforcement, not a vacuously passing assertion.
6. Restore the ownership filter.

## Migration Notes

No database schema changes. The existing `supabase/migrations/20260528200000_create_handouts_table.sql`
is the schema this plan tests against. Tests run against the local Supabase instance
started with `npx supabase start` (which runs `npx supabase db reset` internally on first start).

## References

- Research: `context/changes/testing-api-db-handout-coverage/research.md`
- Test plan: `context/foundation/test-plan.md` §3 Phase 1
- Route handlers: `src/pages/api/handouts/index.ts`, `src/pages/api/handouts/[id].ts`,
  `src/pages/api/handouts/[id]/publish.ts`
- Schema/RLS: `supabase/migrations/20260528200000_create_handouts_table.sql`
- Existing unit tests (patterns): `src/lib/__tests__/handout-renderer.test.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Integration Harness Bootstrap

#### Automated

- [x] 1.1 `npm test -- --project integration` passes with smoke test green — 4d829e1
- [x] 1.2 `npm test -- --project unit` passes (existing tests unaffected) — 4d829e1
- [x] 1.3 `npm run lint` passes on all new files — 4d829e1
- [x] 1.4 `npm run build` succeeds — 4d829e1

#### Manual

- [x] 1.5 `npx supabase start` running; `.env.test` populated from `npx supabase status` — 4d829e1
- [x] 1.6 `.env.test` does not appear in `git status` (gitignored) — 4d829e1
- [x] 1.7 Smoke test is green in terminal output — 4d829e1

### Phase 2: Ownership Tests (Risk #4)

#### Automated

- [x] 2.1 `npm test -- --project integration` passes with all ownership tests green — 1adc2ee
- [x] 2.2 `npm run lint` passes — 1adc2ee

#### Manual

- [x] 2.3 Cross-owner PUT: DB row title unchanged (verified via Supabase Studio or SQL)
- [x] 2.4 Ownership filter removed → cross-owner PUT test fails (regression-probes the test itself); filter restored

### Phase 3: Validation and Error Hygiene Tests (Risks #6 + #7)

#### Automated

- [x] 3.1 `npm test -- --project integration` passes with all validation tests green — ab19dc1
- [x] 3.2 `npm run lint` passes — ab19dc1

#### Manual

- [x] 3.3 Empty-title POST `201` test is labelled with a comment marking the known gap — ab19dc1
- [x] 3.4 `assertNoSchemaLeakage` called on every non-2xx response in both Phase 2 and Phase 3 files — ab19dc1
- [x] 3.5 `src/integration/smoke.test.ts` deleted; `npm test -- --project integration` still passes — ab19dc1
