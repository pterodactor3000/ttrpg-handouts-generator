---
date: 2026-06-06T09:49:00+02:00
researcher: Claude (Sonnet 4.6)
git_commit: 86ea5531b48677e6e33b07f37210bfd4e4f422b7
branch: feature/lesson-11
repository: ttrpg-handouts-generator
topic: "Access-control critical path — Phase 2 rollout research (Risks #1, #2)"
tags: [research, middleware, auth, share-token, rls, access-control, integration-testing]
status: complete
last_updated: 2026-06-06
last_updated_by: Claude (Sonnet 4.6)
---

# Research: Access-control critical path (Risks #1, #2)

**Date**: 2026-06-06T09:49:00+02:00
**Researcher**: Claude (Sonnet 4.6)
**Git Commit**: 86ea5531b48677e6e33b07f37210bfd4e4f422b7
**Branch**: feature/lesson-11
**Repository**: ttrpg-handouts-generator

## Research Question

Ground rollout Phase 2 of `context/foundation/test-plan.md`. Verify and correct risk response guidance for Risks #1 and #2; locate failure paths in code; identify cheapest useful test layer; flag speculative risks or misleading evidence.

---

## Summary

**Risk #1 (auth middleware gating) is fully grounded and non-speculative.** The real gap is confirmed: zero automated tests cover the middleware redirect behavior, `locals.user` population, or the authenticated routing path — all of which exist in live code at `src/middleware.ts`. The Phase 1 `makeContext` + handler-import pattern does **not** apply here. A new middleware context stub is required.

**Risk #2 (anonymous share-token read) is fully grounded and non-speculative.** The implementation is correct by design: `src/pages/share/[token].astro` queries with `status IN ('published', 'archived')`, returns HTTP 404 for missing tokens, and `/share/*` is intentionally outside the auth gate. The gap is zero automated tests. The `.astro` page cannot be imported as a handler — Phase 1 harness pattern does not apply. The recommended approach is to test the DB query layer directly using a raw anon Supabase client against real RLS + admin fixtures (no mock needed for the DB path; the mock seam is still useful for the page's Astro.cookies path).

**No risks should be dropped or reframed.** Both were grounded by interview and PRD; code confirms the failure paths exist.

**One response-guidance correction for Risk #2:** the test plan listed "likely cheapest layer: integration (DB-backed)" — this is confirmed correct, but the method must be direct anon-client DB query (not page-level invocation), because `.astro` pages cannot be unit-imported. This is a method clarification, not a risk correction; §2 Source column needs no change.

---

## Detailed Findings

### Risk #1 — Auth middleware / route gating

#### Entry point and PROTECTED_ROUTES

`src/middleware.ts` — single `onRequest` export via `defineMiddleware`, runs on every request.

```6:30:src/middleware.ts
const PROTECTED_ROUTES = ['/dashboard', '/handouts'];

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient(context.request.headers, context.cookies);

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    context.locals.user = user ?? null;
  } else {
    context.locals.user = null;
  }

  if (context.locals.user && context.url.pathname === '/') {
    return context.redirect('/dashboard');
  }

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect('/auth/signin');
    }
  }

  return next();
});
```

- `PROTECTED_ROUTES = ['/dashboard', '/handouts']` — prefix matching via `startsWith`.
- All routes under `/handouts/*` (including `/handouts/new`) are gated. `/share/*` is explicitly excluded by comment at line 4–5.
- Redirect to `/auth/signin` with **302** (Astro `context.redirect()` default, no custom status passed).
- Authenticated user on `/` → **302** → `/dashboard`.
- No `returnUrl` preserved.

#### locals.user population

`supabase.auth.getUser()` result `user` coerced with `?? null` → `context.locals.user`. The `error` field is **never read** (lines 12–15). On any Supabase error (transient failure, invalid JWT), `user` is typically `undefined` → coerced to `null` → treated as anonymous → **silently redirected to sign-in** (fail-closed for page gating, but a silent lockout for valid GMs). No log is written.

Type declaration in `src/env.d.ts:1–5`: `user: import('@supabase/supabase-js').User | null`.

#### Supabase client used in middleware

`src/lib/supabase.ts` — single export `createClient(requestHeaders, cookies)`. Uses `@supabase/ssr` `createServerClient`. Reads session from raw `Cookie` header via `parseCookieHeader`. Returns `null` when `SUPABASE_URL`/`SUPABASE_KEY` are missing (both are `optional: true` in `astro.config.mjs:19–20`) — which means a misconfigured environment locks all users out silently.

