---
date: 2026-06-03T17:01:00+02:00
researcher: AI agent
git_commit: 1595a837d2389127458f2db546c4bd5daa38c192
branch: feature/lesson-11
repository: pterodactor3000/ttrpg-handouts-generator
topic: "API + DB integration harness & handout-route coverage — ground Risks #4, #5, #6, #7"
tags: [research, integration-testing, api-routes, supabase, rls, idor, state-machine, validation, error-handling]
status: complete
last_updated: 2026-06-03
last_updated_by: AI agent
---

# Research: API + DB Integration Harness & Handout-Route Coverage

**Date**: 2026-06-03T17:01:00+02:00
**Researcher**: AI agent
**Git Commit**: 1595a837d2389127458f2db546c4bd5daa38c192
**Branch**: feature/lesson-11
**Repository**: pterodactor3000/ttrpg-handouts-generator

## Research Question

Ground rollout Phase 1 of `context/foundation/test-plan.md`. Verify or correct the Risk Response Guidance for Risks #4 (IDOR), #5 (state-machine / link-permanence), #6 (server-side validation), and #7 (DB error leakage). Locate the real failure paths in code, identify the cheapest useful test layer, find the architectural seam for the integration test harness, and call out gaps that block or change the plan.

## Summary

All three handout API routes are implemented and mostly well-guarded. The cleanest integration harness approach is **direct handler import + minimal context stub + real local Supabase** (no HTTP server needed). Ownership checks are present in PUT and publish. DB errors are properly genericised. Validation covers the happy path but has a notable gap: empty strings pass POST/PUT. The **archive path does not exist yet** (S-04 is still proposed), so Risk #5 (archive link-permanence) can only be partially verified now. One significant finding: PUT returns `500` for a wrong-owner row (not `403`/`404`) — the test plan's stated expectation of "403/404" for Risk #4 needs a correction.

---

## Detailed Findings

### 1. API Route Surface

Three files handle all handout mutations:

| Route | File | Methods |
|-------|------|---------|
| `/api/handouts` | `src/pages/api/handouts/index.ts:1` | POST |
| `/api/handouts/[id]` | `src/pages/api/handouts/[id].ts:1` | PUT |
| `/api/handouts/[id]/publish` | `src/pages/api/handouts/[id]/publish.ts:1` | POST |

There is **no GET-by-id, no DELETE, and no archive/soft-delete route** in the codebase today. S-04 (delete-handout) is `proposed` in the roadmap but unimplemented.

All three routes: call `createClient(context.request.headers, context.cookies)`, guard against null client, call `supabase.auth.getUser()`, return `401` JSON if no user. They do **not** use `context.locals.user` — each re-resolves the session independently.

### 2. Risk #4 — IDOR (ownership at app layer)

**Actual behavior found:**

- `PUT /api/handouts/[id]` (`src/pages/api/handouts/[id].ts:67-71`): update query has `.eq('id', handoutId).eq('gm_id', user.id).eq('status', 'draft')`. If the row belongs to a different GM (or is published), Supabase returns `null` data — the route falls into the `if (error || !data)` branch and returns **`500` `{ error: 'Failed to save handout' }`**, not `403` or `404`.

- `POST /api/handouts/[id]/publish` (`src/pages/api/handouts/[id]/publish.ts:48-60`): the initial fetch includes `.eq('gm_id', user.id).eq('status', 'draft')`. A wrong-owner or wrong-status row returns `null` → **`404` `{ error: 'Handout not found or not in draft status' }`**. This is the correct behaviour.

**Correction to test plan Risk #4 guidance:** the plan stated "403/404, no mutation". The actual behaviour on PUT for a cross-owner attempt is **500** (not 403/404). The test should assert that no mutation is persisted — which is still correct — but the expected HTTP status for PUT is `500`, not `403`. This is a pre-existing design choice: the route collapses not-found and DB-error into a single 500. A future refinement could distinguish them, but for now the test must match reality.

**RLS double-protection confirmed:** `gm_update_non_archived` policy (`src/supabase/migrations/20260528200000_create_handouts_table.sql:43-47`) also enforces `gm_id = auth.uid()` at the DB level. App layer + RLS is defence in depth as required by `lessons.md`.

**No GET-by-id route exists:** the IDOR read-path test is limited to what is currently implemented. The player share page (`/share/[token].astro`) uses the token, not the id — so cross-GM reads by id are only a risk on future dashboard/detail routes.

### 3. Risk #5 — State-machine / link-permanence

**Publish flow confirmed** (`src/pages/api/handouts/[id]/publish.ts`):

