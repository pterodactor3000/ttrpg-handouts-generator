# Access-Control Critical Path — Plan Brief

> Full plan: `context/changes/testing-access-control-critical-path/plan.md`
> Research: `context/changes/testing-access-control-critical-path/research.md`

## What & Why

Add integration tests for the two access-control paths that Phase 1 deliberately left uncovered: the auth middleware gate (Risk #1) and the anonymous share-token read path (Risk #2). Both have zero automated tests today; a one-line regression in either would expose GM pages to anonymous users or silently break player share links.

## Starting Point

Phase 1 established a handler-import + `vi.mock('@/lib/supabase')` harness for API route contracts. That pattern does not reach `src/middleware.ts` (uses `defineMiddleware`, not a route handler) or `src/pages/share/[token].astro` (Astro component, not importable). The DB helpers, mock seam, and Vitest integration project config are fully reusable.

## Desired End State

Two new integration suites are green against local Supabase. Middleware gating is locked by tests: anonymous requests to `/dashboard` and `/handouts/*` are redirected to `/auth/signin`; authenticated GMs reach protected pages with `locals.user` populated; `/share/*` is confirmed ungated. Share-token reads are locked by DB-layer tests: published and archived rows are readable by the anon role; draft rows and unknown tokens return no data; link-permanence survives archive status.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|-----------------|--------|
| Auth injection for middleware tests | `vi.mock('@/lib/supabase')` → pre-built bearer client | Avoids cookie-parsing complexity; mock returns real Supabase client so `getUser()` calls live auth | Plan |
| Share test approach | Direct anon-client DB query, no mock | Exercises real `anon_select_shared` RLS policy — mocking would make the test tautological | Research + Plan |
| Share query extraction | No extraction to `src/lib/services/` | Out of scope; direct DB query proves the contract with less added scope | Plan |
| `getUser()` error scenario | Excluded | Fail-closed behavior is implicit in the anonymous-path tests; not worth added mock complexity | Plan |

## Scope

**In scope:**
- New helper `src/integration/helpers/middleware-context-stub.ts`
- New suite `src/integration/middleware/auth-gate.integration.test.ts` (Risk #1)
- New suite `src/integration/share/share-token-read.integration.test.ts` (Risk #2)

**Out of scope:**
- Astro page HTML rendering or HTTP status-code testing for the share page
- Extraction of share query to `src/lib/services/share.ts`
- E2e tests (integration layer proves both risks)
- Changes to existing Phase 1 suites or helpers

## Architecture / Approach

**Phase 1 (middleware):** Import `onRequest` from `@/middleware`; call it with a minimal context stub (`url`, `locals`, `request`, `cookies`, `redirect()`, `next()`). Mock `createClient` to return an anon client (anonymous scenarios) or a bearer-authed client built via `signInAsUser` (authenticated scenarios). Assert on the returned `Response` for redirects and on `next` invocation for pass-throughs. Covers 8 scenarios across anonymous, authenticated, and public paths.

**Phase 2 (share-token):** No mock. Use `createClient(url, anonKey)` from `@supabase/supabase-js` directly; mirror the page's query (`.eq('share_token', token).in('status', ['published', 'archived']).single()`). Admin-insert fixtures for each scenario including `status: 'archived'` directly (archive write path not yet implemented). Covers 5 scenarios: published, archived, draft, unknown token, null share_token.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|-----------------|----------|
| 1. Middleware context stub + auth-gate tests | Locks redirect behavior, `locals.user` population, and public-path bypass for Risk #1 | `onRequest` context shape must match Astro's `defineMiddleware` expectation exactly |
| 2. Share-token DB-layer tests | Locks RLS + query contract for Risk #2; proves link-permanence for archived rows | Archive status must be inserted via admin client (S-04 not shipped) |

**Prerequisites:** Local Supabase running (`npx supabase start`), `.env.test` populated.
**Estimated effort:** ~1 session across 2 phases.

## Open Risks & Assumptions

- `defineMiddleware` is assumed to be a type-level identity in Astro 6 — if it wraps the handler, `onRequest` may not be directly callable without an Astro runtime. Research confirmed this is safe; verify on first test run.
- `signInAsUser` bearer token requires live Supabase auth — if local Supabase is slow to issue tokens, `beforeAll` setup time will be higher than Phase 1.

## Success Criteria (Summary)

- `npm test -- --project integration` is green for all suites (Phase 1 + Phase 2 + no regressions)
- `locals.user` assertion returns a real Supabase `User` object with non-null `id` and `email`
- Archived-handout test passes with a direct admin-inserted `status: 'archived'` row
