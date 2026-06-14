# Sentry Introduction — Plan Brief

> Full plan: `context/changes/sentry-introduction/plan.md`
> Research: `context/changes/sentry-introduction/research.md`

## What & Why

The app has no error monitoring today — DB failures appear only in Cloudflare's Workers dashboard, auth errors are completely silent, and client-side catches swallow errors with no reporting. This change wires Sentry end-to-end (SDK + source maps + MCP server) to give developers a grouped, searchable, source-mapped view of every error that occurs in production.

## Starting Point

Six `console.error` calls exist on DB failure paths. Auth routes and middleware log nothing. `HandoutEditor.tsx` swallows save/publish errors in try/catch without reporting. `nodejs_compat` is already set in `wrangler.jsonc` — the main Cloudflare/Sentry prerequisite is pre-cleared.

## Desired End State

Every server-side and client-side exception lands in Sentry with readable stack traces. DB errors, auth failures, and middleware exceptions are grouped as Sentry issues. Session Replay fires only on errors (not for anonymous share-page viewers). Source maps upload automatically on CI. AI agents in Cursor can query Sentry issues via MCP without manual token setup.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Server SDK wiring pattern | `withSentry` entrypoint wrapper | Required Cloudflare Workers pattern — `Sentry.init()` does not work in Workers | Research |
| DSN access | Worker `env.SENTRY_DSN` (binding), not `astro:env/server` | Cloudflare Workers receive secrets via `env`, not `process.env` at runtime | Research |
| Replay mode | Errors-only (`sessionSampleRate: 0`, `onErrorSampleRate: 1.0`) | Avoids capturing anonymous share-page viewers in session recordings | Plan |
| Capture depth | Additive — keep `console.error`, add `captureException` alongside | Preserves Cloudflare tail log visibility and satisfies lessons.md pattern | Plan |
| Tracing rate | `1.0` (full) | MVP traffic is low; full visibility is worth more than quota conservation now | Plan |
| Source maps CI | GitHub Actions build step + `SENTRY_AUTH_TOKEN` secret | Auto-upload on every merge; no manual deploy required for readable stack traces | Plan |
| MCP placement | Project-level `.cursor/mcp.json`, remote OAuth | Version-controlled, zero token management, consistent with existing `.cursor/` structure | Plan |

## Scope

**In scope:**
- `@sentry/astro` + `@sentry/cloudflare` SDK install and wiring
- `sentry.server.config.ts` (withSentry), `sentry.client.config.ts` (browser init, errors-only replay)
- `astro.config.mjs` Sentry integration + `PUBLIC_SENTRY_DSN` env schema entry
- `wrangler.jsonc` `main` update + `upload_source_maps: true`
- `Sentry.captureException` added to 6 DB error sites, auth routes, middleware, and `HandoutEditor.tsx`
- `.env.example` / `.dev.vars.example` updated with Sentry vars
- GitHub Actions `ci.yml` build step for source map upload
- `.cursor/mcp.json` with Sentry OAuth remote endpoint

**Out of scope:**
- Custom error pages (`_error.astro`, `404.astro`)
- Sentry Alerts, notification rules, or Crons (manual Sentry dashboard setup)
- Custom transaction names or manual performance spans
- `signout.ts` — no meaningful error surface to capture
- Token-based MCP stdio alternative documented in README

## Architecture / Approach

The Cloudflare Workers–specific pattern: `sentry.server.config.ts` imports Astro's SSR handler and re-exports it wrapped in `Sentry.withSentry(...)`. `wrangler.jsonc` `main` is updated to point at this file. At runtime, every Worker invocation passes through the Sentry wrapper, which auto-captures unhandled exceptions. Manually-caught errors (all 6 DB sites + auth routes) get `Sentry.captureException` added explicitly. Client-side errors use `@sentry/astro` via `sentry.client.config.ts`, which `@sentry/astro` injects automatically. Source maps upload two ways: the Vite plugin uploads browser maps during build; `upload_source_maps: true` uploads Worker maps during `wrangler deploy`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. SDK Install & Entrypoint Wiring | Sentry receives events; smoke test passes | `wrangler.jsonc` `main` must be updated — if missed, `withSentry` is never invoked |
| 2. Error Capture Depth | All 6 DB sites, auth routes, middleware, and client errors report to Sentry | Wide surface (8 files) — lint/typecheck catches import errors |
| 3. Source Maps CI + MCP | Readable stack traces in CI; Cursor agents can query Sentry | GitHub + Cloudflare Pages secrets must be set before CI build step succeeds |

**Prerequisites:** A Sentry account and project with DSN. `SENTRY_DSN` set in `.dev.vars` for local dev. Phase 3 requires `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` added as GitHub Actions secrets and Cloudflare Pages env vars.

**Estimated effort:** ~2 focused sessions across 3 phases (Phase 1: 30–45 min; Phase 2: 30 min; Phase 3: 20 min)

## Open Risks & Assumptions

- `@sentry/astro` integration is assumed to correctly link `sentry.server.config.ts` and `sentry.client.config.ts` by convention (filename-based auto-discovery). If not, manual config in `astro.config.mjs` is required.
- `replaysSessionSampleRate: 0` should prevent anonymous share-page sessions from being recorded, but Replay is still bundled — if Sentry changes the behavior, revisit.
- `tracesSampleRate: 1.0` will exhaust the free Sentry performance quota if traffic grows unexpectedly — reduce to `0.1` proactively if needed.

## Success Criteria (Summary)

- A deliberate server error, a DB failure, and a failed auth attempt each produce a distinct, source-mapped Sentry issue with the correct original file and line
- CI build passes with source map upload confirmed in logs
- `find_organizations` via Sentry MCP in Cursor returns the project's Sentry org
