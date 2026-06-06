# Quality-Gate Wiring — CI Implementation Plan

## Overview

Create a GitHub Actions workflow from scratch that runs lint and the full
Vitest suite (unit then integration) on every push and PR to `main`. The
integration project requires a running Supabase instance, which is started
inside the CI job using the `supabase/setup-cli` action — no new GitHub
repository secrets are needed. Stale CI documentation in `AGENTS.md` and
`CLAUDE.md` is corrected when the workflow lands.

## Current State Analysis

No `.github/workflows/` directory exists on disk. The former workflow was
deleted in commit `d608061` (2026-05-25) when deployment moved to Cloudflare
Pages native GitHub integration. Tests have never run in any CI pipeline.

Cloudflare Pages currently runs `npm run build` on push to `main` and handles
the deploy gate independently. The new workflow is a **test gate only** and does
not duplicate the build/deploy step.

Vitest is already configured with a two-project split:
- `unit` — no external deps, fast, runs in Node.
- `integration` — requires Supabase; configured with `setupFiles:
  ['src/integration/setup-env.ts']` which throws if `.env.test` is missing.

Integration tests self-provision all fixtures at runtime. `supabase/seed.sql`
is intentionally empty. Only the three env vars below are required:

| Variable | Source in CI |
|---|---|
| `SUPABASE_URL` | `supabase status -o env` (`API_URL` key — see Critical Details) |
| `SUPABASE_ANON_KEY` | `supabase status -o env` (`ANON_KEY` key — see Critical Details) |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase status -o env` (`SERVICE_ROLE_KEY` key) |

## Desired End State

Every push and PR to `main` triggers a GitHub Actions job that:
1. Runs `npm run lint` (with `npx astro sync` to generate required type declarations).
2. Runs all unit tests (`npm test -- --project unit`).
3. Starts a local Supabase instance, writes `.env.test`, and runs all integration
   tests (`npm test -- --project integration`).
4. Stops Supabase after tests complete.

The job blocks merges on any test or lint failure. `AGENTS.md` and `CLAUDE.md`
accurately describe what CI does.

### Key Discoveries

- `vitest.config.ts:30-38` — integration project has no `testTimeout` set;
  default is 5 s, which is insufficient for cold Supabase auth ops in CI.
- `src/integration/setup-env.ts:4-8` — throws a descriptive error if `.env.test`
  is absent; the error message is safe to surface in CI logs.
- `supabase/config.toml:10` — local API runs on port `54321`; migrations applied
  automatically by `supabase start`.
- `supabase/config.toml:36` — Postgres 17; `ubuntu-latest` has Docker
  pre-installed, satisfying the Supabase CLI prerequisite.
- `package.json:67` — Supabase CLI `^2.23.4` declared; lockfile resolves
  `2.104.0`; the workflow should pin to the lockfile version to avoid version
  skew.
- `astro.config.mjs:18-21` — `SUPABASE_URL` and `SUPABASE_KEY` are declared
  `optional: true`, so `npx astro sync` and `npm run lint` succeed without those
  vars set in the CI environment.

## What We're NOT Doing

- **`npm run build` in this workflow** — Cloudflare Pages handles the build/deploy
  gate; duplicating it here adds time without signal.
- **New GitHub repository secrets** — all three integration env vars are ephemeral
  values extracted from `supabase status` at runtime.
- **Docker layer caching** — keeping the first implementation simple; cache
  optimization is a follow-up if startup time proves a bottleneck.
- **`test:unit` / `test:integration` npm script aliases** — `npm test --
  --project <name>` is already clear; extra scripts would need maintenance.
- **e2e or Playwright** — not required; all Phases 1–3 risks are covered at the
  integration layer.

## Implementation Approach

Single sequential job on `ubuntu-latest`:

```
checkout → setup-node (v22, npm cache) → npm ci
  → npx astro sync → npm run lint
  → npm test -- --project unit            ← fast-fail before Supabase starts
  → supabase/setup-cli (pin 2.104.0)
  → supabase start
  → write .env.test from supabase status
  → npm test -- --project integration
  → supabase stop