#### Pages that rely on middleware

- `src/pages/dashboard.astro` — reads `Astro.locals.user` for display only (line 4); **no secondary auth check**; trusts middleware entirely.
- `src/pages/handouts/new.astro` — **zero frontmatter auth logic** (lines 1–8); renders `HandoutEditor` with no guard. Full editor is exposed if middleware is bypassed.
- API routes (`/api/handouts/*`) self-gate with `getUser()` → 401; they are **not in `PROTECTED_ROUTES`** and do not rely on middleware for blocking.

#### Cookie / session flow

Sign-in POST → `signin.ts:19` redirects to `/` → middleware sees authed user → redirects to `/dashboard`. Two-hop. Cookies set implicitly by `@supabase/ssr` `setAll` through `context.cookies.set`.

#### Existing tests for Risk #1

**None.** No middleware, redirect, or `locals.user` tests exist in the repo. Phase 1 integration suites explicitly bypass the cookie SSR path (`test-plan.md:201`, `handout-ownership.integration.test.ts:11–12`).

#### Failure path (verified)

Anonymous `GET /handouts/new`:
1. `createClient(headers, cookies)` — no session cookie → `getUser()` → `user = null`
2. `locals.user = null`
3. `startsWith('/handouts')` matches → `context.redirect('/auth/signin')` [302]
4. `handouts/new.astro` never reached

Authenticated `GET /dashboard`:
1. Session cookie present → `getUser()` → `User` object
2. `locals.user = User`
3. Protected check passes
4. `next()` → page renders

#### Risk #1 gaps (failure scenarios for tests to cover)

| Gap | Evidence |
|-----|----------|
| `getUser()` errors silently treated as "signed out" | `middleware.ts:12–15`; no error field read |
| `startsWith` is broad — new route outside `/dashboard`/`/handouts` would be ungated | `middleware.ts:6`; two-item list |
| Optional env vars → silent "everyone anonymous" | `astro.config.mjs:19–20`, `supabase.ts:6–8` |
| `handouts/new.astro` has no page-level defense in depth | `handouts/new.astro:1–8` |
| No `returnUrl` preserved on redirect | `middleware.ts:26` |

---

### Risk #2 — Anonymous share-token read path

#### Share page route

`src/pages/share/[token].astro` — token from `Astro.params.token` (line 16). Not in `PROTECTED_ROUTES` (confirmed; middleware comment at lines 4–5).

Query (lines 26–31):

```26:31:src/pages/share/[token].astro
const { data, error } = await supabase
  .from('handouts')
  .select('title, markdown_content, background_category')
  .eq('share_token', token)
  .in('status', ['published', 'archived'])
  .single();
```

Selects only `title`, `markdown_content`, `background_category` — no `id`, `gm_id`, `tags`, or timestamps exposed to the page.

#### Status filtering — link-permanence

Both `'published'` and `'archived'` are included in the `.in()` filter. This matches the PRD link-permanence NFR. An archived handout's share link remains live for players. **This design is correct and intentional.**

**Gap:** Archive transition (`status = 'archived'`) is not implemented in app code yet — S-04 (`delete-handout`) is `proposed`, not shipped. The DB schema and read path are ready; the write path is not. Tests for archived link permanence must insert `archived` rows directly via admin client.

#### HTTP status for missing/invalid tokens

```33:47:src/pages/share/[token].astro
if (error) {
  if (error.code !== 'PGRST116') {
    console.error('DB error loading shared handout:', error);
  }
} else {
  handout = data;
}
// ...
if (!isConfigured) {
  Astro.response.status = 500;
} else if (!handout) {
  Astro.response.status = 404;
}
```

| Condition | Status | Body |
|-----------|--------|------|
| Token not found (PGRST116) | **404** | Generic HTML "Handout not found" — no schema leakage |
| Any other DB error | **404** (not 500) | Same generic HTML — real failures masquerade as "not found" |
| Supabase not configured | **500** | "Sharing unavailable" |
| Valid published/archived row | **200** | Handout content |

**Note:** Real DB errors (non-PGRST116) are logged server-side but return 404 to the client. This means a DB outage is invisible to the test unless the server log is inspected. Acceptable per-design (no schema leakage), but worth a brief comment in tests.

#### RLS policies — `anon_select_shared`

