# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-06 (Phase 4 opened)

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

**Impact × Likelihood rubric.** High = user loses access/data/money or failure
is publicly visible / area changes weekly or already burned us. Medium =
feature degrades or workaround exists / touched occasionally or past bug
source. Low = cosmetic or stable, rarely touched.

Protect High × High first (Risks #1, #2). Risks #4 and #5 are High-impact ×
Medium-likelihood and follow once the harness exists.

**Cross-cutting note (dev/prod parity).** Interview Q2 ("works on my branch
locally but breaks in production") is environment divergence, not a single
testable defect. It is addressed by the §3 Phase 4 CI gate that runs the
suite against a realistic Supabase, not by a risk-specific test. A
cloud-provider outage (High impact × Very Low likelihood) belongs to
observability/alerting, not a test, and is deliberately omitted from the
map.

### Risk Response Guidance

| Risk | What would prove protection                                                                                                                                                  | Must challenge                                                                                                               | Context `/10x-research` must ground                                                                    | Likely cheapest layer                           | Anti-pattern to avoid                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| #1   | Anonymous request to a protected route is redirected; authenticated GM reaches the dashboard; `locals.user` resolves correctly per request                                   | "an auth check exists" does not mean "every protected route is gated"; CORS/connection config must not silently widen access | middleware entry point, the protected-route list, how `locals.user` is populated, CORS/header behavior | integration (request → redirect / locals shape) | mocking middleware internals instead of exercising the actual request path                     |
| #2   | A player loads a published handout via a valid token without login; an archived-but-published link still resolves; an unknown/invalid token returns a clean 404              | "the GM read path works" does not mean "the anonymous token-read path works"; "archived" must not mean "gone for players"    | share-token read path, RLS for anonymous token reads, which statuses the read path filters             | integration (DB-backed)                         | asserting only the happy GM path; over-mocking the DB so RLS is never exercised                |
| #3   | A `<script>`, `onerror`, or `javascript:` payload is neutralized in rendered output, in both preview and shared view                                                         | "rehype-sanitize is installed" does not mean "it is wired and cannot be bypassed via raw HTML or link protocols"             | sanitize configuration, where/if raw HTML or links are allowed, preview-vs-shared rendering parity     | unit (pure renderer, adversarial inputs)        | asserting benign markdown only; snapshotting rendered HTML (brittle, breaks on trivial change) |
| #4   | Cross-owner read/update/delete does not persist changes; cross-owner PUT may return 500 with a generic error; cross-owner publish returns 404 when no row matches the caller | RLS alone is not sufficient — the application layer must also assert ownership (defense in depth)                            | the read/update/delete-by-id queries, the ownership filter, the RLS policy shape                       | integration (two-user fixture)                  | testing only the own-row happy path; trusting RLS without a cross-user case                    |
| #5   | Publish mints a usable share token and sets published state; archive hides the handout from the GM's active list but keeps the shared link live                              | "the status column changed" does not mean "the share link still works after archive"                                         | state transitions, share-token lifecycle, what each status filters in reads                            | integration                                     | asserting the status flip without verifying the link still resolves for a player               |
| #6   | A malformed, oversized, or missing-field payload is rejected with a clean error and nothing is persisted                                                                     | client-side validation is not server-side validation; the server must not trust the client                                   | the zod schemas at the route boundary and what they actually validate                                  | integration (boundary inputs)                   | mirroring the zod schema in the assertion instead of asserting observable behavior             |
| #7   | A forced DB failure returns a generic user-facing message; no table, column, or constraint name appears in the response body                                                 | a 500 response body may still leak PostgREST internals even when logging is correct                                          | the error-handling path, what is logged server-side vs returned to the client                          | integration (inject a failure)                  | asserting only the happy path; checking server logs instead of the HTTP response body          |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| #   | Phase name                                            | Goal (one line)                                                                                                                      | Risks covered                                        | Test types  | Status      | Change folder                                                 |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------- | ----------- | ------------------------------------------------------------- |
| 1   | API + DB integration harness & handout-route coverage | Establish the reusable Supabase API test pattern and lock ownership, state-machine, validation, and error-leakage on `/api/handouts` | #4, #5 (#5 partial: publish happy path only), #6, #7 | integration | complete    | `context/archive/2026-06-03-testing-api-db-handout-coverage/` |
| 2   | Access-control critical path                          | Prove protected-route gating / authed routing and that a player loads a published-or-archived handout via a valid token              | #1, #2                                               | integration | complete    | `context/changes/testing-access-control-critical-path/`       |
| 3   | Markdown rendering safety                             | Prove malicious markdown is neutralized in both preview and shared output                                                            | #3                                                   | unit        | complete      | `context/changes/testing-markdown-rendering-safety/`        |
| 4   | Quality-gate wiring                                   | Run the test suite in CI so dev/prod-parity regressions are caught before merge                                                      | cross-cutting                                        | gates       | change opened | `context/changes/testing-quality-gate-wiring/`                |

**Status vocabulary** (fixed): `not started` → `opened` (change folder
created) → `researched` → `planned` → `implementing` → `complete`.

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.

| Layer                        | Tool                                 | Version     | Notes                                                                                                                                                                                         |
| ---------------------------- | ------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unit + integration           | Vitest                               | 4.1.x       | `environment: 'node'`, `@vitejs/plugin-react`, `@` alias wired in `vitest.config.ts`                                                                                                          |
| component                    | @testing-library/react + jsdom       | 16.x / 29.x | present; used by the one existing organism test                                                                                                                                               |
| API + DB integration harness | Vitest `integration` project         | 4.1.x       | `vitest.config.ts` projects (`unit` excludes `src/integration/**`); `setup-env.ts` loads **only** `.env.test` (copy from `.env.test.example`); requires local Supabase (`npx supabase start`) |
| e2e                          | none yet — see §3 Phase 2 (optional) | —           | only if an access risk cannot be proven at the integration layer                                                                                                                              |
| accessibility                | none                                 | —           | not in scope for this rollout                                                                                                                                                                 |

**Stack grounding tools (current session):**

- Docs: Context7 MCP — available; use for current Astro 6 SSR endpoint testing, `@supabase/ssr` test setup, and Vitest config; checked: 2026-06-04
- Search: none (no Exa.ai / web-search MCP) — recommendations rely on local manifests/configs; checked: 2026-06-04
- Runtime/browser: cursor-ide-browser MCP — available; possible e2e/visual layer for the shared read-only page, to be used only if cheaper deterministic integration tests cannot catch the regression; checked: 2026-06-04
- Provider/platform: Linear MCP + `gh` CLI — available; relevant to §3 Phase 4 CI-gate wiring (GitHub Actions runs lint+build today); checked: 2026-06-04

Use docs MCPs for current framework/library APIs and setup details. Do not
use MCP docs/search to infer code failure anchors; those belong in
per-phase `/10x-research`.

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required for §3 Phase N" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.

| Gate                 | Where                | Required?                                                               | Catches                                         |
| -------------------- | -------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| lint + typecheck     | local + CI           | required (already wired)                                                | syntactic / type drift                          |
| unit + integration   | local + CI           | required after §3 Phase 4                                               | logic regressions, API/DB contract breaks       |
| markdown-safety unit | local + CI           | required after §3 Phase 3                                               | sanitization regressions (XSS)                  |
| pre-prod smoke       | between merge + prod | optional                                                                | environment-specific (dev/prod parity) failures |
| e2e on share path    | CI on PR             | optional — only if §3 Phase 2 cannot prove Risk #2 at integration layer | broken player read path                         |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase N."

### 6.1 Adding a unit test

- **Location**: `src/lib/__tests__/` (or `__tests__/` next to the unit under test).
- **Naming**: `<module>.test.ts`.
- **Reference test**: `src/lib/__tests__/handout-renderer.test.ts`.
- **Run locally**: `npm test`.

### 6.2 Adding an integration test (API + DB)

**Prerequisites**

1. Start local Supabase: `npx supabase start`
2. Copy `.env.test.example` → `.env.test` and fill keys from `npx supabase status -o env`
3. Run integration tests only: `npm test -- --project integration`

**Layout**

- Suites: `src/integration/handouts/*.integration.test.ts`
- Helpers: `src/integration/helpers/` (`admin-client.ts`, `test-users.ts`, `context-stub.ts`, `assert-no-schema-leakage.ts`)
- Env bootstrap: `src/integration/setup-env.ts` (loaded via `vitest.config.ts` integration project `setupFiles`)

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

- `src/integration/handouts/handout-ownership.integration.test.ts` — Risk #4 (cross-owner PUT 500, publish 404, no mutation persisted)
- `src/integration/handouts/handout-validation.integration.test.ts` — Risk #6 (zod boundaries, generic errors)

### 6.3 Adding a middleware integration test

**Prerequisites** — same as §6.2 (local Supabase + `.env.test`).

**Layout**

- Suite: `src/integration/middleware/*.integration.test.ts`
- Helpers: `middleware-context-stub.ts` (`makeMiddlewareContext`), `astro-middleware-stub.ts` (Vitest alias for `astro:middleware`)

**Pattern (direct `onRequest` invocation)**

1. `vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }))` — return anon client for unauthenticated scenarios, `signInAsUser` client for authenticated ones.
2. Import `onRequest` from `@/middleware`.
3. Build context with `makeMiddlewareContext({ pathname })` — stub provides `redirect()` returning a real 302 `Response` and `next` as `vi.fn()`.
4. Call `await onRequest(ctx, ctx.next)`; assert redirect `status`/`Location` or `next` called + `locals.user` shape.

**Reference suite**: `src/integration/middleware/auth-gate.integration.test.ts` — Risk #1 (protected routes, public routes, authed `/` → `/dashboard`).

### 6.4 Adding a share-token read integration test

**Prerequisites** — same as §6.2.

**Layout**

- Suite: `src/integration/share/*.integration.test.ts`
- No `vi.mock` — use raw `createClient(url, anonKey)` from `@supabase/supabase-js` to exercise real RLS.

**Pattern (DB contract, not Astro page HTML)**

1. `createAdminClient()` for fixtures; `createTestUser` for `gm_id`.
2. Mirror the share-page query: `.eq('share_token', token).in('status', ['published', 'archived']).single()`.
3. Cover published, archived (admin-inserted — no app archive endpoint yet), draft, unknown token, and `share_token IS NULL` cases.
4. Assert `PGRST116` + `data: null` for denied paths.

**Reference suite**: `src/integration/share/share-token-read.integration.test.ts` — Risk #2.

### 6.5 Adding an e2e test

- Not required — Phase 2 proved Risks #1 and #2 at the integration layer. Add e2e only if a future access risk cannot be proven without a browser.

### 6.6 Adding a test for a new API endpoint

Follow §6.2 for harness setup, then add a focused suite under `src/integration/handouts/` (or a new `src/integration/<area>/` folder if the route is not handout-specific).

**Checklist per endpoint**

- Mock seam: `vi.mock('@/lib/supabase')` + inject signed-in client for the acting user
- Valid body: 2xx, expected JSON shape, optional admin read-back of persisted row
- Invalid / boundary inputs: missing fields, oversize strings, malformed JSON (`rawBody` on `makeContext`) — expect 4xx and no persistence
- Ownership (mutating routes): cross-user case with a second `createTestUser`; assert no row change via admin client; expect generic error (PUT may be 500, publish may be 404 — match live behavior, do not assume 403)
- Errors: `assertNoSchemaLeakage` on every error response body
- Fixtures: insert via admin client; delete by owner column in `afterEach`

### 6.7 Adding a test for markdown / rendering safety

- **Location**: append new `it()` cases inside `describe('XSS payload stripping')` in `src/lib/__tests__/handout-renderer.test.ts` — do not create a separate file or component test (single XSS boundary via `renderHandoutHtml`).
- **Pattern**: call `renderHandoutHtml(adversarialInput)`; assert `not.toContain` for dangerous substrings (`<script>`, `onerror`, `javascript:`, etc.). Never snapshot rendered HTML.
- **When adding vectors**: cover protocol bypass variants (case, whitespace), inline HTML/SVG (`onload`), and pipeline-order contract (hljs markup present + no executable payload after highlight). GFM bare `javascript:` strings and `img src="javascript:..."` are supplementary guards.
- **Reference suite**: `src/lib/__tests__/handout-renderer.test.ts` — Risk #3.
- **Run locally**: `npm test -- --project unit`

### 6.8 Per-rollout-phase notes

(Optional. After each phase lands, `/10x-implement` appends a 2-3 line note
here capturing anything surprising the rollout phase taught.)

**Phase 1 (API + DB integration harness).** `vi.mock('@/lib/supabase')` bypasses cookie SSR — integration tests prove handler + DB contracts, not middleware cookies. `.env.test` is loaded only through `setup-env.ts`, not `.env` / `.dev.vars`. Cross-owner PUT returns 500 with a generic message by current design; publish cross-owner returns 404 — document observed status codes, do not treat 403 as the contract.

**Phase 2 (Access-control critical path).** Middleware tests call `onRequest` directly with `makeMiddlewareContext`; Vitest needs an `astro:middleware` alias stub. Share-token tests use a raw anon client (no mock) — RLS is the subject under test. Archived link-permanence fixtures are admin-inserted because S-04 archive endpoint is not shipped yet.

**Phase 3 (Markdown rendering safety).** All XSS cases live in one `renderHandoutHtml` unit suite — preview and shared pages share the same function, so component tests add no signal. Pipeline-order comment documents that `rehypeSanitize` must stay before `rehypeHighlight`. The hljs tokenization test documents that `alert(1)` may disappear via span splitting, not sanitizer removal — `<script>` absence is the security oracle.

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5). Future
contributors should respect these unless the underlying assumption changes.

- **UI snapshot tests** — they break on the smallest markup/style change and catch nothing of value. Re-evaluate only if a specific rendered structure becomes a hard contract. (Source: Phase 2 interview Q5.)
- **Third-party library internals** (Supabase, `unified`/`remark`/`rehype`, Astro) — not our code to test; test our usage and wiring, not the dependency. (Source: Phase 2 interview Q5.)
- **Static theme assets** (the 3 fixed background images) and **pure styling / the UI restyle (S-05)** — presentational, no logic, low blast radius. Re-evaluate if styling gains conditional logic. (Source: Phase 2 interview Q5.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-04
- Stack versions last verified: 2026-06-04
- AI-native tool references last verified: 2026-06-04

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
