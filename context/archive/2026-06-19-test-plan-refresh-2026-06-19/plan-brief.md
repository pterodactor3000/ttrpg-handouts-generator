# Test Plan 2026-06-19 Refresh — Plan Brief

> Full plan: `context/changes/test-plan-refresh-2026-06-19/plan.md`

## What & Why

`context/foundation/test-plan.md` has drifted since 2026-06-06: every §6 test path is wrong (the tree was reorganised), the e2e and Sentry stack entries are missing, Risk #5 still says "no archive endpoint," and a new high-impact risk (RLS/migration prod parity) was surfaced by the 2026-06-19 interview. This refresh corrects the drift, adds Risk #8, wires the existing Playwright suite into CI, and adds integration tests that prove the access-control policy matrix holds after every migration.

## Starting Point

Four original rollout phases are complete. `context/foundation/test-plan.md` was last touched 2026-06-06. Since then the codebase shipped Playwright e2e, Sentry, archive/delete endpoints, and a test-tree reorganisation — none of which appear in the plan.

## Desired End State

`test-plan.md` accurately describes the 2026-06-19 test layout, tools, and risk map. A new integration suite (`__tests__/integration/migration/rls-policy-matrix.integration.test.ts`) catches RLS policy regressions on every CI run. Playwright e2e runs as an optional (non-blocking) CI gate on every PR. Three new §3 rollout phase rows document this cycle.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| E2E gate level | optional (`continue-on-error: true`) | SSR layer is already covered at integration; e2e adds a supplementary net, not a hard blocker | Plan |
| Risk #8 test layout | new `__tests__/integration/migration/` folder | Separates migration-safety concerns from feature-area tests, making the policy matrix easy to find and update | Plan |
| §6.5 e2e section | update in-place (replace "not required") | The e2e suite exists — the section should document how to use it, not say it doesn't exist | Plan |
| §6.8 archive/delete | new section (current §6.8 becomes §6.9) | The pattern is distinct enough from §6.6 (state-machine transitions + side-effect assertions) to warrant its own entry | Plan |

## Scope

**In scope:**
- All §6 path corrections (unit, integration, middleware, share-token, markdown safety)
- §4 stack: add e2e row, Sentry row, fix browser grounding tool and `checked:` dates
- §5 gates: add planned e2e gate (Phase 1), activate it (Phase 3)
- §2: add Risk #8 + response guidance; fix Risk #5 archive note
- §3: append phases 5–7
- §8 ledger: bump dates to 2026-06-19
- New integration suite for Risk #8 (RLS/migration policy matrix)
- `playwright.config.ts` CI portability fix (`executablePath`)
- CI e2e step with `.dev.vars` write + artifact upload

**Out of scope:**
- Restructuring `__tests__/` or moving test files
- Sentry SDK internals testing
- UI snapshot tests
- Any application source code changes

## Architecture / Approach

Three sequential phases. Phase 1 is pure prose (doc-only, no code). Phase 2 adds a new integration suite that must be green before Phase 3 touches CI. The test-plan.md is not edited until Phase 1 begins; CI is not changed until Phase 3.

The Risk #8 suite follows the same no-mock pattern as `share-token-read.integration.test.ts` — raw Supabase clients so the RLS policies are actually exercised. CI already provides a fresh Supabase instance (`supabase start`), so no new infrastructure is needed.

The CI e2e step has two non-obvious requirements: the `executablePath` in `playwright.config.ts` must be made conditional on `process.env.CI` (or the Ubuntu runner can't find chromium), and `.dev.vars` must be written before `npm run dev` starts (Cloudflare workerd reads secrets from `.dev.vars`, not `.env.test`).

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Guide reconciliation | Corrected test-plan.md: paths, stack, Risk #8, Risk #5 fix, §3 rows, §8 dates | Missing a stale reference (low — inventory was exhaustive) |
| 2. RLS + migration safety | `rls-policy-matrix.integration.test.ts` catching policy regressions | Raw-client approach requires local Supabase to be running; skip `vi.mock` |
| 3. E2E CI wiring | Playwright runs on every PR; `playwright.config.ts` fix; §5 gate activated | `.dev.vars` must be written before `npm run dev` starts in CI |

**Prerequisites:** Local Supabase running (`npx supabase start`) for Phase 2. A branch/PR available to verify the CI e2e check for Phase 3.

**Estimated effort:** ~2 sessions — Phase 1 is a careful doc edit (≈1 session); Phases 2 and 3 together are ≈1 session.

## Open Risks & Assumptions

- The archive endpoint (`POST /api/handouts/:id/archive`) is assumed to work correctly in integration test setup (seeding via admin client is the fallback).
- The e2e `auth.setup.ts` credential seeding is assumed to work in CI against the fresh Supabase instance; if it fails, the e2e step will error (but `continue-on-error: true` prevents blocking).
- Playwright `--with-deps` installs system dependencies on Ubuntu; assumed to be sufficient for headless chromium without manual apt steps.

## Success Criteria (Summary)

- `npm test` (unit + integration, including the new migration suite) is green locally and in CI
- `npm run test:e2e` is green locally and appears as a (optional) CI check on PRs
- `context/foundation/test-plan.md` passes a manual section-by-section review against the live `__tests__/` tree