`supabase/migrations/20260528200000_create_handouts_table.sql:48–54`:

```sql
create policy "anon_select_shared"
  on handouts for select to anon
  using (status in ('published', 'archived') and share_token is not null);
```

- Permits both `published` and `archived` — matches app query.
- Does **not** enforce `share_token = $param` — that is the application's responsibility (`.eq('share_token', token)` at line 29 of the page). Without the app filter, the anon role could read **any** published/archived row with a non-null token. UUID unguessability is the practical mitigation; defense-in-depth would require a policy `USING (share_token = current_setting('request.jwt.claims')...)` which Supabase anon does not support easily. **This is a design trade-off, not a bug — document in tests, not a blocker.**
- `share_token` column is `uuid UNIQUE` (migration lines 17, 25) — unguessable by construction.

Other relevant policies:
- `gm_select_own` (`authenticated`, SELECT, `gm_id = auth.uid()`) — separate from player path.
- `gm_update_non_archived` — UPDATE blocked on archived rows, consistent with link-permanence.

#### GM vs player read paths

Completely distinct endpoints — no overlap:

| Audience | Route | Auth | Lookup |
|----------|-------|------|--------|
| Player | `GET /share/[token]` (Astro page) | None required | `share_token` |
| GM (write) | `POST/PUT /api/handouts/*` | Required (401 without session) | `id` + `gm_id` |

There is no `GET /api/handouts/[id]` for GM reads — GMs create/edit via `HandoutEditor` form only. The two paths do not share code or auth requirements.

#### Existing tests for Risk #2

**None.** No test exercises the anonymous token-read path, `anon_select_shared` RLS policy, or `/share/[token]` page behavior. The `unauthenticatedClient` in Phase 1 suites (`handout-ownership.integration.test.ts:111–113`) asserts API 401s only — never a share-token SELECT.

---

### Harness applicability for Phase 2

#### What is directly reusable

| Asset | Phase 2 use |
|-------|-------------|
| `vitest.config.ts` integration project | Add new suites under `src/integration/` — no config changes |
| `src/integration/setup-env.ts` | Unchanged — same Supabase bootstrap |
| `createAdminClient()` | Insert published/archived handouts as fixtures |
| `createTestUser` / `signInAsUser` | Risk #1 authed path tests |
| Unauthenticated anon client pattern | Risk #2 DB-layer tests, Risk #1 anonymous path |
| `vi.mock('@/lib/supabase')` | Any code that calls `createClient` from `@/lib/supabase` |
| `assertNoSchemaLeakage` | Error body assertions (JSON responses only) |

#### What is NOT reusable: `makeContext` + handler-import

**Risk #1 — Middleware:**

`src/middleware.ts` exports `onRequest` via `defineMiddleware`. It is callable directly, but requires a context object with `context.url.pathname`, `context.locals`, `context.redirect()`, and a callable `next()`. The existing `makeContext` stub (`context-stub.ts:3–33`) provides none of these — it targets API route handlers (`GET`/`POST` exports), not middleware.

**A new middleware context stub is needed** with:
- `url: { pathname: string }` (or a full `URL` object)
- `locals: Record<string, unknown>` (mutable)
- `redirect: (path: string) => Response` (return a real `Response` with `Location` header + 302)
- `next: () => Promise<Response>` (stub returning 200)
- `request: Request` (with `Cookie` header for authed path)
- `cookies` (Astro cookies stub — existing `{ get: vi.fn(), set: vi.fn() }` is sufficient for the mock seam)

`vi.mock('@/lib/supabase')` still applies — mock `createClient` to return anon client (anonymous path) or bearer-authenticated client (authed path). The key difference from Phase 1: the mock must return a client whose `getUser()` resolves correctly for the test scenario.

**Risk #2 — Share page:**

`src/pages/share/[token].astro` is an Astro component, not an importable JS handler. Phase 1's `import { POST } from '@/pages/api/...'` pattern does not apply.

**Two viable approaches (in order of cost × signal):**

1. **DB-layer integration test (recommended):** Use raw anon Supabase client (`createClient(supabaseUrl, anonKey)` from `@supabase/supabase-js`, no mock) directly against local Supabase + admin fixtures. Assert `.eq('share_token', token).in('status', [...])` returns expected rows for published, archived, and draft/unknown tokens. This exercises real RLS and the query shape without going through Astro. Does not test HTTP status codes or HTML rendering — a deliberate cost × signal trade-off (the page rendering path adds no new risk given the query + RLS is the contract).

