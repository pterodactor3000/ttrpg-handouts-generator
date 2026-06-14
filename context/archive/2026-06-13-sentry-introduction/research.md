---
date: 2026-06-13T12:48:00+02:00
researcher: AI Agent
git_commit: 8aa070c
branch: feature/S-05-ui-restyle
repository: ttrpg-handouts-generator
topic: "Introduce Sentry for error monitoring with MCP connection"
tags: [research, sentry, observability, cloudflare-workers, astro, mcp]
status: complete
last_updated: 2026-06-13
last_updated_by: AI Agent
---

# Research: Introduce Sentry for error monitoring with MCP connection

**Date**: 2026-06-13T12:48:00+02:00
**Researcher**: AI Agent
**Git Commit**: 8aa070c
**Branch**: feature/S-05-ui-restyle
**Repository**: ttrpg-handouts-generator

## Research Question

How should Sentry be introduced into this Astro 6 SSR + Cloudflare Workers application, covering full SDK integration (error capture, performance tracing, source maps) and setting up the official Sentry MCP server so AI agents in Cursor can query issues and events?

## Summary

The codebase has **no error monitoring today** — only 6 `console.error` calls on DB failures and Cloudflare's native `observability.enabled: true` (Workers dashboard only). There is no `_error.astro`, no global try/catch in middleware, and auth routes don't even log errors.

Sentry integration requires **two packages** (`@sentry/astro` + `@sentry/cloudflare`) following a Cloudflare-specific wiring pattern where the server SDK wraps Astro's SSR entrypoint rather than calling `Sentry.init()`. The `nodejs_compat` flag is already set in `wrangler.jsonc` — one prerequisite done. Source maps need `upload_source_maps: true` in `wrangler.jsonc` plus the Vite plugin for the browser bundle. Three new env vars are needed (`SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `PUBLIC_SENTRY_DSN`).

The Sentry MCP server (`@sentry/mcp-server`) can be wired via the remote OAuth endpoint (`https://mcp.sentry.dev/mcp`) in `.cursor/mcp.json` with zero additional tokens — or via `npx` with a User Auth Token for more control. It exposes 20 tools covering issue search, event inspection, AI root-cause analysis, and triage.

---

## Detailed Findings

### Current State: Error Handling Baseline

The app uses a consistent pattern: `console.error('DB error ...:', error)` server-side, generic message to the client. This satisfies the lessons.md rule about not leaking PostgREST internals.

**`console.error` coverage** (all DB paths):

| File | Line | Logged message |
|---|---|---|
| `src/pages/api/handouts/index.ts` | 64 | `'DB error inserting handout:'` |
| `src/pages/api/handouts/[id].ts` | 76 | `'DB error updating handout:'` |
| `src/pages/api/handouts/[id]/publish.ts` | 56 | `'DB error fetching handout for publish:'` |
| `src/pages/api/handouts/[id]/publish.ts` | 94 | `'DB error publishing handout:'` |
| `src/pages/dashboard.astro` | 25 | `'DB error loading handouts:'` |
| `src/pages/share/[token].astro` | 37 | `'DB error loading shared handout:'` |

**Gaps not covered by `console.error`**:
- `src/middleware.ts` — no try/catch; Supabase auth errors propagate uncaught
- `src/pages/api/auth/signin.ts`, `signup.ts`, `signout.ts` — zero logging; errors become redirect query params only
- No global error page (`_error.astro` / `404.astro` absent at root)
- Client-side UI errors swallowed in try/catch without logging (`HandoutEditor.tsx` lines 86–114, 123–140)

### Current Infrastructure

```jsonc
// wrangler.jsonc — relevant existing config
{
  "main": "@astrojs/cloudflare/entrypoints/server",   // line 4
  "compatibility_flags": ["nodejs_compat"],            // line 6 ✓ already set
  "observability": { "enabled": true }                 // lines 12–14 (Workers dashboard only)
}
```

`nodejs_compat` is **already present** — the most common Sentry/Cloudflare blocker is pre-cleared.

### Sentry SDK Integration: Required Changes

#### Packages

```bash
npm install @sentry/astro @sentry/cloudflare
```

`@sentry/astro` = build-time orchestrator (Vite source-maps plugin, `astro.config.mjs` hook).  
`@sentry/cloudflare` = runtime SDK for the Cloudflare Worker.

#### `astro.config.mjs` changes

