# Sentry Introduction Implementation Plan

## Overview

Introduce Sentry error monitoring and the Sentry MCP server into the TTRPG handouts generator. The app currently has no error tracking — only 6 `console.error` calls visible in Cloudflare's Workers dashboard and nothing at all for auth failures or client-side errors. This change wires the SDK, extends error capture across all existing blind spots, uploads source maps for readable stack traces, and adds the Sentry MCP server to `.cursor/mcp.json` so AI agents can query issues and events directly.

## Current State Analysis

No Sentry or equivalent package exists in `package.json`. The sole observability mechanism is `wrangler.jsonc`'s `observability.enabled: true` (Workers dashboard logs) plus ad-hoc `console.error` on DB failures. Auth routes and middleware have zero error logging. Client-side errors in `HandoutEditor.tsx` are swallowed silently.

The critical Cloudflare prerequisite — `"compatibility_flags": ["nodejs_compat"]` — is **already present** in `wrangler.jsonc:6`.

### Key Discoveries

- `wrangler.jsonc:4` — `"main": "@astrojs/cloudflare/entrypoints/server"` must be changed to `"./sentry.server.config.ts"` so the `withSentry` wrapper is invoked at Worker startup
- `astro.config.mjs:1-23` — env schema currently declares only `SUPABASE_URL` / `SUPABASE_KEY`; `PUBLIC_SENTRY_DSN` (client-public) needs adding; `SENTRY_DSN` is a Worker runtime binding, not an `astro:env/server` field (accessed as `env.SENTRY_DSN` in `withSentry`)
- 6 manually-caught DB errors (`console.error` sites) will **not** be auto-captured by `withSentry` — they require explicit `Sentry.captureException(error)` alongside `console.error`
- Auth routes (`signin.ts`, `signup.ts`) redirect on error but never log — Supabase auth failures are invisible today
- `src/middleware.ts` has no try/catch around `supabase.auth.getUser()` — a network error would surface as an unhandled exception without context
- Client-side save/publish errors in `HandoutEditor.tsx:86-114,123-140` are caught and shown as UI messages but never reported

## Desired End State

All server-side and client-side errors are captured in Sentry with readable source-mapped stack traces. DB failures, auth errors, and middleware exceptions surface as grouped issues in the Sentry dashboard. Session Replay fires only on errors (not for anonymous share-page viewers). Source maps upload automatically on every CI build and Cloudflare Pages deploy. AI agents in Cursor can call `search_issues`, `get_sentry_resource`, and `analyze_issue_with_seer` against this project's Sentry data.

### Key Discoveries

- `sentry.server.config.ts` uses `withSentry((env) => ({ dsn: env.SENTRY_DSN, ... }), handler)` — DSN from Worker `env`, never from `process.env`
- `sentry.client.config.ts` uses `Sentry.init({ dsn: import.meta.env.PUBLIC_SENTRY_DSN, ... })` — `PUBLIC_SENTRY_DSN` declared in astro.config.mjs env schema as `context: 'client', access: 'public'`
- Server-side Sentry imports: `@sentry/cloudflare` — for `.ts` API routes and server-rendered `.astro` pages
- Client-side Sentry imports: `@sentry/astro` — for React components (`.tsx`)
- `SENTRY_AUTH_TOKEN` is build-time only — must be in GitHub Actions secrets and Cloudflare Pages env vars; must NOT be a Worker secret

## What We're NOT Doing

- Custom error pages (`_error.astro`, `404.astro`) — out of scope for this slice
- Sentry Crons, Alerts, or notification rules — manual setup in Sentry dashboard after the first events land
- Sentry Performance dashboard custom transaction names or spans — auto-instrumentation only
- Modifying `signout.ts` — it silently skips if no Supabase client and never returns an error; no meaningful error surface to capture
- Adding the Sentry MCP token-based stdio alternative to README — project-level OAuth config is sufficient for now

## Implementation Approach