```

This ordering fast-fails on lint or unit errors before spending ~20–30 s
starting Supabase.

## Critical Implementation Details

**`supabase status -o env` variable name mapping.** The CLI outputs the URL
under the key `API_URL` (not `SUPABASE_URL`), plus `ANON_KEY` and
`SERVICE_ROLE_KEY`. `src/integration/setup-env.ts` loads `.env.test` and the
helpers read `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY`. The `.env.test` write step must grep each key from
the status output and rename it. Additionally, every value in the CLI output is
wrapped in double quotes (e.g. `API_URL="http://127.0.0.1:54321"`), so the
extraction uses `cut -d'"' -f2` to pull the unquoted value rather than
`cut -d= -f2-` (which would keep the surrounding quotes). Verified against
`npx supabase status -o env` (CLI 2.104.0).

**`astro sync` before lint.** `npm run lint` uses type-checked ESLint, which
requires the `src/env.d.ts` generated by `npx astro sync`. Without it, the lint
step may fail with "cannot find module 'astro:env/server'" type errors. Always
run `npx astro sync` as a step immediately before `npm run lint`.

---

## Phase 1: CI workflow + Vitest integration timeout

### Overview

Create `.github/workflows/ci.yml` (and the `.github/workflows/` directory it
lives in). Add `testTimeout: 30_000` to the `integration` project in
`vitest.config.ts` so that cold Supabase start and auth round-trips in CI do not
cause timeout flakes.

### Changes Required

#### 1. Vitest integration project timeout

**File**: `vitest.config.ts`

**Intent**: Add `testTimeout: 30_000` to the `integration` project config block
so individual integration tests have a 30 s ceiling in CI (vs the 5 s default).
Unit project is unchanged.

**Contract**: Inside the `integration` project object (lines 30–38), add
`testTimeout: 30_000` alongside the existing `name`, `environment`, `setupFiles`,
and `include` keys.

#### 2. GitHub Actions CI workflow

**File**: `.github/workflows/ci.yml` (new file; create the `.github/workflows/`
directory)

**Intent**: Implement the sequential lint → unit → Supabase-backed integration
pipeline described in the Implementation Approach section.

**Contract**: The workflow triggers on `push` and `pull_request` targeting
`main`. It runs a single job named `ci` on `ubuntu-latest`. The `supabase
status` output is captured once into a shell variable, then the three required
keys are extracted with `grep` / `cut` and written to `.env.test` with the names
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The
`supabase/setup-cli` action is pinned to version `2.104.0` (matching the
lockfile) and passes `${{ secrets.GITHUB_TOKEN }}` to avoid GitHub API rate
limits during CLI download.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

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

      - name: Run unit tests
        run: npm test -- --project unit

      - uses: supabase/setup-cli@v1
        with:
          version: 2.104.0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Start local Supabase
        run: npx supabase start

      - name: Write .env.test
        run: |
          STATUS=$(npx supabase status -o env)
          SUPABASE_URL=$(echo "$STATUS" | grep '^SUPABASE_URL=' | cut -d= -f2-)
          ANON_KEY=$(echo "$STATUS" | grep '^ANON_KEY=' | cut -d= -f2-)
          SERVICE_ROLE_KEY=$(echo "$STATUS" | grep '^SERVICE_ROLE_KEY=' | cut -d= -f2-)
          printf 'SUPABASE_URL=%s\nSUPABASE_ANON_KEY=%s\nSUPABASE_SERVICE_ROLE_KEY=%s\n' \
            "$SUPABASE_URL" "$ANON_KEY" "$SERVICE_ROLE_KEY" > .env.test

      - name: Run integration tests
        run: npm test -- --project integration

      - name: Stop Supabase
        if: always()
        run: npx supabase stop
```

### Success Criteria

#### Automated Verification

- Lint clean locally: `npm run lint`
- Unit tests pass: `npm test -- --project unit`
- `.github/workflows/ci.yml` exists on disk

#### Manual Verification