2. **Extract and test helper:** Move the share query from the `.astro` frontmatter into `src/lib/services/share.ts` and test the extracted function. Slightly higher value (tests the actual app code path), but requires a small refactor. Recommended if plan concludes the query logic warrants isolation anyway.

3. **E2e (fallback only):** Per test-plan §104 and §130 — use only if neither of the above can prove Risk #2 at the integration layer.

---

## Code References

| File | Lines | Relevance |
|------|-------|-----------|
| `src/middleware.ts` | 1–31 | Full middleware — PROTECTED_ROUTES, locals.user, redirect behavior |
| `src/lib/supabase.ts` | 1–24 | SSR client factory — cookie reading, null on missing env |
| `src/env.d.ts` | 1–5 | `App.Locals` type — `user: User \| null` |
| `astro.config.mjs` | 10–22 | `output: 'server'`, env schema (optional secrets) |
| `src/pages/handouts/new.astro` | 1–8 | No page-level auth guard — fully middleware-reliant |
| `src/pages/dashboard.astro` | 4–14 | Reads `locals.user` for display; no redirect guard |
| `src/pages/api/auth/signin.ts` | 4–19 | Cookie set + redirect to `/` → middleware redirect to `/dashboard` |
| `src/pages/share/[token].astro` | 16–47 | Token extraction, query, 404/500 status logic |
| `supabase/migrations/20260528200000_create_handouts_table.sql` | 48–54 | `anon_select_shared` policy |
| `supabase/migrations/20260528200000_create_handouts_table.sql` | 31–33 | `gm_select_own` policy |
| `supabase/migrations/20260528200000_create_handouts_table.sql` | 9–25 | Column types — `share_token uuid unique`, `status` |
| `src/types.ts` | 1–19 | `Handout` interface — all 11 fields |
| `src/integration/helpers/context-stub.ts` | 3–33 | Existing stub — NOT usable for middleware (wrong shape) |
| `src/integration/helpers/test-users.ts` | 42–67 | `signInAsUser` → returns bearer client (not cookies) |
| `src/integration/handouts/handout-ownership.integration.test.ts` | 11–15 | Mock seam pattern reusable for Risk #1 |

---

## Architecture Insights

1. **Single-responsibility auth gate.** All page-level protection flows through `onRequest` in `src/middleware.ts`. API routes self-gate. Pages have zero defense in depth — a one-line change to `PROTECTED_ROUTES` or a middleware regression exposes all GM pages silently.

2. **Cookie SSR path is untested by design (Phase 1).** The mock seam (`vi.mock('@/lib/supabase')`) was intentional in Phase 1 to test handler + DB contracts without needing a live cookie flow. Phase 2 must break this assumption for Risk #1 — the test must exercise the actual cookie → `getUser()` → `locals.user` path.

3. **`signInAsUser` returns a bearer client, not cookies.** For middleware tests that need to simulate an authenticated request, the bearer token from `signInAsUser` must be injected as an `Authorization: Bearer <token>` header on the `Request` object passed to `createClient`. The cookie-based SSR path (`parseCookieHeader`) will not pick up a bearer token — middleware tests need either a real cookie or the `vi.mock` approach with a pre-built authed client.

4. **Archive transition is schema-ready, not app-ready.** S-04 (`delete-handout`) is `proposed`. Integration tests for archived link-permanence must insert `archived` rows directly via `createAdminClient()` — there is no app API to call.

5. **RLS `anon_select_shared` does not enforce token equality.** The policy permits any anon SELECT on published/archived rows with non-null `share_token`. The `.eq('share_token', token)` app-level filter is the only thing preventing enumeration. UUID unguessability is the practical guard; this is an accepted design trade-off documented in the migration comment.

---

## Risk Response Guidance — Verification and Corrections

### Risk #1