Three sequential phases, each independently verifiable. Phase 1 is the hard wiring — gets the SDK running and a test error to Sentry. Phase 2 is mechanical breadth — every existing error blind spot gets `captureException` added. Phase 3 is infrastructure — source maps in CI and the MCP config.

## Critical Implementation Details

- **`main` must change before testing Phase 1** — if `wrangler.jsonc` still points at `@astrojs/cloudflare/entrypoints/server`, the `withSentry` wrapper is never invoked. The smoke test in Phase 1 will silently fail (error captured nowhere) without this change.
- **DSN split**: `SENTRY_DSN` is a Cloudflare Worker secret (set via `wrangler secret put` or `.dev.vars`); `PUBLIC_SENTRY_DSN` is a plain env var (set in Cloudflare Pages dashboard as a non-secret environment variable and in `.env` locally). They can share the same DSN value but live in different config locations.
- **`SENTRY_AUTH_TOKEN` must NOT be added to wrangler secrets** — it is only needed at build time by the Vite plugin and `wrangler deploy`. Adding it as a Worker secret is harmless but misleading.

---

## Phase 1: SDK Install & Entrypoint Wiring

### Overview

Install the two Sentry packages, create the server and client config files, update `astro.config.mjs` and `wrangler.jsonc`, and update the env example files. At the end of this phase a deliberately thrown error should appear as an issue in the Sentry dashboard.

### Changes Required

#### 1. Install packages

**File**: `package.json` (via npm)

**Intent**: Add `@sentry/astro` (build-time Vite plugin + `astro.config.mjs` hook) and `@sentry/cloudflare` (runtime Worker SDK) as production dependencies.

**Contract**: `npm install @sentry/astro @sentry/cloudflare`

#### 2. Sentry server config

**File**: `sentry.server.config.ts` (new, project root)

**Intent**: Define the Cloudflare Workers–specific server-side Sentry init by wrapping Astro's SSR handler with `withSentry`. This is the Worker entry point after Phase 1.

**Contract**: Default export is `Sentry.withSentry((env) => ({ dsn: env.SENTRY_DSN, tracesSampleRate: 1.0, sendDefaultPii: true, enableLogs: true }), handler)` where `handler` is imported from `@astrojs/cloudflare/entrypoints/server`. Import `Sentry` from `@sentry/cloudflare`.

#### 3. Sentry client config

**File**: `sentry.client.config.ts` (new, project root)

**Intent**: Initialize the browser-side Sentry SDK with errors-only Session Replay (no session sampling, only error-triggered recordings) and performance tracing.

**Contract**: `Sentry.init` from `@sentry/astro` with `dsn: import.meta.env.PUBLIC_SENTRY_DSN`, `tracesSampleRate: 1.0`, `integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()]`, `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0`, `sendDefaultPii: true`, `enableLogs: true`.

#### 4. `astro.config.mjs` — Sentry integration + env schema

**File**: `astro.config.mjs`

**Intent**: Register the `@sentry/astro` Vite integration (injects source-maps plugin and links `sentry.server.config.ts` / `sentry.client.config.ts`), and add `PUBLIC_SENTRY_DSN` to the Astro env schema.

**Contract**: Add `import sentry from '@sentry/astro'` and `sentry({ org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, authToken: process.env.SENTRY_AUTH_TOKEN })` to the `integrations` array. Add to the `env.schema`:

```ts
PUBLIC_SENTRY_DSN: envField.string({ context: 'client', access: 'public', optional: true }),
```

`SENTRY_DSN` is NOT added here — it is a raw Worker binding accessed only in `sentry.server.config.ts` via `env.SENTRY_DSN`.

#### 5. `wrangler.jsonc` — update `main` + enable source map upload

**File**: `wrangler.jsonc`

**Intent**: Route Worker startup through the Sentry-wrapped entry point and enable automatic source map upload during `wrangler deploy`.

**Contract**: Change `"main"` from `"@astrojs/cloudflare/entrypoints/server"` to `"./sentry.server.config.ts"`. Add `"upload_source_maps": true` at the top level.

