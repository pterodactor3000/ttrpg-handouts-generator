---
date: 2026-06-06T16:29:00+02:00
researcher: Claude (Sonnet 4.6)
git_commit: 0d8aa9499adc0a95c5d0637336d0719d2248cb63
branch: feature/lesson-11
repository: ttrpg-handouts-generator
topic: "Wire unit and integration Vitest suite into CI quality gate"
tags: [research, ci, vitest, supabase, github-actions, quality-gates]
status: complete
last_updated: 2026-06-06
last_updated_by: Claude (Sonnet 4.6)
---

# Research: Wire Unit and Integration Vitest Suite into CI Quality Gate

**Date**: 2026-06-06T16:29:00+02:00
**Researcher**: Claude (Sonnet 4.6)
**Git Commit**: 0d8aa9499adc0a95c5d0637336d0719d2248cb63
**Branch**: feature/lesson-11
**Repository**: ttrpg-handouts-generator

## Research Question

Ground rollout Phase 4 of `context/foundation/test-plan.md`: wire the full Vitest suite (unit +
integration projects) into CI against a realistic Supabase-backed environment so dev/prod-parity
regressions are caught before merge.

## Summary

**The key finding is structural:** there is no `.github/workflows/` directory on disk today. The
former workflow was explicitly deleted in commit `d608061` (2026-05-25) when deployment moved to
Cloudflare Pages native GitHub integration. Phase 4 is therefore creating a CI workflow from
scratch, not extending an existing one.

The Vitest suite splits cleanly into `unit` (no external deps) and `integration` (requires a
running Supabase instance). Integration tests self-provision all fixtures at runtime; the seed
file is intentionally empty. The only blocker for running them in CI is providing a Supabase
stack — which the `supabase/setup-cli` GitHub Action handles.

The cheapest viable approach: a dedicated GitHub Actions workflow (separate from Cloudflare
Pages) that runs on PRs to `master`, starts local Supabase via `supabase start`, extracts the
three env vars from `supabase status`, writes `.env.test`, then runs `npm test`.

One secondary finding: AGENTS.md / CLAUDE.md contain a stale claim that GitHub Actions runs
lint+build. Phase 4 should correct this while adding the test workflow.

---

## Detailed Findings

### 1. No CI workflow exists today

`.github/workflows/` was deleted in commit `d608061` (2026-05-25, "remove CI workflow"). The
directory does not exist on disk.

**The former workflow** (reconstructed from git, `d608061^:.github/workflows/ci.yml`):

```yaml
name: CI
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx astro sync
      - run: npm run lint
      - run: npm run build
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

It never ran `npm test`. The `npm run build` step used `SUPABASE_URL` + `SUPABASE_KEY` for the
Astro SSR build — both are declared as `optional: true` in `astro.config.mjs:18-21`, meaning the
build succeeds without them but runtime would fail.

**Why deleted:** `context/deployment/deploy-plan.md` step 4 explicitly removed it. Deployment
moved to Cloudflare Pages native GitHub integration, which runs `npm run build` on push to main.
No tests run anywhere in CI today.

**Implication for Phase 4:** A new workflow must be created from scratch. It should be scoped to
test running only — the Cloudflare Pages integration already handles the build/deploy gate
separately.

### 2. Vitest project split

`vitest.config.ts:17-42` defines two projects:

| Project | Include glob | Exclude | setupFiles | Supabase needed? |
|---------|-------------|---------|------------|-----------------|
| `unit` | `src/**/*.test.{ts,tsx}` | `src/integration/**` | none | No |
| `integration` | `src/integration/**/*.test.ts` | — | `src/integration/setup-env.ts` | **Yes** |

Both share: `environment: 'node'`, `@vitejs/plugin-react`, `@` alias → `src/`, `astro:middleware`
alias → `src/integration/helpers/astro-middleware-stub.ts`.

`npm test` (`vitest run`) runs **both projects**. There is no dedicated `test:unit` or
`test:integration` npm script. Individual project runs use the `--project` flag:
- `npm test -- --project unit` — unit only (no Supabase)
- `npm test -- --project integration` — integration only

### 3. Integration test environment requirements

`src/integration/setup-env.ts:4-25` is the env bootstrap. It **throws** if `.env.test` is
missing:

```
Missing .env.test for integration tests. Copy .env.test.example to .env.test and populate
from `npx supabase status -o env`.
```

It parses `.env.test` manually into `process.env`. Vitest 4 project-level `envFile` is not used.

**Required env vars** (read via `requireEnv()` in `src/integration/helpers/env.ts:1-8`):

| Variable | Where used | Notes |
|----------|-----------|-------|
| `SUPABASE_URL` | All integration suites, `admin-client.ts`, `test-users.ts` | Default: `http://127.0.0.1:54321` |
| `SUPABASE_ANON_KEY` | `test-users.ts`, auth-gate + share-token suites | Naming differs from app runtime's `SUPABASE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `admin-client.ts` (bypasses RLS for fixtures) | Never exposed to HTTP clients |

