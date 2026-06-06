# Access-Control Critical Path — Test Coverage (Phase 2)

## Overview

Add integration tests for the two access-control paths that have zero automated coverage: the auth middleware gate (Risk #1) and the anonymous share-token read path (Risk #2). Phase 1 of the test rollout deliberately bypassed both — middleware was never exercised, and the `.astro` share page cannot be imported as a handler. This plan adds the missing coverage using two new test patterns that complement the existing Phase 1 harness without disturbing it.

## Current State Analysis

No tests exist for `src/middleware.ts`, redirect behavior, `locals.user` population, or the `src/pages/share/[token].astro` DB query path. The Phase 1 harness tests API route handlers via `makeContext` + `vi.mock('@/lib/supabase')` — that pattern does not extend to middleware (`onRequest` via `defineMiddleware`) or to Astro pages.

### Key Discoveries

- `PROTECTED_ROUTES = ['/dashboard', '/handouts']` (`middleware.ts:6`) — prefix-matched; `/share/*` is intentionally outside
- `onRequest` calls `createClient(context.request.headers, context.cookies)`, then `supabase.auth.getUser()` — `error` is never read; any failure → `locals.user = null` → fail-closed redirect
- `src/pages/handouts/new.astro` has zero page-level auth guard (lines 1–8) — entirely middleware-reliant
- `signInAsUser` in `test-users.ts:42–67` returns a bearer-authenticated `@supabase/supabase-js` client, not session cookies; injecting it via `vi.mock` avoids cookie-parsing complexity
- `anon_select_shared` RLS policy (migration:52–54): `status IN ('published', 'archived') AND share_token IS NOT NULL` — both statuses permitted; token equality enforced by the app query, not by RLS
- Archive transition (`status = 'archived'`) is not implemented in app code yet (S-04 proposed) — archived-link-permanence tests must insert rows via admin client
- `vitest.config.ts:29–37` integration project includes `src/integration/**/*.test.ts` — new suites drop in without config changes

## Desired End State

Two new integration suites are green against a running local Supabase (`npx supabase start`):

1. `src/integration/middleware/auth-gate.integration.test.ts` — calls `onRequest` directly with a new middleware context stub; asserts anonymous → redirect, authed → next() + `locals.user` populated, authed `/` → `/dashboard`, public paths not gated
2. `src/integration/share/share-token-read.integration.test.ts` — uses a raw anon Supabase client (no mock) against real RLS + admin-inserted fixtures; asserts published, archived, draft, and unknown-token scenarios

All existing Phase 1 suites continue to pass. `npm run lint` and `npm run build` are clean.

### Key Discoveries

- `src/integration/helpers/context-stub.ts:3–33` is not reusable for middleware (wrong shape); a new `middleware-context-stub.ts` helper is needed
- `vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }))` seam from Phase 1 is fully reusable for Risk #1
- For Risk #2: no mock is needed; the raw `@supabase/supabase-js` `createClient(url, anonKey)` client exercises real RLS directly

## What We're NOT Doing

- No test of Astro page HTML rendering or HTTP status codes for the share page (the DB contract is the signal; the page routing layer adds no new risk)
- No extraction of the share query to `src/lib/services/share.ts` (out of scope for this phase)
- No e2e tests (integration layer is sufficient to prove both risks)
- No `getUser()` error-behavior scenario (fail-closed is implicit in the anonymous-path tests; not worth added mock complexity)
- No changes to existing Phase 1 suites or helpers

## Implementation Approach

**Phase 1** adds one new helper and one new integration suite for Risk #1. The helper (`middleware-context-stub.ts`) creates the middleware context shape that `onRequest` expects — `url`, `locals`, `request`, `cookies`, `redirect()`, `next()`. The suite mocks `createClient` to return either a real anon client (anonymous scenarios) or a real bearer-authed client (authed scenarios), then calls `onRequest` directly and asserts on the returned `Response` or `next()` invocation.

**Phase 2** adds one new integration suite for Risk #2. No new helpers needed — it uses the existing `createAdminClient()` for fixtures and a raw `@supabase/supabase-js` anon client for the query assertions. No mocking; real RLS is exercised.

## Critical Implementation Details

**`onRequest` is callable directly.** `defineMiddleware(handler)` in Astro is a type-helper identity function — it returns the handler unchanged. Importing `onRequest` from `@/middleware` and calling `await onRequest(ctx, ctx.next)` works in a Vitest Node environment without an Astro server.

**`redirect()` in the stub must return a real `Response`.** Middleware returns `context.redirect(path)` — the test asserts on the returned `Response`. The stub's `redirect` must return `new Response(null, { status: 302, headers: { Location: path } })` so the status and `Location` header are assertable.

**Bearer client vs cookie client.** `createClient` in `src/lib/supabase.ts` reads the `Cookie` header. For authenticated middleware tests the stub does not need a real cookie — `vi.mock('@/lib/supabase')` intercepts before cookie parsing. The mock returns the bearer-authenticated client from `signInAsUser`, whose `getUser()` calls the live Supabase and returns a real `User`. This is the same as Phase 1's mock seam; only the context shape differs.

**anon client for Risk #2.** Do not mock `@/lib/supabase` in the share-token suite. Use `createClient(supabaseUrl, anonKey)` from `@supabase/supabase-js` directly — same library the integration helpers already import. RLS runs for real; this is the whole point.

---

## Phase 1: Middleware context stub + auth-gate integration tests (Risk #1)

### Overview

Create a new helper that builds the middleware context shape, then write an integration suite that exercises `onRequest` for every scenario Risk #1 requires: anonymous access to protected routes, authenticated access, the authed-`/`→`/dashboard` redirect, and public routes that must not be gated.

### Changes Required

#### 1. New middleware context stub helper

**File**: `src/integration/helpers/middleware-context-stub.ts`

**Intent**: Export `makeMiddlewareContext({ pathname, requestInit? })` — builds the minimal Astro middleware context object that `onRequest` needs. Keeps the middleware tests as simple as the handler tests in Phase 1.

**Contract**: `makeMiddlewareContext` accepts `{ pathname: string; requestInit?: RequestInit }` and returns an object with:
- `url: URL` — constructed from `http://localhost` + `pathname`
- `locals: App.Locals` — typed as `{ user: null }` initially (mutable)
- `request: Request` — constructed from `http://localhost` + `pathname` using `requestInit` (allows injecting `Cookie` or `Authorization` headers if ever needed)
- `cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }` — same shape as Phase 1 context stub
- `redirect: (path: string) => Response` — returns `new Response(null, { status: 302, headers: { Location: path } })`
- `next: vi.fn()` pre-resolved to `new Response(null, { status: 200 })`

#### 2. Vitest `astro:middleware` alias + stub (discovered during implementation)

**Files**: `src/integration/helpers/astro-middleware-stub.ts`, `vitest.config.ts`

**Intent**: `@/middleware` imports `defineMiddleware` from `astro:middleware`, which Vitest/Node cannot resolve natively. A minimal identity stub plus a one-line alias in `vitest.config.ts` unblocks direct `onRequest` invocation in the integration project. `defineMiddleware` is a compile-time type helper in Astro — the stub returns the handler unchanged.

**Contract**:
- `astro-middleware-stub.ts` exports `defineMiddleware(handler) => handler`
- `vitest.config.ts` adds `'astro:middleware': resolve(__dirname, './src/integration/helpers/astro-middleware-stub.ts')` to `srcAlias`

#### 3. New auth-gate integration suite

**File**: `src/integration/middleware/auth-gate.integration.test.ts`

**Intent**: Test every meaningful scenario through the real `onRequest` function. Mock seam (`vi.mock('@/lib/supabase')`) intercepts `createClient` — return an anon client for unauthenticated scenarios and a bearer-authed client for authenticated ones. Assert on the returned `Response` (redirect cases) or on `next` being called (pass-through cases), plus `locals.user` shape.

**Contract**:

```typescript
vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));
import { onRequest } from '@/middleware';
import { createClient as createAppSupabaseClient } from '@/lib/supabase';
// unauthenticatedClient: createClient(url, anonKey) from @supabase/supabase-js
// authenticatedClient: signInAsUser(adminClient, userId, email, password)
```

Suite structure (all suites in the integration project, `beforeAll` / `afterAll` for user lifecycle):

**Anonymous → protected route** (mock returns `unauthenticatedClient` in `beforeEach`):
- `GET /dashboard` → response status 302, `Location: /auth/signin`
- `GET /handouts` → response status 302, `Location: /auth/signin`
- `GET /handouts/new` → response status 302, `Location: /auth/signin`

**Anonymous → public route** (mock returns `unauthenticatedClient`):
- `GET /` → `next` called (no redirect; anonymous users stay on landing)
- `GET /share/some-uuid` → `next` called (share path intentionally ungated)
- `GET /auth/signin` → `next` called

**Authenticated → protected route** (mock returns `authenticatedClient` in `beforeEach`):
- `GET /dashboard` → `next` called; `locals.user` is a `User` object with non-null `id` and `email`
- `GET /handouts/new` → `next` called; `locals.user` populated

**Authenticated → root redirect**:
- `GET /` → response status 302, `Location: /dashboard`

**Teardown**: `deleteTestUser` in `afterAll`.

### Success Criteria

#### Automated Verification

- All auth-gate integration tests pass: `npm test -- --project integration`
- All existing Phase 1 integration tests still pass (no regressions)
- Lint clean: `npm run lint`

#### Manual Verification

- New test file appears under `src/integration/middleware/` and is picked up by the integration project
- `locals.user` assertion confirms the real `User` shape (has `id`, `email`) — not a mock object

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Share-token DB-layer integration tests (Risk #2)

### Overview

Add an integration suite that proves the anonymous share-token read contract: published handouts are readable by the anon role, archived handouts remain readable (link-permanence), draft handouts are not readable, and an unknown token returns no rows. Uses a real anon client against live RLS — no mocking.

### Changes Required

> Note: `src/integration/helpers/env.ts` (shared `requireEnv`) was introduced as a Phase 1 impl-review triage fix and is used by this suite. See Phase 1 Changes Required §2 addendum.

#### 1. New share-token read integration suite

**File**: `src/integration/share/share-token-read.integration.test.ts`

**Intent**: Exercise the `anon_select_shared` RLS policy and the query pattern used by `src/pages/share/[token].astro` using a raw anon Supabase client + admin-inserted fixtures. The test proves the DB contract that the Astro page relies on.

**Contract**:

```typescript
// No vi.mock — real RLS is the subject under test
import { createClient } from '@supabase/supabase-js';
// anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
// mirrored query from share/[token].astro:26–31:
// anonClient.from('handouts')
//   .select('title, markdown_content, background_category')
//   .eq('share_token', token)
//   .in('status', ['published', 'archived'])
//   .single()
```

Test user / fixture lifecycle: `createTestUser` + `createAdminClient` in `beforeAll`; admin insert of the scenario handout in each test (or `beforeEach`); `afterEach` delete by `gm_id` + `gm_id` user id; `afterAll` `deleteTestUser`.

**Test cases**:

1. **Published handout — valid token** → query returns `{ title, markdown_content, background_category }` with no error; `data` matches inserted values
2. **Archived handout — valid token** → query returns the row (link-permanence NFR); admin insert uses `status: 'archived'` directly since S-04 is not shipped
3. **Draft handout — valid token** → query returns PGRST116 error and `data: null` (draft excluded by status filter)
4. **Unknown UUID token** → query returns PGRST116 and `data: null` (no matching row)
5. **Published handout, `share_token IS NULL`** → query returns PGRST116 (`anon_select_shared` policy requires `share_token IS NOT NULL`); admin insert sets `share_token: null`

Note: Cases 3–5 all result in PGRST116 — they are distinct fixtures proving different exclusion reasons (status filter, no matching row, policy). Assert that `error.code === 'PGRST116'` and `data === null` for all three.

### Success Criteria

#### Automated Verification

- All share-token integration tests pass: `npm test -- --project integration`
- All Phase 1 and Phase 2.1 tests still pass
- Lint clean: `npm run lint`

#### Manual Verification

- Confirm test 2 (archived link-permanence) uses a direct admin insert — there is no app-level archive endpoint; verify the comment in the test makes this explicit

---

## Testing Strategy

### Integration Tests

Both suites run under the existing Vitest `integration` project. Prerequisites: local Supabase running (`npx supabase start`), `.env.test` populated from `.env.test.example`.

Run all integration tests: `npm test -- --project integration`

Run only Phase 2 (this change): `npm test -- --project integration src/integration/middleware src/integration/share`

### Manual Testing Steps

1. Start local Supabase: `npx supabase start`
2. Run `npm test -- --project integration` — all suites (Phase 1 + Phase 2) must be green
3. Inspect the `locals.user` assertion output to confirm a real `User` object (not `{}` or `undefined`)
4. Verify the archived-link-permanence test comment explicitly states the fixture is admin-inserted (no app-level archive endpoint exists yet)

## References

- Research: `context/changes/testing-access-control-critical-path/research.md`
- Phase 1 harness (archived): `context/archive/2026-06-03-testing-api-db-handout-coverage/`
- Existing mock seam pattern: `src/integration/handouts/handout-ownership.integration.test.ts:11–17`
- Existing context stub (API handlers only): `src/integration/helpers/context-stub.ts`
- `signInAsUser` helper: `src/integration/helpers/test-users.ts:42–67`
- Middleware under test: `src/middleware.ts:1–31`
- Share page under test: `src/pages/share/[token].astro:16–47`
- RLS policy: `supabase/migrations/20260528200000_create_handouts_table.sql:48–54`
- Test plan: `context/foundation/test-plan.md` §2 Risks #1, #2; §3 Phase 2

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Middleware context stub + auth-gate integration tests

#### Automated

- [x] 1.1 All auth-gate integration tests pass: `npm test -- --project integration` — 667739d
- [x] 1.2 All existing Phase 1 integration tests still pass (no regressions) — 667739d
- [x] 1.3 Lint clean: `npm run lint` — 667739d

#### Manual

- [x] 1.4 New test file appears under `src/integration/middleware/` and is picked up by the integration project — 667739d
- [x] 1.5 `locals.user` assertion confirms real `User` shape (non-null `id` and `email`) — 667739d

### Phase 2: Share-token DB-layer integration tests

#### Automated

- [x] 2.1 All share-token integration tests pass: `npm test -- --project integration` — b3505cd
- [x] 2.2 All Phase 1 and existing integration tests still pass — b3505cd
- [x] 2.3 Lint clean: `npm run lint` — b3505cd

#### Manual

- [x] 2.4 Archived-link-permanence test comment explicitly states the fixture is admin-inserted (no app-level archive endpoint) — b3505cd