| Guidance field | Test plan says | Research verdict |
|----------------|---------------|-----------------|
| What would prove protection | Anonymous request to protected route is redirected; authenticated GM reaches dashboard; `locals.user` resolves correctly per request | **Confirmed correct.** Middleware lines 24–27 are the exact code path to exercise. |
| Must challenge | "an auth check exists" ≠ "every protected route is gated" | **Confirmed.** `PROTECTED_ROUTES` is a two-item list; a new route outside those prefixes would be ungated. |
| Context `/10x-research` must ground | middleware entry point, protected-route list, how `locals.user` is populated, CORS/header behavior | **Grounded.** All four items confirmed. CORS: no CORS-specific config found — Cloudflare Workers handles it at edge; no in-app CORS widening. |
| Likely cheapest layer | integration (request → redirect / locals shape) | **Confirmed.** Can be achieved by calling `onRequest` directly with a middleware context stub; no e2e needed. |
| Anti-pattern to avoid | mocking middleware internals instead of exercising the actual request path | **Confirmed critical.** The cookie SSR `createClient` call is the actual path; mocking it outright would make the test worthless for Risk #1. The mock must return a client whose `getUser()` behaves realistically (anon client → `user: null`; bearer client → `User`). |

**No corrections to §2 needed for Risk #1.**

### Risk #2

| Guidance field | Test plan says | Research verdict |
|----------------|---------------|-----------------|
| What would prove protection | Player loads published handout via valid token without login; archived-but-published link still resolves; unknown/invalid token returns clean 404 | **Confirmed correct.** All three behaviors are in live code. |
| Must challenge | "the GM read path works" ≠ "the anonymous token-read path works"; "archived" must not mean "gone for players" | **Confirmed.** GM path (`gm_select_own` RLS, authenticated) and player path (`anon_select_shared` RLS, unauthenticated) are completely distinct. |
| Context `/10x-research` must ground | share-token read path, RLS for anonymous token reads, which statuses the read path filters | **Grounded.** Query at `share/[token].astro:26–31`; RLS `anon_select_shared` at migration lines 52–54; statuses: `published` + `archived`. |
| Likely cheapest layer | integration (DB-backed) | **Confirmed correct, method clarified.** Direct anon-client DB query (not page invocation) is the cheapest approach. `.astro` page cannot be imported; extracting query to `src/lib/` is optional but worthwhile. |
| Anti-pattern to avoid | asserting only the happy GM path; over-mocking the DB so RLS is never exercised | **Confirmed critical.** Tests must use a real (un-mocked) Supabase anon client against local Supabase so RLS is actually exercised. Mocking would make the test tautological. |

**One method clarification for §2 Risk Response Guidance (not a source correction):** "integration (DB-backed)" means direct anon-client query, not Astro page invocation. Recommend backporting this to the Risk #2 `Context needed` cell: add "query logic lives in `share/[token].astro` frontmatter; tests target the DB query layer with a raw anon client, not the Astro page directly." Not a risk correction — no Source column change needed.

---

## Historical Context

- `context/archive/2026-06-03-testing-api-db-handout-coverage/` — Phase 1 harness. Established `vi.mock('@/lib/supabase')` pattern, `makeContext` stub, and the decision to bypass cookie SSR. Phase 2 deliberately extends beyond this pattern.
- `context/foundation/test-plan.md:201` — Phase 1 note: "`vi.mock('@/lib/supabase')` bypasses cookie SSR — integration tests prove handler + DB contracts, not middleware cookies." Phase 2 must break this assumption for Risk #1.
- `context/foundation/lessons.md` — "Always Assert Row Ownership at the Application Layer" (applied in Phase 1 ownership tests). Share page does not mutate rows — not applicable here.

---

## Open Questions

1. **Cookie injection for authenticated middleware tests.** `signInAsUser` returns a bearer-authenticated Supabase client, not session cookies. Middleware's `createClient` reads from `Cookie` header via `parseCookieHeader`. For a realistic cookie-based test, the integration suite either needs to: (a) sign in via Supabase auth and extract the actual `sb-*` session cookies from the response, or (b) use `vi.mock('@/lib/supabase')` and return a pre-built authed client (acceptable for middleware tests since the mock returns a client whose `getUser()` is the real Supabase `getUser` against a live session). Approach (b) is the simpler Phase 1 extension and avoids cookie parsing complexity. The plan should decide which to use.

2. **Extract share query or test DB layer directly?** Testing the DB layer directly (anon client `.eq('share_token', token)`) is simpler and exercises the real RLS contract. Extracting to `src/lib/services/share.ts` is a worthwhile refactor for testability but adds scope. The plan should pick one.

3. **Middleware `getUser()` error behavior.** The test plan could optionally add a scenario: mock `getUser()` to return an error → verify `locals.user = null` + redirect behavior (fail-closed semantics are implicit but untested). This is a "nice to have" — not required to prove Risk #1.
