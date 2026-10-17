# Code review model comparison — handout-editor-migration

Generated: 2026-06-29T10:19:48.163Z

Fixture: `handout-editor-migration.diff` — class→hooks migration, duplicate API, dashboard drive-by, migration without RLS. 10 planted defects.

## Summary comparison

| Model | State | Merge blocked | Defects found | Defects missed | State correct | Score | Time |
|---|---|---|---|---|---|---|---|
| Composer 2.5 | fail | true | 10/10 | 0 | true | 11/11 | 29.9s |
| Gemini 3.5 Flash | fail | true | 9/10 | 1 | true | 10/11 | 58.9s |
| Sonnet 4.5 | fail | true | 9/10 | 1 | true | 10/11 | 57.6s |

## Cost & token usage

Measured via `Agent.prompt` `usage`. See caveats below.

| Model | Input | Cache read | Cache write | Output | Total | API list | + Token rate (Teams) | Wall time |
|---|---|---|---|---|---|---|---|---|
| Composer 2.5 | 119,957 | 97,024 | 0 | 3,582 | 220,563 | $0.0883 | $0.1435 | 55.9s |
| Gemini 3.5 Flash | 226,899 | 158,461 | 0 | 16,585 (+13,848 reasoning) | 401,945 | $0.1711 | $0.2716 | 82.6s |
| Sonnet 4.5 | 21,484 | 17,296 | 4,179 | 2,807 | 45,766 | $0.1274 | $0.1389 | 46.9s |

**Combined API list (3 runs):** $0.3869 · **Combined Teams estimate:** $0.5540

### Caveats

