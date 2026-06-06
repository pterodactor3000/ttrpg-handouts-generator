# Quality-Gate Wiring — Plan Brief

> Full plan: `context/changes/testing-quality-gate-wiring/plan.md`
> Research: `context/changes/testing-quality-gate-wiring/research.md`

## What & Why

Wire the full Vitest suite (unit + integration) into a GitHub Actions CI
gate so that lint regressions, logic errors, and DB-contract breaks are
caught on every PR before merge. This is rollout Phase 4 of
`context/foundation/test-plan.md`; all prior phases deferred CI wiring
explicitly.

## Starting Point

No `.github/workflows/` directory exists — the former workflow was deleted
in commit `d608061` (2026-05-25) when deployment moved to Cloudflare Pages.
Tests have never run in any CI pipeline. `AGENTS.md` and `CLAUDE.md` still
describe the now-deleted workflow.

## Desired End State

Every push and PR to `master` triggers a single CI job that runs lint, all
unit tests, then all integration tests against a local Supabase instance
started inside the job. The job blocks merges on any failure. Docs accurately
describe what CI does.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Workflow scope | Lint + unit + integration (no build) | CF Pages handles the build gate; lint was always there and is fast | Plan |
| Job structure | Single sequential job | Fast-fail on unit errors before paying Supabase startup time | Plan |
| Trigger | Push + PR to `master` | Matches old workflow; catches hotfix pushes to master | Plan |
| Integration `testTimeout` | 30 s | Generous headroom for cold Supabase boot + auth round-trips in CI | Research (open Q) |
| Stale-doc fix | Fix in this change | Stale CI claim in AGENTS.md + CLAUDE.md misleads future contributors | Plan |
| GitHub secrets for tests | None required | All three env vars come from `supabase status` at runtime | Research |

## Scope

**In scope:**
- New `.github/workflows/ci.yml` (greenfield — directory does not exist)
- `testTimeout: 30_000` added to `vitest.config.ts` integration project
- One-line CI description update in `AGENTS.md`
- CI section update in `CLAUDE.md`

**Out of scope:**
- `npm run build` in this workflow (CF Pages gate)
- New GitHub repository secrets
- Docker layer caching (follow-up optimization)
- New npm script aliases for `test:unit` / `test:integration`
- e2e / Playwright layer

## Architecture / Approach

Single job, sequential steps on `ubuntu-latest` (Docker pre-installed):

```
checkout → setup-node(22) → npm ci
  → npx astro sync           ← generates types needed for type-checked ESLint
  → npm run lint
  → npm test --project unit  ← fast-fail before Supabase starts
  → supabase/setup-cli@v1 (pin 2.104.0)
  → supabase start            ← applies the one migration automatically
  → write .env.test           ← grep ANON_KEY / SERVICE_ROLE_KEY from status output
  → npm test --project integration
  → supabase stop (always)
```

Key non-obvious detail: `supabase status -o env` outputs `ANON_KEY` and
`SERVICE_ROLE_KEY`, but `setup-env.ts` expects `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY`. The `.env.test` write step must rename these.
Verify the exact key names from the local CLI before pushing the workflow.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. CI workflow + timeout | Green CI check on first PR; integration tests run against real Supabase | `supabase status` key names may differ from expected — verify locally first |
| 2. Stale-doc corrections | `AGENTS.md` + `CLAUDE.md` accurately describe CI | Trivial — one-liner edits |

**Prerequisites:** Phase 1 of this change must be merged before Phase 2 is
meaningful. Local Supabase must be running once to verify the env-var extraction
script produces the correct `.env.test`.

**Estimated effort:** ~1 session across 2 phases.

## Open Risks & Assumptions

- **`supabase status` key name assumption.** The plan assumes `ANON_KEY` and
  `SERVICE_ROLE_KEY` are the correct grep targets for Supabase CLI 2.104.0.
  Verify with `npx supabase status -o env` locally before merging Phase 1.
- **`supabase start` duration in CI.** Estimated 20–30 s on `ubuntu-latest`;
  the 30 s `testTimeout` should absorb this, but if flakes appear, raise the
  timeout or investigate Supabase Docker image caching.
- **`supabase/setup-cli` action availability.** The action is maintained by
  Supabase; if the pinned version `v1` is unavailable or the CLI download
  is rate-limited, the `GITHUB_TOKEN` parameter mitigates the latter.

## Success Criteria (Summary)

- A PR to `master` shows a green `CI` check within ~5 minutes.
- The Actions log confirms integration suites ran (middleware, share-token,
  handout-ownership, handout-validation).
- A deliberate test failure causes the job to go red and surface the failing
  test name.
