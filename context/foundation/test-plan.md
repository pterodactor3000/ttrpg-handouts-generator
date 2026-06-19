# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-19 (Phase 7 in progress)

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the team
   is worried about X, and the failure would surface somewhere in <area>"
   carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents _what
   could fail_ and _why we believe it's likely_ — drawn from documents,
   interview, and codebase _signal_ (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src/`, `supabase/`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the _evidence that surfaced
this risk_ — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| #   | Risk (failure scenario)                                                                                                                                                        | Impact | Likelihood | Source (evidence — not anchor)                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | Auth middleware change exposes a protected route to anonymous users, or wrongly locks out / misroutes an authenticated GM                                                      | High   | High       | interview Q3; hot-spot `src/` (auth gate, 5 commits/30d); no middleware tests exist                                          |
| 2   | A player is denied a handout they should see — a valid share link returns access-denied or no content, including links that are still published but archived (link-permanence) | High   | High       | PRD FR-010/FR-011 + Business Logic; interview Q1; hot-spot `src/pages/share/`                                                |
| 3   | Malicious markdown renders an executable script (XSS) in the preview or shared read-only page                                                                                  | High   | Medium     | PRD guardrail (markdown safety); `lessons.md` (freeze unified processor); interview Q1; hot-spot `src/lib/` (10 commits/30d) |
| 4   | IDOR — an authenticated GM reads, updates, or deletes another GM's handout by id, breaching the privacy guardrail                                                              | High   | Medium     | PRD privacy guardrail; `lessons.md` (assert row ownership at app layer); hot-spot `src/pages/api/handouts/`                  |
| 5   | A handout state-machine transition breaks — publish fails to mint/keep a usable share token, or archive breaks the live link (link-permanence NFR)                             | High   | Medium     | PRD Business Logic + NFR link-permanence; hot-spot `src/pages/api/handouts/`                                                 |
| 6   | An API route trusts client input — missing server-side validation persists malformed or oversized data                                                                         | Medium | Medium     | `AGENTS.md` (validate input with zod); abuse lens (untrusted input / server-side parity); hot-spot `src/pages/api/handouts/` |
| 7   | A raw PostgREST/DB error is forwarded to the HTTP client, leaking table/column/constraint names                                                                                | Medium | Low        | `lessons.md` (never expose raw DB error messages); abuse lens (info leakage)                                                 |
| 8   | Migration or RLS policy change applies cleanly locally but breaks prod access patterns (GM CRUD fails, anonymous share read denied, or cross-owner access widened)           | High   | Medium     | interview Q2+Q3; hot-spot `supabase/migrations`                                                                            |

**Impact × Likelihood rubric.** High = user loses access/data/money or failure
is publicly visible / area changes weekly or already burned us. Medium =
feature degrades or workaround exists / touched occasionally or past bug
source. Low = cosmetic or stable, rarely touched.

Protect High × High first (Risks #1, #2). Risks #4 and #5 are High-impact ×
Medium-likelihood and follow once the harness exists.

**Cross-cutting note (dev/prod parity).** Interview Q2 ("works on my branch
locally but breaks in production") is environment divergence, not a single
testable defect. It is addressed by the §3 Phase 4 CI gate that runs the
suite against a realistic Supabase, not by a risk-specific test. Risk #8
covers RLS/migration prod-parity failures that surface as access-pattern
breaks after a clean migration apply. A cloud-provider outage (High impact ×
Very Low likelihood) belongs to observability/alerting, not a test, and is
deliberately omitted from the map.

### Risk Response Guidance

| Risk | What would prove protection                                                                                                                                                  | Must challenge                                                                                                               | Context `/10x-research` must ground                                                                    | Likely cheapest layer                           | Anti-pattern to avoid                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| #1   | Anonymous request to a protected route is redirected; authenticated GM reaches the dashboard; `locals.user` resolves correctly per request                                   | "an auth check exists" does not mean "every protected route is gated"; CORS/connection config must not silently widen access | middleware entry point, the protected-route list, how `locals.user` is populated, CORS/header behavior | integration (request → redirect / locals shape) | mocking middleware internals instead of exercising the actual request path                     |
| #2   | A player loads a published handout via a valid token without login; an archived-but-published link still resolves; an unknown/invalid token returns a clean 404              | "the GM read path works" does not mean "the anonymous token-read path works"; "archived" must not mean "gone for players"    | share-token read path, RLS for anonymous token reads, which statuses the read path filters             | integration (DB-backed)                         | asserting only the happy GM path; over-mocking the DB so RLS is never exercised                |
| #3   | A `<script>`, `onerror`, or `javascript:` payload is neutralized in rendered output, in both preview and shared view                                                         | "rehype-sanitize is installed" does not mean "it is wired and cannot be bypassed via raw HTML or link protocols"             | sanitize configuration, where/if raw HTML or links are allowed, preview-vs-shared rendering parity     | unit (pure renderer, adversarial inputs)        | asserting benign markdown only; snapshotting rendered HTML (brittle, breaks on trivial change) |
| #4   | Cross-owner read/update/delete does not persist changes; cross-owner PUT may return 500 with a generic error; cross-owner publish returns 404 when no row matches the caller | RLS alone is not sufficient — the application layer must also assert ownership (defense in depth)                            | the read/update/delete-by-id queries, the ownership filter, the RLS policy shape                       | integration (two-user fixture)                  | testing only the own-row happy path; trusting RLS without a cross-user case                    |
| #5   | Publish mints a usable share token and sets published state; archive hides the handout from the GM's active list but keeps the shared link live                              | "the status column changed" does not mean "the share link still works after archive"                                         | state transitions, share-token lifecycle, what each status filters in reads; archive endpoint (`POST /api/handouts/:id/archive`) exists — link-permanence is testable end-to-end through the app layer, not only via admin-inserted fixtures | integration                                     | asserting the status flip without verifying the link still resolves for a player               |
| #6   | A malformed, oversized, or missing-field payload is rejected with a clean error and nothing is persisted                                                                     | client-side validation is not server-side validation; the server must not trust the client                                   | the zod schemas at the route boundary and what they actually validate                                  | integration (boundary inputs)                   | mirroring the zod schema in the assertion instead of asserting observable behavior             |
| #7   | A forced DB failure returns a generic user-facing message; no table, column, or constraint name appears in the response body                                                 | a 500 response body may still leak PostgREST internals even when logging is correct                                          | the error-handling path, what is logged server-side vs returned to the client                          | integration (inject a failure)                  | asserting only the happy path; checking server logs instead of the HTTP response body          |
| #8   | On a fresh Supabase: GM own-row CRUD succeeds; anon share read succeeds for `published` + `archived`; anon read denied for `draft` + unknown token; cross-owner SELECT/UPDATE/DELETE all blocked | "migration ran without error" does not mean "policies enforce correctly"                                                     | which policies changed in recent migrations; `handouts` table role × operation matrix; whether `anon` and `authenticated` roles are scoped correctly in each policy | integration (fresh Supabase — CI already provides this) | testing only against a long-lived local DB with accumulated state; treating successful DDL migration as proof of correct access behavior |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| #   | Phase name                                            | Goal (one line)                                                                                                                      | Risks covered                                        | Test types  | Status      | Change folder                                                 |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------- | ----------- | ------------------------------------------------------------- |
| 1   | API + DB integration harness & handout-route coverage | Establish the reusable Supabase API test pattern and lock ownership, state-machine, validation, and error-leakage on `/api/handouts` | #4, #5 (#5 partial: publish happy path only), #6, #7 | integration | complete    | `context/archive/2026-06-03-testing-api-db-handout-coverage/` |
| 2   | Access-control critical path                          | Prove protected-route gating / authed routing and that a player loads a published-or-archived handout via a valid token              | #1, #2                                               | integration | complete    | `context/changes/testing-access-control-critical-path/`       |
| 3   | Markdown rendering safety                             | Prove malicious markdown is neutralized in both preview and shared output                                                            | #3                                                   | unit        | complete    | `context/changes/testing-markdown-rendering-safety/`          |
| 4   | Quality-gate wiring                                   | Run the test suite in CI so dev/prod-parity regressions are caught before merge                                                      | cross-cutting                                        | gates       | complete    | `context/archive/2026-06-06-testing-quality-gate-wiring/`     |
| 5   | Guide reconciliation                                  | Fix §4/§5/§6/§8 drift; add Risk #8 to risk map; no new tests                                                                       | #8 (map update)                                      | none        | complete    | `context/changes/test-plan-refresh-2026-06-19/`               |
| 6   | RLS + migration safety                                | Prove GM CRUD, anon share read, and cross-owner denial on fresh Supabase after migration                                             | #8                                                   | integration | not started | `context/changes/test-plan-refresh-2026-06-19/`               |
| 7   | E2E CI wiring                                         | Wire Playwright share-path into CI; flip §5 e2e gate to optional                                                                     | #2 (SSR)                                             | e2e         | not started | `context/changes/test-plan-refresh-2026-06-19/`               |

**Status vocabulary** (fixed): `not started` → `opened` (change folder
created) → `researched` → `planned` → `implementing` → `complete`.

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.

| Layer                        | Tool                                 | Version     | Notes                                                                                                                                                                                         |
| ---------------------------- | ------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unit + integration           | Vitest                               | 4.1.x       | `environment: 'node'`, `@vitejs/plugin-react`, `@` alias wired in `vitest.config.ts`                                                                                                          |
| component                    | @testing-library/react + jsdom       | 16.x / 29.x | present; used by the one existing organism test                                                                                                                                               |
| API + DB integration harness | Vitest `integration` project         | 4.1.x       | `vitest.config.ts` projects (`unit` excludes `__tests__/integration/**`); `setup-env.ts` loads **only** `.env.test` (copy from `.env.test.example`); requires local Supabase (`npx supabase start`) |
| e2e                          | Playwright                           | 1.60.x      | `testDir: './e2e'`, `npm run test:e2e`; chromium; `e2e/player-share-link.spec.ts` covers Risk #2 SSR layer (2 tests: published handout + unknown token)                                      |
| observability                | @sentry/astro + @sentry/cloudflare    | 10.57.x     | Astro integration + Cloudflare adapter; source maps uploaded at build (`npm run build`); DSN via `PUBLIC_SENTRY_DSN`                                                                         |
| accessibility                | none                                 | —           | not in scope for this rollout                                                                                                                                                                 |

**Stack grounding tools (current session):**

- Docs: Context7 MCP — available; use for current Astro 6 SSR endpoint testing, `@supabase/ssr` test setup, and Vitest config; checked: 2026-06-19
- Search: none (no Exa.ai / web-search MCP) — recommendations rely on local manifests/configs; checked: 2026-06-19
- Runtime/browser: Playwright MCP — available; e2e layer for the share SSR page (Risk #2 SSR layer); checked: 2026-06-19
- Provider/platform: Linear MCP + `gh` CLI — available; GitHub Actions CI (`.github/workflows/ci.yml`) runs lint, unit tests, and Supabase-backed integration tests on push/PR to `main`; checked: 2026-06-19

Use docs MCPs for current framework/library APIs and setup details. Do not
use MCP docs/search to infer code failure anchors; those belong in
per-phase `/10x-research`.

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required for §3 Phase N" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.

| Gate                 | Where                | Required?                                                               | Catches                                         |
| -------------------- | -------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| lint + typecheck     | local + CI           | required (`.github/workflows/ci.yml` on push/PR to `main`)              | syntactic / type drift                          |
| unit + integration   | local + CI           | required (CI starts local Supabase for integration project)             | logic regressions, API/DB contract breaks       |
| markdown-safety unit | local + CI           | required after §3 Phase 3                                               | sanitization regressions (XSS)                  |
| pre-prod smoke       | between merge + prod | optional                                                                | environment-specific (dev/prod parity) failures |
| e2e on share path    | CI on PR             | planned (optional) — flip to optional once §3 Phase 7 lands             | broken SSR player read path (Risk #2)           |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase N."

### 6.1 Adding a unit test

- **Location**: `__tests__/lib/` (or `__tests__/` next to the unit under test).
- **Naming**: `<module>.test.ts`.
- **Reference test**: `__tests__/lib/handout-renderer.test.ts`.
- **Run locally**: `npm test`.

### 6.2 Adding an integration test (API + DB)

**Prerequisites**

1. Start local Supabase: `npx supabase start`
2. Copy `.env.test.example` → `.env.test` and fill keys from `npx supabase status -o env`
3. Run integration tests only: `npm test -- --project integration`

**Layout**

- Suites: `__tests__/integration/handouts/*.integration.test.ts`
- Helpers: `__tests__/integration/helpers/` (`admin-client.ts`, `test-users.ts`, `context-stub.ts`, `assert-no-schema-leakage.ts`)
- Env bootstrap: `__tests__/integration/setup-env.ts` (loaded via `vitest.config.ts` integration project `setupFiles`)

**Pattern (handler import, not HTTP e2e)**

1. Import the route handler from `@/pages/api/...` (e.g. `POST` from `@/pages/api/handouts/index`).
2. At file top: `vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }))` — handlers receive a bearer-injected client; the cookie-based SSR path in `@/lib/supabase` is intentionally not exercised.
3. In `beforeAll`: create two test users via `createTestUser`, sign in with `signInAsUser`, and `vi.mocked(createAppSupabaseClient).mockImplementation` to return the signed-in client per user.
4. Use `createAdminClient()` for fixtures and DB assertions (service role).
5. Build requests with `makeContext({ body, rawBody, params, method })` — pass `rawBody` when testing malformed JSON.
6. Call the handler: `await handler(makeContext(...))`; assert `response.status` and body shape.
7. On every non-2xx body: `assertNoSchemaLeakage(JSON.stringify(body))` so PostgREST/table names never appear in responses.
8. Teardown: delete handouts by `gm_id` in `afterEach`; `deleteTestUser` for both users in `afterAll`.

**Reference suites**

- `__tests__/integration/handouts/handout-ownership.integration.test.ts` — Risk #4 (cross-owner PUT 500, publish 404, no mutation persisted)
- `__tests__/integration/handouts/handout-validation.integration.test.ts` — Risk #6 (zod boundaries, generic errors)

### 6.3 Adding a middleware integration test

**Prerequisites** — same as §6.2 (local Supabase + `.env.test`).

**Layout**

- Suite: `__tests__/integration/middleware/*.integration.test.ts`
- Helpers: `__tests__/integration/helpers/middleware-context-stub.ts` (`makeMiddlewareContext`), `astro-middleware-stub.ts` (Vitest alias for `astro:middleware`)

**Pattern (direct `onRequest` invocation)**

1. `vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }))` — return anon client for unauthenticated scenarios, `signInAsUser` client for authenticated ones.
2. Import `onRequest` from `@/middleware`.
3. Build context with `makeMiddlewareContext({ pathname })` — stub provides `redirect()` returning a real 302 `Response` and `next` as `vi.fn()`.
4. Call `await onRequest(ctx, ctx.next)`; assert redirect `status`/`Location` or `next` called + `locals.user` shape.

**Reference suite**: `__tests__/integration/middleware/auth-gate.integration.test.ts` — Risk #1 (protected routes, public routes, authed `/` → `/dashboard`).

### 6.4 Adding a share-token read integration test

**Prerequisites** — same as §6.2.

**Layout**

- Suite: `__tests__/integration/share/*.integration.test.ts`
- No `vi.mock` — use raw `createClient(url, anonKey)` from `@supabase/supabase-js` to exercise real RLS.

**Pattern (DB contract, not Astro page HTML)**

1. `createAdminClient()` for fixtures; `createTestUser` for `gm_id`.
2. Mirror the share-page query: `.eq('share_token', token).in('status', ['published', 'archived']).single()`.
3. Cover published, archived (archived status can be set via the archive endpoint (`POST /api/handouts/:id/archive`) or admin-inserted for setup speed), draft, unknown token, and `share_token IS NULL` cases.
4. Assert `PGRST116` + `data: null` for denied paths.

**Reference suite**: `__tests__/integration/share/share-token-read.integration.test.ts` — Risk #2.

### 6.5 Adding an e2e test

- **Location**: `e2e/*.spec.ts`
- **Run locally**: `npm run test:e2e` (requires `npm run dev` running; `e2e/auth.json` populated by `npx playwright test --project setup`)
- **Pattern**:
  1. `storageState: 'e2e/auth.json'` (set in `playwright.config.ts`) provides an authenticated GM session for tests that need it.
  2. For anonymous player tests: `browser.newContext()` without storageState, then `.goto('/share/<token>')`.
  3. Assert UI-visible outcomes (`getByRole`, `getByText`) — not internal DOM structure or styling.
  4. Do not snapshot rendered HTML or assert CSS classes — see §7.
- **Reference suite**: `e2e/player-share-link.spec.ts` — Risk #2 (SSR layer: published handout visible to anonymous player; unknown token returns not-found page).
- **When to add**: only when a risk cannot be proven without a browser (SSR page rendering, cookie-based redirect chains). The integration layer covers DB contracts and middleware logic; e2e adds only what integration cannot reach.

### 6.6 Adding a test for a new API endpoint

Follow §6.2 for harness setup, then add a focused suite under `__tests__/integration/handouts/` (or a new `__tests__/integration/<area>/` folder if the route is not handout-specific).

**Checklist per endpoint**

- Mock seam: `vi.mock('@/lib/supabase')` + inject signed-in client for the acting user
- Valid body: 2xx, expected JSON shape, optional admin read-back of persisted row
- Invalid / boundary inputs: missing fields, oversize strings, malformed JSON (`rawBody` on `makeContext`) — expect 4xx and no persistence
- Ownership (mutating routes): cross-user case with a second `createTestUser`; assert no row change via admin client; expect generic error (PUT may be 500, publish may be 404 — match live behavior, do not assume 403)
- Errors: `assertNoSchemaLeakage` on every error response body
- Fixtures: insert via admin client; delete by owner column in `afterEach`. See `__tests__/integration/handouts/archive-handout.integration.test.ts` and `delete-archived-handout.integration.test.ts` for state-machine transition patterns (status flip + side-effect assertions).

### 6.7 Adding a test for markdown / rendering safety

- **Location**: append new `it()` cases inside `describe('XSS payload stripping')` in `__tests__/lib/handout-renderer.test.ts` — do not create a separate file or component test (single XSS boundary via `renderHandoutHtml`).
- **Pattern**: call `renderHandoutHtml(adversarialInput)`; assert `not.toContain` for dangerous substrings (`<script>`, `onerror`, `javascript:`, etc.). Never snapshot rendered HTML.
- **When adding vectors**: cover protocol bypass variants (case, whitespace), inline HTML/SVG (`onload`), and pipeline-order contract (hljs markup present + no executable payload after highlight). GFM bare `javascript:` strings and `img src="javascript:..."` are supplementary guards.
- **Reference suite**: `__tests__/lib/handout-renderer.test.ts` — Risk #3.
- **Run locally**: `npm test -- --project unit`

### 6.8 Adding a test for archive/delete endpoints

- **Location**: `__tests__/integration/handouts/`
- **Harness**: same `vi.mock('@/lib/supabase')` seam as §6.2
- **Pattern**:
  1. Seed a handout in the target pre-condition state (e.g. `published` for archive test) via `createAdminClient()`.
  2. Call the route handler (`POST` from `@/pages/api/handouts/[id]/archive` etc.) via `makeContext`.
  3. Assert the status transition: read the row back via admin client, confirm new `status`.
  4. Assert side effects: for archive, confirm the share-token query still resolves (Risk #5 link-permanence); for delete-archived, confirm the row is gone and `assertNoSchemaLeakage` on any error body.
  5. Teardown in `afterEach` by `gm_id`.
- **Reference suites**:
  - `__tests__/integration/handouts/archive-handout.integration.test.ts` — Risk #5 partial (archive transition + link-permanence)
  - `__tests__/integration/handouts/delete-archived-handout.integration.test.ts` — state-machine enforcement (can only delete when archived)

### 6.9 Per-rollout-phase notes

(Optional. After each phase lands, `/10x-implement` appends a 2-3 line note
here capturing anything surprising the rollout phase taught.)

**Phase 1 (API + DB integration harness).** `vi.mock('@/lib/supabase')` bypasses cookie SSR — integration tests prove handler + DB contracts, not middleware cookies. `.env.test` is loaded only through `setup-env.ts`, not `.env` / `.dev.vars`. Cross-owner PUT returns 500 with a generic message by current design; publish cross-owner returns 404 — document observed status codes, do not treat 403 as the contract.

**Phase 2 (Access-control critical path).** Middleware tests call `onRequest` directly with `makeMiddlewareContext`; Vitest needs an `astro:middleware` alias stub. Share-token tests use a raw anon client (no mock) — RLS is the subject under test. Archived link-permanence fixtures can now use the archive endpoint; admin insertion remains valid for setup speed.

**Phase 3 (Markdown rendering safety).** All XSS cases live in one `renderHandoutHtml` unit suite — preview and shared pages share the same function, so component tests add no signal. Pipeline-order comment documents that `rehypeSanitize` must stay before `rehypeHighlight`. The hljs tokenization test documents that `alert(1)` may disappear via span splitting, not sanitizer removal — `<script>` absence is the security oracle.

**Phase 4 (Quality-gate wiring).** `.github/workflows/ci.yml` runs lint → unit → `supabase start` → integration on push/PR to `main` (not `master`). Map `API_URL` from `supabase status -o env` to `SUPABASE_URL` in `.env.test`; values are quoted — strip with `cut -d'"' -f2`. Fail the write step if any extracted var is empty. Cloudflare Pages handles build/deploy separately.

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5). Future
contributors should respect these unless the underlying assumption changes.

- **UI snapshot tests** — they break on the smallest markup/style change and catch nothing of value. Re-evaluate only if a specific rendered structure becomes a hard contract. (Source: Phase 2 interview Q5.)
- **Third-party library internals** (Supabase, `unified`/`remark`/`rehype`, Astro) — not our code to test; test our usage and wiring, not the dependency. (Source: Phase 2 interview Q5.)
- **Static theme assets** (the 3 fixed background images) and **pure styling / the UI restyle (S-05)** — presentational, no logic, low blast radius. Re-evaluate if styling gains conditional logic. (Source: Phase 2 interview Q5.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-19
- Stack versions last verified: 2026-06-19
- AI-native tool references last verified: 2026-06-19

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