- **Quality vs cost runs are separate.** Scores, findings, and summary-table wall times come from the original model-comparison eval. Token counts and dollar estimates come from a later dedicated usage probe (`fetch-usage-costs.ts`) on the same fixture — not the same API calls.
- **Token counts vary per run.** The Cursor agent may loop with tools; input/cache totals differ between runs on identical prompts.
- **List prices, not your invoice.** Figures use published per-million-token rates from [Cursor models & pricing](https://cursor.com/docs/models-and-pricing). Actual billing depends on plan, pool, and on-demand settings.
- **Gemini 3.5 Flash rates assumed.** No separate 3.5 Flash row on the pricing page at time of measurement; costs use Gemini 3 Flash rates ($0.50/M input, $0.05/M cache read, $3/M output). Verify if Cursor bills 3.5 Flash differently.
- **Gemini reasoning tokens.** SDK reports `reasoningTokens` separately (13,848 on the probe run). Whether Cursor bills these inside `outputTokens` or at another rate is not confirmed; the table shows them for visibility only.
- **Teams vs Pro / Individual.** "+ Token rate (Teams)" adds Cursor's $0.25/M on all tokens (input, output, cache). Pro Individual may not apply this surcharge; Composer 2.5 on paid plans often draws from the Auto+Composer pool and may not consume API credits at list price.
- **Planted-defect detection is fuzzy.** The detection matrix matches findings to planted defects via keyword regex on title/description, not exact finding `id`. A "yes" means semantic overlap, not identical labels.
- **Sonnet model id.** Cursor API expects `claude-sonnet-4-5` (hyphen before patch), not `claude-sonnet-4.5`.


## Methodology caveats

- **Default PR state is FAIL** per `context/foundation/code-review-policy.md`; all models correctly returned `fail` with `mergeBlocked: true`.
- **A1 and A6** are `not_assessed` in evals (CI and E2E not verifiable from diff alone).
- **Fixture is synthetic.** The diff is a stub for eval, not a real branch; models review the diff text only unless the agent reads additional workspace context.


## Planted defect detection matrix

| Planted defect | Composer 2.5 | Gemini 3.5 Flash | Sonnet 4.5 |
|---|---|---|---|
| stale-effect-empty-deps | yes | yes | yes |
| swallowed-render-error | yes | no | yes |
| hardcoded-service-role-key | yes | yes | yes |
| missing-auth-check | yes | yes | yes |
| unvalidated-request-body | yes | yes | yes |
| leaked-stack-trace | yes | yes | yes |
| missing-prerender-false | yes | yes | yes |
| drive-by-dashboard-layout | yes | yes | yes |
| migration-without-rls | yes | yes | yes |
| no-duplicate-route-tests | yes | yes | no |

## Acceptance criteria

| ID | Composer 2.5 | Gemini 3.5 Flash | Sonnet 4.5 |
|---|---|---|---|
| A1 | not_assessed | not_assessed | not_assessed |
| A2 | not_met | not_met | not_met |
| A3 | not_met | not_met | not_met |
| A4 | met | met | met |
| A5 | not_met | not_met | not_met |
| A6 | not_assessed | not_assessed | not_assessed |

## Finding counts by criterion

| Criterion | Composer 2.5 | Gemini 3.5 Flash | Sonnet 4.5 |
|---|---|---|---|
| correctness | 3 | 2 | 4 |
| repo_idioms | 2 | 2 | 2 |
| minimal_scope | 2 | 1 | 2 |
| test_coverage | 1 | 1 | 0 |
| security | 8 | 4 | 5 |

| Severity | Composer 2.5 | Gemini 3.5 Flash | Sonnet 4.5 |
|---|---|---|---|
| bug | 8 | 7 | 5 |
| risk | 5 | 1 | 4 |
| nit | 3 | 2 | 3 |
| question | 0 | 0 | 1 |

---

## Composer 2.5

**Overall score:** 11/11 (100%)
**State:** fail · mergeBlocked: true
**Findings:** 16
**Cost (this run):** API list $0.0883 · Teams est. $0.1435 · 220,563 tokens

Multiple blocking security issues in the duplicate API (hardcoded service-role key, no auth, client-supplied gmId, leaked internals), A2 violations (missing prerender=false, migration without RLS), a preview-panel regression from an empty useEffect dependency array, unrelated dashboard edits, and no tests for the new route.

**Findings:**

- **hardcoded-service-role-key** (bug/security) — Service role JWT committed in source. duplicate.ts defines SERVICE_ROLE_KEY as a literal string constant. Secrets must not live in source or client bundles; a committed key bypasses all RLS and grants full database access if the repo or build artifacts leak. Fix: Remove the constant. Use the authenticated SSR client pattern from sibling routes (archive.ts, publish.ts) with createClient(context.request.headers, context.cookies) and rely on RLS. If a service role is ever required, load it from astro:env/server or a server-only env var.
- **service-role-bypasses-rls** (bug/security) — Duplicate route bypasses RLS via service role client. Passing supabaseKey: SERVICE_ROLE_KEY to createClient elevates every request to service-role privileges. Any caller who can hit this endpoint can read and insert any handout row regardless of ownership, defeating the handouts RLS policies. Fix: Use the session-scoped client without a service-role override. Let RLS enforce gm_id = auth.uid() on select and insert, matching archive.ts and publish.ts.
- **no-auth-on-duplicate-route** (bug/security) — Duplicate endpoint has no authentication check. Unlike every sibling handout API route, duplicate.ts never calls supabase.auth.getUser() or returns 401 for unauthenticated callers. Combined with the service-role client, the endpoint is effectively open. Fix: Add the standard auth guard: getUser(), return 401 if no user, and scope all queries to that user.
- **client-supplied-gmid** (bug/security) — gm_id taken from unvalidated request body. The insert uses body.gmId from the client instead of the authenticated user id. An attacker can create handouts owned by another GM. There is no zod schema validating the body. Fix: Derive gm_id from user.id after auth. If a body is needed at all, validate it with zod; never accept gmId from the client.
- **no-source-ownership-check** (bug/security) — Source handout read is not scoped to caller. The source SELECT filters only by handout id, not by gm_id. With service-role access any handout can be copied; even with RLS fixed, the application should assert ownership explicitly per lessons.md patterns. Fix: After auth, select with .eq('id', handoutId).eq('gm_id', user.id).single() and return 404 when no row matches.
- **leaked-stack-trace-404** (bug/security) — 404 response includes stack trace. The not-found response embeds stack: new Error().stack, leaking server file paths and internal call structure to clients. Fix: Return a generic JSON error such as { error: 'Not found' } with status 404, matching sibling routes.
- **leaked-error-details-500** (risk/security) — 500 response exposes raw Supabase error object. The error handler returns details: error containing the full Supabase/PostgREST error payload, which can expose schema hints, constraint names, or SQL fragments. Fix: Log the error server-side (and capture with Sentry per sibling routes) but return a generic { error: 'Failed to duplicate handout' } message.
- **missing-rls-on-audit-table** (bug/security) — New handout_duplicates_log table has no RLS. The migration creates public.handout_duplicates_log but never runs ALTER TABLE ... ENABLE ROW LEVEL SECURITY or defines per-operation policies. This violates the hard rule for new Supabase tables and leaves the audit log readable/writable according to default grants. Fix: Enable RLS and add granular policies (e.g. authenticated insert/select scoped to the GM who owns the source handout). Follow the pattern in 20260528200000_create_handouts_table.sql.
- **missing-prerender-false** (nit/repo_idioms) — Duplicate API route missing prerender = false. Every existing handout API route exports prerender = false. The new duplicate.ts omits it, risking static prerender of a dynamic POST handler. Fix: Add export const prerender = false; immediately after imports, matching archive.ts.
- **stale-useeffect-deps** (bug/correctness) — Preview panel does not re-render when props change. useEffect has an empty dependency array [] while the class component previously re-rendered when markdownContent or backgroundCategory changed. Editing markdown or switching background in the editor will leave stale preview HTML and skip onSaveSnapshot updates. Fix: Set the dependency array to [markdownContent, backgroundCategory, onSaveSnapshot] (or memoize onSaveSnapshot upstream and omit it). Preserve the cancellation guard.
- **swallowed-render-errors** (risk/correctness) — renderHandoutHtml failures are silently swallowed. .catch(() => {}) discards all render errors. The panel stays at opacity-50 with empty HTML and the user receives no feedback; failures are invisible in logs. Fix: Log or report the error (Sentry/console) and optionally set an error state for UI feedback. Do not use an empty catch.
- **missing-zod-and-uuid-validation** (risk/repo_idioms) — Duplicate route skips zod input validation. Sibling routes validate handout id with z.uuid().safeParse and return 400 on failure. duplicate.ts accepts context.params.id and request.json() without validation, inconsistent with established API patterns. Fix: Validate handoutId with z.uuid(), guard missing id with 400, and parse the body with a zod schema if any fields are required.
- **audit-log-table-unused** (risk/correctness) — Audit log migration is never written to. The PR adds handout_duplicates_log for auditing duplicated handouts, but duplicate.ts never inserts a row after a successful copy. The stated audit purpose is unfulfilled. Fix: Insert into handout_duplicates_log (source_handout_id, duplicate_handout_id) in the same transaction as the handout insert, or remove the migration from this PR if auditing is deferred.
- **dashboard-unrelated-layout-change** (nit/minimal_scope) — Unrelated dashboard layout change. Adding max-w-6xl to the dashboard main element is outside the stated scope of migrating HandoutPreviewPanel and adding the duplicate route. Fix: Revert the max-w-6xl change or move it to a separate PR with its own roadmap entry.
- **misleading-sorted-imports-comment** (nit/minimal_scope) — Drive-by comment with no functional change. The '// sorted imports' comment on an unchanged import line is a no-op drive-by edit unrelated to the PR intent. Fix: Remove the comment; revert the import line to its prior form.
- **no-integration-tests-duplicate-route** (risk/test_coverage) — No tests for duplicate API route. A new auth- and RLS-sensitive POST endpoint has no integration tests covering allow/deny paths, 404 for foreign handouts, or successful copy response shape. Policy expects specific assertions for new API routes. Fix: Add integration tests under the integration project: authenticated owner can duplicate, non-owner gets 404, unauthenticated gets 401, response body toEqual({ id: expect.any(String) }).

---

## Gemini 3.5 Flash

**Overall score:** 10/11 (91%)
**State:** fail · mergeBlocked: true
**Findings:** 10
**Cost (this run):** API list $0.1711 · Teams est. $0.2716 · 401,945 tokens

The PR fails the review due to critical security vulnerabilities (hardcoded service role key, authentication and RLS bypass, leaked internals, and missing RLS on the new table), a major correctness bug (stale preview due to an empty useEffect dependency array), missing input validation, lack of integration tests, and out-of-scope changes.

**Missed:** swallowed-render-error

**Findings:**

- **hardcoded-service-role-key** (bug/security) — Hardcoded Supabase service role key. The API route hardcodes a Supabase service role key ('SERVICE_ROLE_KEY'). Hardcoding secrets in source code is a critical security vulnerability that can lead to unauthorized database access. Fix: Remove the hardcoded key and retrieve the service role key securely using environment variables or 'astro:env/server' if a service role client is strictly necessary.
- **rls-and-auth-bypass** (bug/security) — Bypassing authentication and Row Level Security. The duplicate API route uses the Supabase service role client to fetch and insert handouts, bypassing Row Level Security (RLS). Furthermore, the endpoint does not perform any authentication checks on the requesting user or validate that they own the source handout or that the target 'gmId' matches their own identity. This allows any unauthenticated user to read and duplicate arbitrary handouts. Fix: Use the user's authenticated Supabase client (initialized with their session headers/cookies) to perform the select and insert operations so that RLS is naturally enforced. If a service role client is required, manually verify the user's session and check ownership of the source handout before proceeding.
- **missing-rls-on-new-table** (bug/security) — Missing Row Level Security (RLS) on new table. The migration creates a new table 'public.handout_duplicates_log' but does not enable Row Level Security (RLS) or define any security policies. This leaves the table completely unprotected and open to unauthorized access. Fix: Add 'alter table public.handout_duplicates_log enable row level security;' to the migration, along with appropriate per-operation policies to restrict access.
- **leaked-internals** (bug/security) — Leaking internal stack traces and database error details. The duplicate API route returns 'new Error().stack' in the 404 response and the raw database error object 'details: error' in the 500 response. This leaks internal stack traces, directory structures, and database schema details to the client, increasing the application's attack surface. Fix: Remove 'stack' and 'details' from the public API responses. Log the errors on the server side and return generic, user-friendly error messages to the client.
- **stale-preview-effect** (bug/correctness) — Stale preview due to empty useEffect dependency array. The migrated 'HandoutPreviewPanel' component uses 'useEffect' with an empty dependency array '[]'. This causes the preview to only render once on mount. It will not update when 'markdownContent' or 'backgroundCategory' props change, breaking the primary functionality of the preview panel. Fix: Add 'markdownContent', 'backgroundCategory', and 'onSaveSnapshot' to the 'useEffect' dependency array so that the preview re-renders when they change.
- **missing-input-validation** (bug/correctness) — Missing input validation for API route. The duplicate API route parses the request body and route parameters but does not validate them. 'body.gmId' and 'context.params.id' are used directly without schema validation, which can lead to runtime errors or SQL injection/unexpected behavior if malformed data is sent. Fix: Define a Zod schema to validate both the route parameters (e.g. 'id' as a UUID) and the request body (e.g. 'gmId' as a UUID) before processing the request.
- **missing-prerender-false** (bug/repo_idioms) — Missing prerender directive on API route. The new API route '/api/handouts/[id]/duplicate.ts' does not export 'prerender = false'. In Astro SSR, dynamic API routes must explicitly export this directive to ensure they are rendered on-demand rather than pre-rendered at build time. Fix: Add 'export const prerender = false;' at the top of the API route file.
- **missing-integration-tests** (risk/test_coverage) — Missing integration tests for duplicate API route. The PR introduces a new API route '/api/handouts/[id]/duplicate.ts' and database table 'public.handout_duplicates_log' but does not include any integration tests to verify the duplication logic, error handling, or database interactions. Fix: Add integration tests under the appropriate test directory to cover the success and failure paths of the duplicate endpoint.
- **unrelated-changes-dashboard** (nit/minimal_scope) — Unrelated out-of-scope changes in dashboard page. The changes to 'src/pages/dashboard.astro' (sorting imports and adding the 'max-w-6xl' class to the main element) are completely unrelated to the stated scope of migrating the preview panel and adding the duplicate endpoint. Fix: Revert the changes to 'src/pages/dashboard.astro' and submit them in a separate PR if they are necessary.
- **missing-jsdoc** (nit/repo_idioms) — Missing JSDoc on migrated component. The migrated 'HandoutPreviewPanel' component is a shared/reusable component but lacks JSDoc documentation describing its purpose, props, and usage. Fix: Add JSDoc documentation for the 'HandoutPreviewPanel' component.

---

## Sonnet 4.5

**Overall score:** 10/11 (91%)
**State:** fail · mergeBlocked: true
**Findings:** 13
**Cost (this run):** API list $0.1274 · Teams est. $0.1389 · 45,766 tokens

Critical security vulnerabilities (hardcoded service role key, missing RLS), major correctness bug (missing useEffect dependencies breaks preview updates), and scope violations. The migration itself is a good modernization but the useEffect is broken and the duplicate route has multiple security and correctness issues.

**Missed:** no-duplicate-route-tests

**Findings:**

- **hardcoded-service-role-key** (bug/security) — Hardcoded service role key in source code. SERVICE_ROLE_KEY is hardcoded as a string literal. This is a critical security vulnerability — the service role key bypasses RLS and grants full database access. If this code is committed, the key is exposed in version control forever. Fix: Load from environment variable: const SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY; Ensure the env var is never committed and is configured in deployment environment only.
- **missing-rls-policy** (bug/security) — New handout_duplicates_log table has no RLS policy. The migration creates a new table but does not enable RLS or define policies. Per A2 hard rules, all new tables require RLS. Without RLS, any authenticated user can read/write this audit log. Fix: Add: alter table public.handout_duplicates_log enable row level security; create policy "Users can view their own duplicate logs" on public.handout_duplicates_log for select using (source_handout_id in (select id from public.handouts where gm_id = auth.uid())); create policy "Service role can insert" on public.handout_duplicates_log for insert with check (true);
- **no-input-validation** (bug/security) — Unvalidated input in duplicate route. body.gmId is used directly without validation (type, presence, or authorization check). An attacker could pass any gmId and create handouts under another user's account. Fix: Validate that body.gmId matches the authenticated user: const user = await supabase.auth.getUser(); if (!user.data.user || user.data.user.id !== body.gmId) { return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 }); }
- **missing-useeffect-dependencies** (bug/correctness) — useEffect missing critical dependencies — preview will not update. The useEffect has an empty dependency array but uses markdownContent, backgroundCategory, and onSaveSnapshot. This means the preview renders only once on mount and never updates when the user edits content or changes background — breaking the core preview functionality. Fix: Add dependencies: }, [markdownContent, backgroundCategory, onSaveSnapshot]); If onSaveSnapshot causes unwanted re-renders, wrap it in useCallback at the call site.
- **swallowed-error** (risk/correctness) — Empty catch block silently swallows rendering errors. The .catch(() => {}) hides any errors from renderHandoutHtml. If rendering fails (e.g., invalid markdown, network issue), the user sees a blank preview with no indication of what went wrong. Fix: Log or display the error: .catch((err) => { console.error('Preview render failed:', err); if (!cancelled) setRenderedHtml('<p class="text-red-500">Failed to render preview</p>'); });
- **leaked-stack-trace** (risk/security) — Stack trace leaked in 404 response. new Error().stack exposes internal server paths and structure to clients. This is an information disclosure risk. Fix: Remove stack property: return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
- **leaked-error-details** (risk/security) — Internal error object leaked in 500 response. The entire Supabase error object (which may contain query details, internal IDs, or schema info) is sent to the client. Only safe, user-facing messages should be exposed. Fix: Return only error.message: return new Response(JSON.stringify({ error: error.message }), { status: 500 });
- **no-handout-id-validation** (risk/correctness) — No validation of handoutId parameter. handoutId is used directly in the query without checking if it's a valid UUID. While Supabase may handle this, explicit validation provides a better error message and prevents potential injection-style issues. Fix: Validate before use: if (!handoutId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(handoutId)) { return new Response(JSON.stringify({ error: 'Invalid handout ID' }), { status: 400 }); }
- **missing-prerender-false** (bug/repo_idioms) — API route missing export const prerender = false. Per A2 hard rules, all API routes must explicitly disable prerendering. Without this, Astro 6 may attempt static generation at build time, causing runtime failures. Fix: Add after imports: export const prerender = false;
- **unrelated-styling-change** (nit/minimal_scope) — Unrelated max-w-6xl styling in dashboard.astro. This PR is about migrating the preview panel and adding duplicate functionality. The max-w-6xl constraint on the dashboard is unrelated and violates strict scope (A3). Fix: Remove max-w-6xl or move to a separate PR focused on dashboard layout improvements.
- **unnecessary-comment** (nit/minimal_scope) — Unnecessary // sorted imports comment. The comment adds no value and appears to be a leftover note. Comments should explain non-obvious intent, not narrate trivial facts. Fix: Remove the comment.
- **no-jsdoc-on-api-route** (nit/repo_idioms) — Missing JSDoc on reusable duplicate route handler. Per A5, reusable functions should have JSDoc. This API route is a public interface and should document its contract (request body shape, response, auth requirements). Fix: Add JSDoc: /** * Duplicates an existing handout. * @param context.params.id - UUID of source handout * @param context.request.body - { gmId: string } - ID of user who will own the duplicate * @returns 201 with { id: string } on success * @throws 404 if source handout not found * @throws 403 if user unauthorized */
- **no-audit-log-insert** (question/correctness) — Why create handout_duplicates_log table if it's never written to?. The migration adds an audit log table, but the duplicate route never inserts records into it. Is this table intended for future use, or is the insert missing from this PR? Fix: If the table should be used now, insert a log record after successful duplication. If it's for future use, consider adding it in a later PR when the logging is actually implemented.