**Important naming note:** The app runtime (`src/lib/supabase.ts`) uses `SUPABASE_KEY` (anon key),
declared in `astro.config.mjs:19`. The integration tests use `SUPABASE_ANON_KEY`. These are the
same key value with different names. A CI job running both build and tests would need to map the
same secret to both names.

### 4. Supabase CLI and local stack

`package.json:67` declares `"supabase": "^2.23.4"`; lockfile resolves to `2.104.0`.

`supabase/config.toml` key settings:

| Setting | Value |
|---------|-------|
| `project_id` | `"10x-astro-starter"` |
| API port | `54321` |
| DB port | `54322` |
| DB major version | `17` (Postgres) |
| Auth email confirmation | `false` (local) |
| Seed | Enabled; `seed.sql` is **intentionally empty** |

`supabase/migrations/`: one file — `20260528200000_create_handouts_table.sql` (54 lines).

`supabase start` applies migrations automatically. No seed data is needed: integration tests
create their own fixtures via `createAdminClient()` and tear them down in `afterEach` / `afterAll`.

`supabase status -o env` outputs all three needed env vars in `KEY=value` format, ready to write
directly to `.env.test`.

### 5. What `npx astro sync` does and whether CI still needs it

The former workflow ran `npx astro sync` before lint and build. This generates `src/env.d.ts`
type declarations from `astro.config.mjs`'s env schema. For a test-only workflow that does not
call `npm run build` or type-check, `astro sync` is not strictly required. However, if the
workflow also runs `npm run lint` (which is type-checked ESLint per AGENTS.md), it will need the
generated types. Either run `npx astro sync` before lint, or keep a combined workflow.

### 6. Stale documentation

`AGENTS.md` and `CLAUDE.md` both contain:
> "CI gate (`.github/workflows/ci.yml`): runs `npm run lint` + `npm run build` on push/PR to
> `master`"

This is stale since `d608061`. Phase 4 should update these files when the new workflow lands, so
future contributors (and agents) have accurate CI information.

---

## Code References

- `vitest.config.ts:17-42` — full project split definition (unit + integration projects)
- `src/integration/setup-env.ts:1-26` — env bootstrap; throws on missing `.env.test`
- `src/integration/helpers/env.ts:1-9` — `requireEnv()` guard
- `src/integration/helpers/admin-client.ts:1-8` — service-role client factory
- `src/integration/helpers/test-users.ts:1-59` — `createTestUser`, `deleteTestUser`, `signInAsUser`
- `src/integration/helpers/context-stub.ts:1-33` — `makeContext()` for handler tests
- `src/integration/helpers/middleware-context-stub.ts:1-33` — `makeMiddlewareContext()`
- `src/integration/helpers/astro-middleware-stub.ts:1-3` — `defineMiddleware` stub
- `src/integration/helpers/assert-no-schema-leakage.ts:1-22` — schema-leakage guard
- `.env.test.example:1-4` — three required integration env vars
- `supabase/config.toml:5,10,29,55,62,65` — project_id, ports, seed config
- `astro.config.mjs:17-22` — `SUPABASE_URL` + `SUPABASE_KEY` env schema (build-time, optional)
- `package.json:5-14` — npm scripts (`test` = `vitest run`)
- `package.json:67` — `supabase` CLI devDependency `^2.23.4`