#### 6. `.env.example` — add build-time Sentry vars

**File**: `.env.example`

**Intent**: Document the five new env vars so developers know what to configure locally for building with source maps.

**Contract**: Add:
```
SENTRY_ORG=your-sentry-org-slug
SENTRY_PROJECT=your-sentry-project-slug
SENTRY_AUTH_TOKEN=sntrys_...
PUBLIC_SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/YYYY
```

#### 7. `.dev.vars.example` — add runtime Sentry secret

**File**: `.dev.vars.example`

**Intent**: Document the Worker runtime secret needed for local Cloudflare dev (`wrangler dev`).

**Contract**: Add:
```
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/YYYY
```

### Success Criteria

#### Automated Verification

- `npm run build` completes without errors (Sentry Vite plugin present, auth token optional for build success)
- `npm run lint` passes (no type errors from new config files)
- `npm run typecheck` passes

#### Manual Verification

- Set `SENTRY_DSN` in `.dev.vars` and `PUBLIC_SENTRY_DSN` in `.env` with a real Sentry DSN
- Run `npm run dev` (workerd) and hit an intentionally-thrown error route (e.g., `src/pages/api/test-error.ts` with `GET` that throws `new Error("Sentry Phase 1 smoke test")`)
- Confirm the error appears as an issue in the Sentry dashboard within ~30 seconds
- Confirm source-mapped stack trace (original `.ts` file and line, not minified bundle) after running `npm run build` locally with `SENTRY_AUTH_TOKEN` set
- Delete the test error route after verification

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that the smoke test error reached Sentry before proceeding to Phase 2.

---

## Phase 2: Error Capture Depth

### Overview

Add `Sentry.captureException(error)` alongside every existing `console.error` DB error site (6 locations), extend coverage to the currently-silent auth routes and middleware, and add client-side capture to `HandoutEditor.tsx`'s swallowed save/publish errors.

### Changes Required

#### 1. Handout API routes — DB error sites

**Files**:
- `src/pages/api/handouts/index.ts` (line 63–67)
- `src/pages/api/handouts/[id].ts` (line 75–79)
- `src/pages/api/handouts/[id]/publish.ts` (lines 54–58 and 93–95)

**Intent**: Retain the existing `console.error('DB error ...:', error)` calls (preserves Cloudflare tail log visibility and satisfies lessons.md), and add `Sentry.captureException(error)` immediately after each one so DB failures also appear as grouped issues in Sentry.

**Contract**: Import `* as Sentry from '@sentry/cloudflare'` at the top of each file (after existing imports, following the "exports at end" lesson). Call `Sentry.captureException(error)` on the line immediately after every `console.error` call that logs a DB error.

#### 2. Server-rendered pages — DB error sites

**Files**:
- `src/pages/dashboard.astro` (line 25)
- `src/pages/share/[token].astro` (line 37)

**Intent**: Same additive pattern as the API routes — `captureException` alongside the existing `console.error`.

**Contract**: Add `import * as Sentry from '@sentry/cloudflare'` to the frontmatter script block. Add `Sentry.captureException(error)` after the `console.error` call.

#### 3. Auth routes — first-ever error capture

**Files**:
- `src/pages/api/auth/signin.ts`
- `src/pages/api/auth/signup.ts`

**Intent**: Auth routes currently redirect with error query params but log nothing. Add `Sentry.captureException(error)` when Supabase auth returns an error so auth failures surface in Sentry for the first time.

**Contract**: Import `* as Sentry from '@sentry/cloudflare'`. In the branch where `signInWithPassword` / `signUp` returns an error, call `Sentry.captureException(error)` before the redirect. Do not change the redirect behavior.

#### 4. Middleware — guarded auth error capture

**File**: `src/middleware.ts`

**Intent**: Wrap `supabase.auth.getUser()` in a try/catch so that unexpected auth network errors are captured rather than propagating as unhandled exceptions with no context.

