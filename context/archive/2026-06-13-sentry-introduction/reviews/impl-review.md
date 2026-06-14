<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Sentry Introduction

- **Plan**: context/changes/sentry-introduction/plan.md
- **Scope**: Full plan (Phases 1–3)
- **Date**: 2026-06-14
- **Verdict**: NEEDS ATTENTION
- **Findings**: 1 critical, 4 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | FAIL |
| Scope Discipline | PASS |
| Safety & Quality | FAIL |
| Architecture | WARNING |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Findings

### F1 — Session replay records every browser session

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: sentry.client.config.ts:10
- **Detail**: Plan contract requires `replaysSessionSampleRate: 0` (errors-only replay). Implementation sets `1.0`, recording every session. HandoutEditor renders GM markdown in the DOM — replay will capture campaign handout content for all visitors, not just error cases. Contradicts desired end state ("Session Replay fires only on errors").
- **Fix**: Set `replaysSessionSampleRate: 0` and keep `replaysOnErrorSampleRate: 1.0`.
  - Strength: Matches plan contract and eliminates bulk PII/content capture.
  - Tradeoff: Lose replay context for non-error sessions (intentional per plan).
  - Confidence: HIGH — one-line change, plan is explicit.
  - Blind spot: None significant.
- **Decision**: FIXED

### F2 — `.cursor/mcp.json` not committed

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: .cursor/mcp.json (missing)
- **Detail**: Phase 3 contract requires project-level Sentry MCP config at `.cursor/mcp.json`. File absent from repo (`.cursor/` has skills/hooks only). Progress item 3.4 marked complete — manual verification may have used user-level MCP config instead.
- **Fix**: Add `.cursor/mcp.json` with `{ "mcpServers": { "sentry": { "url": "https://mcp.sentry.dev/mcp" } } }`.
- **Decision**: SKIPPED

### F3 — Double Sentry initialization on server

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: sentry.server.config.ts:7-12, 19-27
- **Detail**: Plan specifies only `SentryCloudflare.withSentry()` with `dsn: env.SENTRY_DSN`. Implementation also calls top-level `Sentry.init()` from `@sentry/astro` and uses a three-way DSN fallback chain. Research doc states server config must use `withSentry`, NOT `Sentry.init()`. Risk of double init or divergent DSN sources between local and production.
- **Fix A ⭐ Recommended**: Remove `@sentry/astro` import and top-level `Sentry.init()`; use `dsn: environment.SENTRY_DSN` only in `withSentry`.
  - Strength: Matches plan contract; single init path; production DSN from Worker binding.
  - Tradeoff: Local dev must have `SENTRY_DSN` in `.dev.vars` (already documented).
  - Confidence: HIGH — plan and Sentry Cloudflare docs align on `withSentry` pattern.
  - Blind spot: Verify against latest `@sentry/astro` + Cloudflare adapter docs if build fails after removal.
- **Fix B**: Keep dual init but document why in a code comment and ensure DSN precedence is tested in production.
  - Strength: Preserves current local-dev convenience.
  - Tradeoff: Maintains architectural ambiguity; harder to reason about event routing.
  - Confidence: LOW — no evidence dual init is required.
  - Blind spot: Haven't tested event delivery with Fix A applied.
- **Decision**: FIXED (Fix A)

### F4 — Expected auth failures reported as Sentry exceptions

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/auth/signin.ts:17, src/pages/api/auth/signup.ts:17
- **Detail**: `Sentry.captureException(error)` fires on every Supabase auth failure, including expected cases (invalid credentials, duplicate email). These are not bugs — they will flood Sentry and may include user context via `sendDefaultPii`. Plan intended first-ever visibility into auth failures but did not distinguish expected vs unexpected.
- **Fix A ⭐ Recommended**: Filter expected failures — only capture when `error.status` is 500+ or message matches an allowlist of unexpected codes.
  - Strength: Reduces Sentry noise; keeps signal for real outages.
  - Tradeoff: Invalid-login attempts no longer appear in Sentry (still visible via redirect/UI).
  - Confidence: MED — requires choosing a filter heuristic.
  - Blind spot: Exact Supabase error shape for all failure modes not enumerated.
- **Fix B**: Keep capture but downgrade to `Sentry.captureMessage` at `info` level with tags.
  - Strength: Retains visibility without exception-level alerting.
  - Tradeoff: Still adds event volume; may not satisfy "auth failure monitoring" intent.
  - Confidence: MED — depends on Sentry alert rules.
  - Blind spot: Alert configuration not reviewed.
- **Decision**: FIXED (Fix A)

### F5 — PGRST116 "not found" errors sent to Sentry

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Reliability
- **Location**: src/pages/api/handouts/[id]/publish.ts:57-58, src/pages/api/handouts/[id].ts:77-78
- **Detail**: `share/[token].astro` correctly skips `PGRST116` before log/capture. Publish fetch and PUT update routes capture all PostgREST errors including `PGRST116` (no matching row), treating expected "not found / not editable" as server faults.
- **Fix**: Mirror share-page pattern — only `console.error` + `captureException` when `error.code !== 'PGRST116'`.
- **Decision**: FIXED

### F6 — 100% trace sampling on client and server

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Performance
- **Location**: sentry.client.config.ts:9, sentry.server.config.ts:10,23
- **Detail**: `tracesSampleRate: 1.0` on both sides. Plan allows this for MVP but explicitly flags monitoring quota after first week. Not a drift — intentional per plan — but worth tracking.
- **Fix**: No immediate action; monitor Sentry performance quota and reduce to `0.1` if needed.
- **Decision**: FIXED

### F7 — Auth routes lack `console.error` alongside Sentry

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/auth/signin.ts:17, src/pages/api/auth/signup.ts:17
- **Detail**: Handout API routes retain `console.error` + `captureException` per lessons.md. Auth routes add Sentry only — no server-side log for Cloudflare tail visibility.
- **Fix**: Add `console.error('Auth sign-in error:', error)` before `captureException` (or skip Sentry for expected failures per F4).
- **Decision**: FIXED (via F4)