---

## Architecture Insights

**Two separate CI concerns, best kept in separate jobs or workflows:**

1. **Test gate** — runs Vitest unit + integration; requires Docker + Supabase; blocked on PRs to
   `master`. This is what Phase 4 adds.
2. **Build/deploy gate** — currently Cloudflare Pages running `npm run build`; does not require
   Supabase start (env vars are optional in build). Already wired outside GHA.

**Supabase-in-CI pattern for GitHub Actions:**
1. `uses: supabase/setup-cli@v1 with: version: <lockfile version>` — installs the Supabase CLI
2. `run: supabase start` — starts local Postgres + GoTrue + PostgREST (requires Docker; GHA
   ubuntu-latest has Docker pre-installed)
3. Extract vars: `supabase status --output env` → write to `.env.test` or set `$GITHUB_ENV`
4. `npm test` — runs both Vitest projects

**Unit tests can run first without Supabase** as a fast-fail gate. The workflow can split into
two steps: `npm test -- --project unit` → then `supabase start` → `npm test -- --project
integration`. This gives faster feedback on pure logic failures before waiting for Supabase to
boot (~15–30s).

**`npx astro sync` is needed before lint** (type-checked ESLint needs generated type declarations
from the Astro env schema). If the workflow includes lint, it should run `npx astro sync` first.

**Secret naming for the new workflow:**
The three integration vars come from `supabase status` output and do not map to existing GitHub
repo secrets. They are ephemeral, local-to-the-job values — no new GitHub repo secrets are
needed for the integration tests. For `npm run lint` + `npm run build` (if included), the
existing `SUPABASE_URL` and `SUPABASE_KEY` secrets (or the `supabase status` values) cover the
build env schema.

---

## Historical Context

- `context/archive/2026-06-03-testing-api-db-handout-coverage/plan.md` — line 44, 72: "CI gate
  wiring is deferred to rollout Phase 4."
- `context/changes/testing-access-control-critical-path/plan.md` — all phases verified locally
  only; no CI step.
- `context/changes/testing-markdown-rendering-safety/plan.md:58` — "No CI/Quality-gate wiring —
  that is Phase 4's job."
- `d608061` (2026-05-25) — the commit that removed `.github/workflows/ci.yml`; Phase 4 must
  rebuild from the former workflow contents above.

---

## Open Questions

1. **Workflow scope:** Should the new workflow run lint + build + tests (full CI, replacing what
   was deleted), or tests-only (complement to the Cloudflare Pages build gate)? The test-plan
   goal says "run the test suite in CI" — tests-only is sufficient for Phase 4, but lint was
   previously co-located. Recommend: include lint in the same job (it's fast and was already
   there); skip `npm run build` since CF Pages handles that.

2. **`astro sync` requirement:** Does the lint step (`npm run lint`) require generated types from
   `npx astro sync`? Almost certainly yes for type-checked ESLint. The plan should include it.

3. **Vitest timeout in CI:** Supabase startup and auth operations may be slower in CI than
   locally. Default Vitest timeout is 5 s. Integration tests create/delete users per suite — if
   Supabase cold-starts slowly, some tests may flake. The plan should set a conservative
   `testTimeout` for the integration project (e.g. 15–30 s).

4. **Stale docs:** AGENTS.md and CLAUDE.md CI claim is stale. Phase 4 implementation should
   update both to reflect the new workflow.