- Push a branch and open a PR to `main`; the `CI` check appears and turns
  green within ~3–5 minutes
- In the Actions run, confirm: `Run unit tests` step is green, `Start local
  Supabase` step shows Supabase startup output, `Run integration tests` step
  shows all integration suites passing
- Introduce a deliberate lint error on the branch; confirm the CI job fails at
  the lint step before Supabase starts

**Implementation Note**: After Phase 1 automated verification passes locally,
open a PR to verify the Actions run end-to-end. Manual smoke of the Actions log
is required before proceeding to Phase 2.

---

## Phase 2: Correct stale CI documentation

### Overview

Update the one stale CI sentence in `AGENTS.md` and `CLAUDE.md`. Both files
currently claim GitHub Actions runs lint+build, which has been false since
commit `d608061`. After Phase 1 lands, update them to reflect what CI actually
does.

### Changes Required

#### 1. AGENTS.md

**File**: `AGENTS.md`

**Intent**: Replace the stale CI gate description with one that accurately
reflects the new workflow (lint + unit + integration, no build step, no secrets
required for tests).

**Contract**: Find the line starting `**CI gate**` (or `## Commit & CI` section)
and update the description. New description should state: runs `npm run lint`,
unit tests, and integration tests (with local Supabase) on push/PR to `main`;
Cloudflare Pages handles build/deploy separately.

#### 2. CLAUDE.md

**File**: `CLAUDE.md`

**Intent**: Update the `## CI` section to reflect the new workflow. The current
text claims "runs lint + build" and "Requires `SUPABASE_URL` and `SUPABASE_KEY`
repository secrets for the build step" — both are stale.

**Contract**: Replace the paragraph under `## CI` with accurate information:
the workflow runs lint, unit tests, and integration tests; integration tests
start a local Supabase instance in the CI job; no additional GitHub repository
secrets are required beyond `GITHUB_TOKEN` (auto-provided by Actions).

### Success Criteria

#### Automated Verification

- Lint clean: `npm run lint`

#### Manual Verification

- Both files accurately describe what the CI workflow does

---

## Testing Strategy

This change _is_ the CI wiring — there are no new application tests to write.
The validation is the CI run itself.

### Manual Testing Steps

1. Push Phase 1 changes to a feature branch.
2. Open a PR targeting `main`.
3. Confirm the `CI` check appears in the PR status bar.
4. Wait for the run to complete; all steps should be green.
5. Inspect the "Run integration tests" step log — confirm multiple integration
   suites appear (middleware, share-token, handout-ownership, handout-validation).
6. Introduce a deliberate test failure (`it.only` or a broken assertion), push,
   confirm the job turns red and shows the failing test name.
7. Revert the deliberate failure.

## References

- Research: `context/changes/testing-quality-gate-wiring/research.md`
- Vitest config: `vitest.config.ts:17-42`
- Integration env bootstrap: `src/integration/setup-env.ts:1-26`
- Env var template: `.env.test.example:1-4`
- Supabase ports: `supabase/config.toml:10` (API 54321), `supabase/config.toml:29` (DB 54322)
- Test plan Phase 4: `context/foundation/test-plan.md` §3
- Former workflow (deleted `d608061`): reconstructed in research.md

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: CI workflow + Vitest integration timeout

#### Automated

- [x] 1.1 Lint clean locally: `npm run lint`
- [x] 1.2 Unit tests pass: `npm test -- --project unit`
- [x] 1.3 `.github/workflows/ci.yml` exists on disk

#### Manual

- [ ] 1.4 Push a PR to `main`; the `CI` check appears and turns green
- [ ] 1.5 Actions log shows integration suites running against Supabase
- [ ] 1.6 Deliberate lint failure causes the job to fail at the lint step (before Supabase starts)

### Phase 2: Correct stale CI documentation

#### Automated

- [ ] 2.1 Lint clean: `npm run lint`

#### Manual

- [ ] 2.2 `AGENTS.md` CI description is accurate
- [ ] 2.3 `CLAUDE.md` CI section is accurate