Add the Sentry integration alongside the existing `react()` and `sitemap()`:

```typescript
import sentry from '@sentry/astro';

export default defineConfig({
  // ...existing config...
  integrations: [
    react(),
    sitemap(),
    sentry({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      SUPABASE_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Add these:
      SENTRY_DSN: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_SENTRY_DSN: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
```

#### New file: `sentry.server.config.ts` (Cloudflare Workers pattern)

**Critical**: must use `withSentry` wrapper, NOT `Sentry.init()`. The DSN must come from `env` (Worker binding), not `process.env`:

```typescript
import * as Sentry from '@sentry/cloudflare';
import handler from '@astrojs/cloudflare/entrypoints/server';

export default Sentry.withSentry(
  (env) => ({
    dsn: env.SENTRY_DSN,
    sendDefaultPii: true,
    tracesSampleRate: 1.0,
    enableLogs: true,
  }),
  handler
);
```

#### New file: `sentry.client.config.ts` (browser)

```typescript
import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
});
```

#### `wrangler.jsonc` changes

Add one line — `upload_source_maps` for server-side Worker source maps:

```jsonc
{
  // ...existing...
  "compatibility_flags": ["nodejs_compat"],   // already present ✓
  "upload_source_maps": true,                 // ADD THIS
  "observability": { "enabled": true }
}
```

#### Environment variables

| Variable | Scope | Where set | Purpose |
|---|---|---|---|
| `SENTRY_DSN` | Server runtime | Cloudflare secret / `.dev.vars` | Worker SDK DSN — accessed as `env.SENTRY_DSN` |
| `PUBLIC_SENTRY_DSN` | Client public | `.env` / Cloudflare var | Browser SDK DSN |
| `SENTRY_AUTH_TOKEN` | Build time only | `.env` / CI secret | Source maps upload (never goes to Worker) |
| `SENTRY_ORG` | Build time only | `.env` / CI | `@sentry/astro` integration config |
| `SENTRY_PROJECT` | Build time only | `.env` / CI | `@sentry/astro` integration config |

**`.env.example` and `.dev.vars.example`** both need updating with these new vars.

#### Source maps: two-track approach

| Track | Covers | Mechanism |
|---|---|---|
| Server (Worker bundle) | `sentry.server.config.ts`, API routes | `"upload_source_maps": true` in `wrangler.jsonc` |
| Client (browser bundle) | React components, Astro islands | `@sentry/astro` Vite plugin (auto via `astro.config.mjs`) |

Both are needed for full stack traces.

### Sentry MCP Server

#### Package

```
@sentry/mcp-server  (npm, latest 0.36.0 as of Jun 8 2026)
GitHub: getsentry/sentry-mcp
Remote endpoint: https://mcp.sentry.dev/mcp
```

#### Option A — Remote OAuth (recommended, zero-install)

Add to `.cursor/mcp.json` in the project root:

```json
{
  "mcpServers": {
    "sentry": {
      "url": "https://mcp.sentry.dev/mcp"
    }
  }
}
```

Cursor will prompt for OAuth on first use. No token management needed.

#### Option B — Local stdio with access token