1. Fetch row: `.eq('id', id).eq('gm_id', user.id).eq('status', 'draft')` → 404 if miss.
2. Manual non-empty checks on `title`, `markdown_content`, `background_category` → 422 if failing.
3. `crypto.randomUUID()` → `share_token`; `new Date().toISOString()` → `published_at`.
4. Update: `.eq('id', id).eq('gm_id', user.id).eq('status', 'draft')`.select('share_token')`.
5. Return `{ shareToken }` (camelCase in response, snake_case in DB).

**`archived` transitions not implemented yet.** No archive/delete route exists. S-04 is `proposed`. The `archived_at` column is in the schema and types but never written by any API route today. The `anon_select_shared` RLS policy (`supabase/migrations/...sql:49-52`) already covers `status IN ('published', 'archived')` — so the DB is ready, but the app layer code is not.

**Consequence for Phase 1 plan:** Risk #5 tests can verify:
- publish mints a valid `share_token` and sets `status = 'published'`
- double-publish of the same (now-published) row is rejected (status gate blocks it)

But the "archive hides from GM list but keeps link live" half of Risk #5 cannot be tested until S-04 lands. Plan sub-phases must note this explicitly.

### 4. Risk #6 — Server-side validation

**Zod schema** (identical in both `index.ts:7-12` and `[id].ts:7-12`):
```
title: z.string().max(300)           — no min(), empty string PASSES
markdownContent: z.string().max(50000) — no min(), empty string PASSES
backgroundCategory: z.enum(['fantasy', 'horror', 'scifi'])
tags: z.array(z.string().max(50)).max(20)
```

**Gap found:** Empty `title` and empty `markdownContent` pass POST and PUT validation. Only the publish route (`publish.ts:63-71`) rejects empty title/content at publish time. A draft with an empty title can be stored.

**UUID validation on path param:** `z.uuid().safeParse(handoutId)` is present in both `[id].ts:40-44` and `publish.ts:40-44`. Non-UUID id returns `400`.

**Missing field handling:** `safeParse` on a missing field — e.g. omitting `backgroundCategory` — returns a zod error (400). Completely invalid JSON returns `400` `'Invalid JSON body'` from the try/catch.

**No min-length enforcement on tags array items** (empty string tags would pass `z.string().max(50)`).

**Publish-time validation is manual, not zod:** `existingHandout.title.trim() === ''` — correct but different from the route-level pattern.

### 5. Risk #7 — DB error leakage

All three routes catch DB errors and return generic messages:

| Route | DB error message returned |
|-------|--------------------------|
| POST `/api/handouts` | `'Failed to save handout'` |
| PUT `/api/handouts/[id]` | `'Failed to save handout'` |
| POST `/api/handouts/[id]/publish` (fetch) | `'Handout not found or not in draft status'` |
| POST `/api/handouts/[id]/publish` (update) | `'Failed to publish handout'` |

All raw errors are logged via `console.error(...)` server-side. **No raw PostgREST messages are forwarded to the client.** This risk is mostly already mitigated. The test should verify the pattern holds under a forced failure — primarily valuable as a regression guard.

### 6. Supabase Client Wiring (test harness design)

`src/lib/supabase.ts` exports a single `createClient(requestHeaders: Headers, cookies: AstroCookies)` factory. It reads `Cookie` headers from `requestHeaders` and uses `@supabase/ssr`'s `parseCookieHeader`. It uses the **anon key** (`SUPABASE_KEY` from `astro:env/server`). There is no service-role client anywhere in the app code.

**The integration test architectural seam:** The routes import `createClient` from `@/lib/supabase`. The cleanest harness approach is:

1. **Mock `@/lib/supabase`** at the module level in vitest using `vi.mock('@/lib/supabase', ...)` to inject a pre-configured `SupabaseClient` instance.
2. **Create test user sessions** using the service-role key directly in test setup (`supabase.auth.admin.createUser()`), obtain a JWT/session token, and pass a pre-authenticated client into the mock.
3. **Import the handler function directly** and construct a minimal `context` object (`{ request, cookies, params, locals, url }`). The `cookies` object only needs `set()` — it's not read by the routes.
4. **Use a real local Supabase** (`npx supabase start`) so RLS policies execute — this is the only way to verify cross-owner blocking at the DB level.

**Environment concern:** `SUPABASE_URL` and `SUPABASE_KEY` are imported via `astro:env/server` in `supabase.ts:3`. This import will fail in vitest unless `astro:env/server` is mocked. Since the harness mocks `@/lib/supabase` entirely, this is avoided — the mock replaces the whole module before the env import resolves.

**Alternative approach (heavier):** use `astro dev` + `fetch` for true HTTP integration. Rejected as the cheapest layer per the test plan: handler import + mock seam is faster, doesn't require a running dev server, and still exercises RLS via real Supabase.

### 7. Existing Test Infrastructure

| File | Type | Pattern |
|------|------|---------|
| `src/lib/__tests__/handout-renderer.test.ts` | unit | pure function, no mocks, `toContain` on HTML strings |
| `src/components/organisms/__tests__/HandoutEditor.test.tsx` | component | jsdom override, RTL + userEvent, global fetch stub, window.location stub |

`vitest.config.ts` has `environment: 'node'`, `@vitejs/plugin-react`, `@` alias. No `setupFiles`, no global test helpers. The integration tests will fit in `node` environment (no DOM needed for API route tests).

No `@testing-library/jest-dom` setup file — the organism test imports it per-file (`import '@testing-library/jest-dom/vitest'`).

### 8. Schema / RLS Summary for Test Fixtures

| Policy | Role | Operation | Condition |
|--------|------|-----------|-----------|
| `gm_select_own` | authenticated | SELECT | `gm_id = auth.uid()` |
| `gm_insert_own` | authenticated | INSERT | `gm_id = auth.uid()` |
| `gm_update_non_archived` | authenticated | UPDATE | `gm_id = auth.uid() AND status <> 'archived'` |
| `anon_select_shared` | anon | SELECT | `status IN ('published','archived') AND share_token IS NOT NULL` |
| (none) | — | DELETE | No delete policy — soft-delete only via S-04 (not yet implemented) |

Test fixtures need: (a) a service-role Supabase client for direct INSERT/DELETE in setup/teardown, bypassing RLS; (b) two distinct test users (GM A and GM B) to test cross-owner cases; (c) a cleanup strategy (delete all rows created by test user IDs after each test/suite).

---

## Code References

- `src/pages/api/handouts/index.ts:7-12` — zod schema (POST): title max 300, no min
- `src/pages/api/handouts/index.ts:60-68` — insert with `gm_id: user.id`; generic error on fail
- `src/pages/api/handouts/[id].ts:65-71` — update with `.eq('gm_id', user.id).eq('status', 'draft')`; wrong owner → 500
- `src/pages/api/handouts/[id]/publish.ts:48-59` — fetch for publish: ownership + draft gate → 404 on miss
- `src/pages/api/handouts/[id]/publish.ts:62-74` — manual non-empty validation → 422
- `src/pages/api/handouts/[id]/publish.ts:76-78` — `crypto.randomUUID()` → `share_token`
- `src/lib/supabase.ts:1-23` — SSR client factory; returns null if env missing; no service-role client
- `supabase/migrations/20260528200000_create_handouts_table.sql:29-52` — all four RLS policies
- `vitest.config.ts:1-15` — node env, react plugin, @ alias

---

## Architecture Insights

**Handler-import pattern is viable.** Astro API route handlers are plain async functions with a typed `context` argument. Importing them directly and passing a stub context is idiomatic for vitest testing without a running server.

**The mock seam is `@/lib/supabase`.** All three routes import only `createClient` from that module. Mocking it cleanly decouples route logic from the real Supabase connection in non-integration tests, or allows injection of a pre-authenticated real client in integration tests.

**RLS exercises real security only with a real Supabase connection.** For Risk #4 (IDOR), the test must use a real local Supabase instance — an over-mocked DB would not catch a policy regression. The two-user fixture (GM A creates row, GM B tries to mutate it) is the minimum to exercise both the app-layer ownership filter and the RLS policy independently.

**`astro:env/server` is the main env hurdle.** It's used only in `supabase.ts`. Since the test harness mocks `@/lib/supabase` wholesale, `astro:env/server` never resolves and the env problem disappears. If future tests import `supabase.ts` directly, a vitest moduleNameMapper entry will be needed.

---

## Historical Context

- `context/archive/2026-05-28-handout-schema/plan.md` — RLS policy design; confirmed `anon_select_shared` covers `published` AND `archived` for link-permanence; no testing approach established.
- `context/archive/2026-05-30-first-handout-creation-and-sharing/plan.md` — confirmed `crypto.randomUUID()` for share token; vitest installed for renderer unit tests only; API integration tests explicitly not planned in that slice.
- `context/archive/2026-05-31-markdown-preview-and-parsing/plan.md` — no API/DB relevance; XSS tests established in handout-renderer.test.ts (relevant to Phase 3).

---

## Open Questions

1. **Wrong-owner PUT returns 500:** should this be addressed now (distinguish 404 from 500 in PUT) or treated as a known characteristic and tested as-is? The plan should assert "no mutation persisted" regardless of status code, but a comment noting the non-ideal 500 is warranted.

2. **S-04 timing:** Phase 1 cannot fully verify Risk #5 (archive link-permanence) until S-04 lands. The plan should scope Phase 1 Risk #5 tests to the publish half only and note the archive half as deferred.

3. **Service-role key in test env:** `npx supabase start` exposes a local service-role key. The test harness will need `SUPABASE_SERVICE_ROLE_KEY` in a `.env.test` (gitignored). Plan should specify this as a setup step.

4. **Empty-title/content gap in POST/PUT:** zod allows empty strings. This is a data-quality issue (not a security risk). Worth noting in a sub-phase comment — a future improvement could add `.min(1)` to the schema. Not a blocker for Phase 1 tests, but the test should not accidentally assert that empty strings are rejected at POST time (they aren't).

5. **`backgroundCategory` enum values:** API routes use `'fantasy' | 'horror' | 'scifi'` — confirmed consistent with DB ENUMs and `src/types.ts`. Test fixtures should use these exact values.