**Contract**: Wrap the `supabase.auth.getUser()` call in try/catch. On catch, call `Sentry.captureException(err)` from `@sentry/cloudflare` and set `context.locals.user = null` (same fallback as today). Do not change the redirect logic.

#### 5. `HandoutEditor.tsx` — client-side save/publish errors

**File**: `src/components/organisms/HandoutEditor.tsx` (lines 86–114, 123–140)

**Intent**: The save and publish catch blocks set UI error state but swallow errors silently. Add client-side `Sentry.captureException` so users who hit network or unexpected API errors are surfaced in Sentry.

**Contract**: Import `* as Sentry from '@sentry/astro'` (client-side, not `@sentry/cloudflare`). In each catch block that calls `setSaveError(...)` or equivalent, add `Sentry.captureException(err)` before setting the UI error state. Do not alter UI behavior.

### Success Criteria

#### Automated Verification

- `npm run lint` passes across all modified files
- `npm run typecheck` passes

#### Manual Verification

- Force a DB error locally (e.g., stop the Supabase instance) and confirm a handout create/update attempt produces an issue in Sentry with the correct file and line in the stack trace
- Attempt sign-in with an invalid password and confirm a Sentry event is captured for the auth error
- Confirm no regressions in normal happy-path flows (handout create, publish, share)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation of the DB + auth error capture verification.

---

## Phase 3: Source Maps CI + MCP Server

### Overview

Add `SENTRY_AUTH_TOKEN` to GitHub Actions secrets, extend `ci.yml` with a build step so the Sentry Vite plugin uploads client-side source maps on every CI run, and create `.cursor/mcp.json` with the Sentry OAuth remote endpoint.

### Changes Required

#### 1. `.github/workflows/ci.yml` — build step for source map upload

**File**: `.github/workflows/ci.yml`

**Intent**: Add a `build` job (or step) that runs `npm run build` with `SENTRY_AUTH_TOKEN` available, triggering the `@sentry/astro` Vite plugin to upload client-side source maps to Sentry on every CI run against `main`.