```json
{
  "mcpServers": {
    "sentry": {
      "command": "npx",
      "args": ["@sentry/mcp-server@latest"],
      "env": {
        "SENTRY_ACCESS_TOKEN": "sntryu_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Token created at `sentry.io/settings/account/api/auth-tokens/`. Minimum scopes: `org:read`, `project:read`, `team:read`, `event:read`. Add `event:write` for triage.

#### Capabilities (20 tools across 5 skills)

| Skill | Key tools |
|---|---|
| `inspect` | `search_issues`, `search_events`, `get_sentry_resource`, `find_projects` |
| `docs` | Sentry SDK documentation search |
| `seer` | `analyze_issue_with_seer` — AI root-cause + code fix suggestion |
| `triage` | Resolve, assign, update issues |
| `project-management` | Create/modify projects, teams, DSNs |

---

## Code References

- `wrangler.jsonc:1-15` — full Worker config; `nodejs_compat` already set at line 6
- `astro.config.mjs:1-23` — integrations, env schema, adapter; no Sentry yet
- `src/middleware.ts:1-32` — no error logging; auth failures are silent
- `src/pages/api/handouts/index.ts:63-67` — current `console.error` + 500 pattern
- `src/pages/api/handouts/[id]/publish.ts:54-60` — conditional `console.error` (skips PGRST116)
- `src/pages/api/auth/signin.ts:10-19` — no logging; errors become redirect params
- `src/components/organisms/HandoutEditor.tsx:86-114` — client try/catch swallows errors silently
- `.env.example` / `.dev.vars.example` — only `SUPABASE_URL` + `SUPABASE_KEY` today

---

## Architecture Insights

1. **`withSentry` wraps the entrypoint, not `Sentry.init()`** — this is the critical Cloudflare-specific pattern. The `wrangler.jsonc` `main` field already points at `@astrojs/cloudflare/entrypoints/server`, and `withSentry` re-exports that handler. `sentry.server.config.ts` becomes the new `main` after integration.

2. **DSN is a Worker binding, not a build-time env var** — `SENTRY_DSN` must be set as a Cloudflare secret (accessible via `env.SENTRY_DSN`), not as an `astro:env/server` field. The `astro:env/server` pattern used for `SUPABASE_URL`/`SUPABASE_KEY` does not apply here.

3. **`nodejs_compat` is already present** — this removes the most common Sentry/Cloudflare failure mode. No changes to compatibility flags needed.

4. **Existing `console.error` calls are additive with Sentry** — they should be kept. When Sentry is wired, errors thrown in wrapped handlers are auto-captured. Manually-caught errors (where `console.error` is called) should additionally call `Sentry.captureException(error)` to appear in Sentry dashboard.

5. **Auth routes have no logging at all** — adding Sentry provides first-ever observability into auth failures, which currently only surface as silent redirects.

6. **`wrangler.jsonc` `main` field may need updating** — currently points at `@astrojs/cloudflare/entrypoints/server` directly. After integration, `sentry.server.config.ts` (which re-exports via `withSentry`) should become `main`, or the integration handles it automatically via `@sentry/astro`. This needs verification during implementation.

---

## Historical Context (from prior changes)

- `context/foundation/roadmap.md:66-67` — observability explicitly marked as **partial**: "Cloudflare Workers observability flag in `wrangler.jsonc` only; no in-app logging or error tracking"
- `context/foundation/lessons.md:54-59` — lesson: never expose raw DB errors to HTTP clients; `console.error` server-side is the current standard
- `context/archive/2026-05-30-first-handout-creation-and-sharing/reviews/impl-review.md:24-31` — historical finding that draft create/update routes were missing `console.error`; now fixed
- `context/foundation/infrastructure.md:117` — "No MCP tool for log ingestion yet (as of May 2026); agents invoke `wrangler tail` via shell" — Sentry MCP fills this gap
- `context/foundation/prd.md` — no monitoring NFRs; analytics explicitly a non-goal (read-only share links are anonymous). Sentry is an ops/dev tool, not analytics — not blocked by this.
- `context/deployment/deploy-plan.md:32-41` — established pattern for `.dev.vars.example` and `.env.example`; both need Sentry vars added

---

## Related Research

- `context/archive/2026-06-03-testing-api-db-handout-coverage/research.md` — prior research on API error patterns and DB error handling

---

## Open Questions

1. **`wrangler.jsonc` `main` field update** — does `@sentry/astro` integration automatically reroute the Worker entry to `sentry.server.config.ts`, or must `main` in `wrangler.jsonc` be manually changed to `./sentry.server.config.ts`? Needs verification with a test build.

2. **`astro:env/server` vs Worker `env` for `SENTRY_DSN`** — the `withSentry` callback receives Worker `env` directly. Should `SENTRY_DSN` also be declared in `astro.config.mjs` env schema for type safety, or left as an untyped Worker binding only?

3. **Replay integration in production** — `Sentry.replayIntegration()` records user sessions. Given that the share page is publicly accessible with anonymous viewers, replay may capture unintended sessions. Consider disabling replay on `/share/*` routes or setting `replaysSessionSampleRate: 0`.

4. **CI/CD source maps** — `SENTRY_AUTH_TOKEN` needs to be available during `npm run build` in GitHub Actions. The CI workflow (`ci.yml`) currently only runs lint and tests, not a production build. If source maps are to be uploaded in CI, the workflow needs a build step with the token.

5. **`PUBLIC_SENTRY_DSN` exposure** — the browser DSN is public (visible in source). This is normal for Sentry client-side tracking, but should be confirmed as acceptable. The DSN allows event submission but not data reads.