**Contract**: Add a new job or step after the existing lint/test jobs. It runs `npm run build`, sets `SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}`, `SENTRY_ORG: ${{ secrets.SENTRY_ORG }}`, and `SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}` as env vars. `PUBLIC_SENTRY_DSN` can be an empty string for CI (build succeeds without it; client SDK simply won't init if DSN is blank).

#### 2. GitHub Actions secrets (manual step, documented)

**Intent**: Document — in a plan comment, not in code — that the following secrets must be added to the GitHub repository before the CI build step runs: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`. This is a human action in the GitHub repository settings, not a file change.

**Contract**: Add a `<!-- PREREQUISITE: ... -->` comment in `ci.yml` above the new build step listing the three required secrets. Format mirrors the existing comment style in the file.

#### 3. Cloudflare Pages env vars (manual step, documented)

**Intent**: For server-side source maps, `upload_source_maps: true` in `wrangler.jsonc` triggers upload during `wrangler deploy` (which Cloudflare Pages runs). `SENTRY_AUTH_TOKEN` must also be set in Cloudflare Pages > Settings > Environment Variables.

**Contract**: Add a comment block in `wrangler.jsonc` above `upload_source_maps: true` documenting that `SENTRY_AUTH_TOKEN` must be set as a Cloudflare Pages environment variable (not a Worker secret) for this to work in production deploys.

#### 4. `.cursor/mcp.json` — Sentry MCP server

**File**: `.cursor/mcp.json` (new, project root)

**Intent**: Register the official Sentry MCP server via its remote OAuth endpoint so AI agents in Cursor can call `search_issues`, `search_events`, `get_sentry_resource`, and `analyze_issue_with_seer` against this project's Sentry data. Cursor handles OAuth on first use — no token to commit.

**Contract**: New JSON file:
```json
{
  "mcpServers": {
    "sentry": {
      "url": "https://mcp.sentry.dev/mcp"
    }
  }
}
```

### Success Criteria

#### Automated Verification

- `npm run lint` passes (ci.yml and new mcp.json are valid)
- CI build job completes successfully on a test branch push (requires GitHub secrets to be set first)

#### Manual Verification

- Push a branch and confirm the CI build job runs and the Sentry Vite plugin reports source map upload success in CI logs
- In Cursor, reload MCP servers, complete the Sentry OAuth flow, and verify `find_organizations` returns your Sentry org
- Trigger a test error and confirm its Sentry stack trace shows original source file + line (from uploaded source maps)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that source maps are resolving correctly and the MCP server is connected before considering the change complete.

---

## Testing Strategy

### Unit Tests

No unit tests are appropriate for SDK wiring — the integration is verified by live error capture. The existing test suite should continue to pass unchanged.

### Integration Tests

No new integration tests — Sentry is an observability side-effect, not a business logic path. The existing integration suite remains the contract.

### Manual Testing Steps

1. **Phase 1 smoke test**: Throw a deliberate error in a test route, confirm it reaches Sentry with a readable stack trace
2. **Phase 2 DB error**: Stop local Supabase, attempt handout save, confirm Sentry issue with correct location
3. **Phase 2 auth error**: Sign in with wrong password, confirm Sentry event for auth failure
4. **Phase 2 client error**: Simulate a failed API response in HandoutEditor (e.g., offline mode), confirm client-side Sentry capture
5. **Phase 3 source maps**: Force a known error after CI build, confirm Sentry shows `.ts` source lines not minified bundle
6. **Phase 3 MCP**: Ask Cursor agent `"list my Sentry projects"` — confirm it returns this project's data

## Performance Considerations

`tracesSampleRate: 1.0` is appropriate for MVP traffic. Monitor Sentry's performance quota usage after the first week. If the free plan limit approaches, reduce to `0.1` in `sentry.server.config.ts`.

The Sentry SDK itself adds ~2–5ms of overhead per Worker invocation (serialization + async event flush). Acceptable for this workload.

## Migration Notes

No database migrations. No existing data to migrate. Sentry will only capture events from the moment the SDK is deployed — historical `console.error` output is not backfilled.

## References

- Research: `context/changes/sentry-introduction/research.md`
- Sentry Cloudflare Workers docs: https://docs.sentry.io/platforms/javascript/guides/cloudflare/
- `wrangler.jsonc:1-15` — current config baseline
- `astro.config.mjs:1-23` — current integrations baseline
- `context/foundation/lessons.md` — "Never Expose Raw Database Error Messages" rule

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: SDK Install & Entrypoint Wiring

#### Automated

- [ ] 1.1 `npm run build` completes without errors
- [ ] 1.2 `npm run lint` passes
- [ ] 1.3 `npm run typecheck` passes

#### Manual

- [ ] 1.4 Smoke test error appears in Sentry dashboard
- [ ] 1.5 Source-mapped stack trace shows original `.ts` file and line after local build with auth token
- [ ] 1.6 Test error route deleted after verification

### Phase 2: Error Capture Depth

#### Automated

- [ ] 2.1 `npm run lint` passes across all modified files
- [ ] 2.2 `npm run typecheck` passes

#### Manual

- [ ] 2.3 DB error (stopped Supabase) produces Sentry issue with correct location
- [ ] 2.4 Invalid sign-in produces Sentry event for auth failure
- [ ] 2.5 Happy-path flows (create, publish, share) show no regressions

### Phase 3: Source Maps CI + MCP Server

#### Automated

- [ ] 3.1 `npm run lint` passes (ci.yml valid)
- [ ] 3.2 CI build job completes and Vite plugin reports source map upload

#### Manual

- [ ] 3.3 Post-CI error stack trace shows original source file + line
- [ ] 3.4 Cursor MCP `find_organizations` returns the Sentry org
- [ ] 3.5 Sentry MCP `analyze_issue_with_seer` returns root-cause analysis for a captured issue
