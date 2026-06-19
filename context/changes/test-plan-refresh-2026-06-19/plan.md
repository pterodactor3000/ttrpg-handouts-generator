# Test Plan 2026-06-19 Refresh Implementation Plan

## Overview

Refresh `context/foundation/test-plan.md` to correct seven categories of drift accumulated since the 2026-06-06 final rollout phase: stale §6 paths, missing e2e and Sentry stack rows, a stale Risk #5 archive note, and outdated §8 ledger dates. Append Risk #8 (RLS/migration prod parity) to the risk map. Add three new §3 rollout phases. Follow with a new migration-safety integration suite (Phase 2) and Playwright CI wiring (Phase 3). The live test-plan.md is not edited until Phase 1.

## Current State Analysis

`context/foundation/test-plan.md` was last updated 2026-06-06. Four rollout phases are complete. Since then, the project shipped Playwright e2e, Sentry, per-style fonts, and archive/delete endpoints — none of which appear in the plan. The test tree was also reorganised: everything moved from `src/integration/` and `src/lib/__tests__/` to `__tests__/integration/` and `__tests__/lib/` respectively.

### Key Discoveries

- `vitest.config.ts` confirms: integration tests at `__tests__/integration/`, unit tests at `__tests__/**/*.test.{ts,tsx}` excluding `__tests__/integration/`. Every §6 path in the current test-plan.md is wrong.
- `e2e/player-share-link.spec.ts` exists, has 2 test cases (published handout visible to anon player; unknown token shows not-found). `npm run test:e2e` is the run command. Neither appears in §4 or §5.
- `package.json` has `@sentry/astro ^10.57.0` and `@sentry/cloudflare ^10.57.0`. No §4 stack row.
- `__tests__/integration/handouts/archive-handout.integration.test.ts` and `delete-archived-handout.integration.test.ts` exist with no §6 cookbook entry. §6.4 Phase 2 note still says "admin-inserted — no app archive endpoint yet."
- `playwright.config.ts` sets `executablePath: '/usr/bin/chromium'` (Arch Linux path), which does not exist on Ubuntu CI runners. `webServer.reuseExistingServer: !process.env.CI` means CI starts a fresh dev server — which reads secrets from `.dev.vars` (Cloudflare workerd), not `.env.test`.
- Risk #8 (migration/RLS prod parity) is absent from §2 entirely.

## Desired End State

`context/foundation/test-plan.md` accurately reflects the test layout, tools, risk map, and rollout state as of 2026-06-19. A new integration suite (`__tests__/integration/migration/rls-policy-matrix.integration.test.ts`) proves the GM × anon × cross-owner access matrix after every migration. `.github/workflows/ci.yml` runs `npm run test:e2e` as an optional (non-blocking) step on every PR, and §5 reflects that.

## What We're NOT Doing

- Not restructuring `__tests__/` or moving any test file.
- Not editing `context/foundation/test-plan.md` until Phase 1 completes all changes.
- Not adding CI changes until Phase 3.
- Not testing Sentry SDK internals (§7 third-party exclusion holds).
- Not adding UI snapshot tests (§7 exclusion unchanged).
- Not touching any application source code.

## Implementation Approach

Three sequential phases, each with its own verification gate. Phase 1 is doc-only and can be reviewed before any code is written. Phase 2 adds integration tests that must pass locally before Phase 3 touches CI.

## Critical Implementation Details

- **`playwright.config.ts` `executablePath`**: must be conditioned on `process.env.CI` before the CI e2e step can run. Playwright ignores its own downloaded binary when a hardcoded path is set — the `/usr/bin/chromium` path is absent on Ubuntu, causing the CI job to error before any test runs.
- **Dev server vars in CI**: `playwright.config.ts` `webServer` starts `npm run dev` (Cloudflare workerd). Workerd reads secrets from `.dev.vars`, not from `.env.test`. Phase 3 CI must write `.dev.vars` with the same Supabase vars before launching the e2e step, or the dev server starts without a DB connection.
- **Risk #8 migration suite**: must use raw Supabase clients only — no `vi.mock('@/lib/supabase')`. The RLS policy is the subject under test; mocking the client defeats the purpose entirely.

---

## Phase 1: Guide Reconciliation

### Overview

Edit `context/foundation/test-plan.md` in place to fix every category of drift identified in the staleness inventory. No code changes. After this phase, the plan accurately describes the current test layout and tooling, includes Risk #8 in the risk map, and has three new §3 rollout rows.

### Changes Required

#### 1. §4 Stack — e2e row

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the "none yet" e2e row with the actual Playwright setup that has shipped.

**Contract**: The e2e row becomes: Layer `e2e`, Tool `Playwright`, Version `1.60.x`, Notes: "`testDir: './e2e'`, `npm run test:e2e`; chromium; `e2e/player-share-link.spec.ts` covers Risk #2 SSR layer (2 tests: published handout + unknown token)."

#### 2. §4 Stack — Sentry row

**File**: `context/foundation/test-plan.md`

**Intent**: Document the Sentry integration that shipped.

**Contract**: Add row: Layer `observability`, Tool `@sentry/astro + @sentry/cloudflare`, Version `10.57.x`, Notes: "Astro integration + Cloudflare adapter; source maps uploaded at build (`npm run build`); DSN via `PUBLIC_SENTRY_DSN`."

#### 3. §4 Stack grounding tools — browser layer + checked dates

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the stale `cursor-ide-browser MCP` reference with Playwright MCP, and bump all `checked:` dates in the grounding block.

**Contract**: `Runtime/browser` row: "Playwright MCP — available; e2e layer for the share SSR page (Risk #2 SSR layer); checked: 2026-06-19." Set `checked: 2026-06-19` on all three grounding tool rows (Docs, Runtime/browser, Provider/platform).

#### 4. §5 Quality gates — e2e row

**File**: `context/foundation/test-plan.md`

**Intent**: Add a planned-optional e2e gate row that Phase 3 will activate.

**Contract**: New row: Gate `e2e on share path`, Where `CI on PR`, Required? `planned (optional) — flip to optional once §3 Phase 7 lands`, Catches `broken SSR player read path (Risk #2)`.

#### 5. §6.1 unit test paths

**File**: `context/foundation/test-plan.md`

**Intent**: Fix stale Location and Reference test paths.

**Contract**: Location: `__tests__/lib/` (or `__tests__/` next to the unit under test). Reference test: `__tests__/lib/handout-renderer.test.ts`.

#### 6. §6.2 integration test paths

**File**: `context/foundation/test-plan.md`

**Intent**: Fix all stale `src/integration/` paths — suites, helpers, and setup file moved to `__tests__/integration/`.

**Contract**: Update every path: `src/integration/handouts/` → `__tests__/integration/handouts/`, `src/integration/helpers/` → `__tests__/integration/helpers/`, `src/integration/setup-env.ts` → `__tests__/integration/setup-env.ts`. Reference suites:
- `__tests__/integration/handouts/handout-ownership.integration.test.ts` — Risk #4
- `__tests__/integration/handouts/handout-validation.integration.test.ts` — Risk #6

#### 7. §6.3 middleware test paths

**File**: `context/foundation/test-plan.md`

**Intent**: Fix stale middleware suite and helper paths.

**Contract**: Suite at `__tests__/integration/middleware/*.integration.test.ts`. Helpers `middleware-context-stub.ts` and `astro-middleware-stub.ts` at `__tests__/integration/helpers/`. Reference suite: `__tests__/integration/middleware/auth-gate.integration.test.ts`.

#### 8. §6.4 share-token paths + archive note

**File**: `context/foundation/test-plan.md`

**Intent**: Fix stale share-token path and update step 3 to reflect that the archive endpoint now exists.

**Contract**: Suite at `__tests__/integration/share/*.integration.test.ts`. In step 3 (cover cases), replace "admin-inserted — no app archive endpoint yet" with "archived status can be set via the archive endpoint (`POST /api/handouts/:id/archive`) or admin-inserted for setup speed." In §6.9 (Phase 2 per-rollout note, after renumbering): replace "Archived link-permanence fixtures are admin-inserted because S-04 archive endpoint is not shipped yet" with "Archived link-permanence fixtures can now use the archive endpoint; admin insertion remains valid for setup speed."

#### 9. §6.5 e2e pattern (in-place replacement)

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the "Not required" stub with a real cookbook entry — the Playwright suite exists and covers the SSR share-link path.

**Contract**: Replace the body of §6.5 with:

- **Location**: `e2e/*.spec.ts`
- **Run locally**: `npm run test:e2e` (requires `npm run dev` running; `e2e/auth.json` populated by `npx playwright test --project setup`)
- **Pattern**:
  1. `storageState: 'e2e/auth.json'` (set in `playwright.config.ts`) provides an authenticated GM session for tests that need it.
  2. For anonymous player tests: `browser.newContext()` without storageState, then `.goto('/share/<token>')`.
  3. Assert UI-visible outcomes (`getByRole`, `getByText`) — not internal DOM structure or styling.
  4. Do not snapshot rendered HTML or assert CSS classes — see §7.
- **Reference suite**: `e2e/player-share-link.spec.ts` — Risk #2 (SSR layer: published handout visible to anonymous player; unknown token returns not-found page).
- **When to add**: only when a risk cannot be proven without a browser (SSR page rendering, cookie-based redirect chains). The integration layer covers DB contracts and middleware logic; e2e adds only what integration cannot reach.

#### 10. §6.6 archive/delete reference suites

**File**: `context/foundation/test-plan.md`

**Intent**: Point readers at the two new archive/delete endpoint suites as additional reference examples alongside the existing ownership and validation suites.

**Contract**: In the §6.6 checklist, add under "Fixtures": "See `__tests__/integration/handouts/archive-handout.integration.test.ts` and `delete-archived-handout.integration.test.ts` for state-machine transition patterns (status flip + side-effect assertions)."

#### 11. §6.7 markdown safety path

**File**: `context/foundation/test-plan.md`

**Intent**: Fix the stale reference suite path (two occurrences: Location bullet and Reference suite line).

**Contract**: Both occurrences: `src/lib/__tests__/handout-renderer.test.ts` → `__tests__/lib/handout-renderer.test.ts`.

#### 12. New §6.8 — archive/delete endpoint pattern

**File**: `context/foundation/test-plan.md`

**Intent**: Add a cookbook section for archive and delete-archived-handout endpoint tests, referencing the existing suites. The current §6.8 (per-rollout-phase notes) becomes §6.9.

**Contract**: Insert `### 6.8 Adding a test for archive/delete endpoints` before the current per-rollout-phase section. Content:

- **Location**: `__tests__/integration/handouts/`
- **Harness**: same `vi.mock('@/lib/supabase')` seam as §6.2
- **Pattern**:
  1. Seed a handout in the target pre-condition state (e.g. `published` for archive test) via `createAdminClient()`.
  2. Call the route handler (`POST` from `@/pages/api/handouts/[id]/archive` etc.) via `makeContext`.
  3. Assert the status transition: read the row back via admin client, confirm new `status`.
  4. Assert side effects: for archive, confirm the share-token query still resolves (Risk #5 link-permanence); for delete-archived, confirm the row is gone and `assertNoSchemaLeakage` on any error body.
  5. Teardown in `afterEach` by `gm_id`.
- **Reference suites**:
  - `__tests__/integration/handouts/archive-handout.integration.test.ts` — Risk #5 partial (archive transition + link-permanence)
  - `__tests__/integration/handouts/delete-archived-handout.integration.test.ts` — state-machine enforcement (can only delete when archived)

#### 13. §2 Risk map — add Risk #8

**File**: `context/foundation/test-plan.md`

**Intent**: Append Risk #8 to the risk map table.

**Contract**: New row:

| `#8` | Migration or RLS policy change applies cleanly locally but breaks prod access patterns (GM CRUD fails, anonymous share read denied, or cross-owner access widened) | High | Medium | interview Q2+Q3; hot-spot `supabase/migrations` |

#### 14. §2 Risk Response Guidance — add Risk #8

**File**: `context/foundation/test-plan.md`

**Intent**: Add the response row for Risk #8.

**Contract**: New row:

| `#8` | On a fresh Supabase: GM own-row CRUD succeeds; anon share read succeeds for `published` + `archived`; anon read denied for `draft` + unknown token; cross-owner SELECT/UPDATE/DELETE all blocked | "migration ran without error" does not mean "policies enforce correctly" | which policies changed in recent migrations; `handouts` table role × operation matrix; whether `anon` and `authenticated` roles are scoped correctly in each policy | integration (fresh Supabase — CI already provides this) | testing only against a long-lived local DB with accumulated state; treating successful DDL migration as proof of correct access behavior |

#### 15. §2 Risk #5 response — update archive note

**File**: `context/foundation/test-plan.md`

**Intent**: Correct the "archive via admin fixture" language in the Risk #5 response row — the archive endpoint now exists and link-permanence is testable at the app layer.

**Contract**: In the Risk #5 row of the response guidance table, update the "Context needed" column: add that the archive endpoint (`POST /api/handouts/:id/archive`) exists; link-permanence is now testable end-to-end through the app layer rather than only via admin-inserted fixtures.

#### 16. §3 Rollout — append phases 5–7

**File**: `context/foundation/test-plan.md`

**Intent**: Add the three rollout phases for this refresh cycle.

**Contract**: Append three rows to the §3 table:

| `5` | Guide reconciliation | Fix §4/§5/§6/§8 drift; add Risk #8 to risk map; no new tests | #8 (map update) | none | `complete` | `context/changes/test-plan-refresh-2026-06-19/` |
| `6` | RLS + migration safety | Prove GM CRUD, anon share read, and cross-owner denial on fresh Supabase after migration | #8 | integration | `not started` | `context/changes/test-plan-refresh-2026-06-19/` |
| `7` | E2E CI wiring | Wire Playwright share-path into CI; flip §5 e2e gate to optional | #2 (SSR) | e2e | `not started` | `context/changes/test-plan-refresh-2026-06-19/` |

Phase 5 is `complete` immediately because Phase 1 of this change _is_ the guide reconciliation.

#### 17. §8 Freshness ledger — bump dates

**File**: `context/foundation/test-plan.md`

**Intent**: Update all ledger dates to today.

**Contract**: Set "Strategy (§1–§5) last reviewed", "Stack versions last verified", and "AI-native tool references last verified" all to `2026-06-19`. Update the "Last updated" banner at the top: `Last updated: 2026-06-19 (Phase 7 in progress)`.

### Success Criteria

#### Automated Verification

- `npm run lint` passes (no regressions from the doc edit)
- `npm test -- --project unit` passes

#### Manual Verification

- All §6 paths have been spot-checked against the `__tests__/` folder tree
- §4 stack table has e2e row, Sentry row, and corrected browser grounding tool
- §2 risk map has #8; risk response table has #8; Risk #5 archive note updated
- §3 has phases 5–7 appended; Phase 5 is `complete`
- §8 ledger dates read `2026-06-19`

**Implementation Note**: After all automated verification passes and manual checks are done, pause for confirmation before starting Phase 2. Phase blocks use plain bullets — the `## Progress` section at the bottom is the sole checkbox tracker.

---

## Phase 2: RLS + Migration Safety

### Overview

Add a new integration suite that proves the role × operation access matrix for the `handouts` table on a fresh Supabase instance — the same environment CI uses. This catches RLS regressions introduced by future migration changes before they reach production.

### Changes Required

#### 1. New migration RLS policy matrix suite

**File**: `__tests__/integration/migration/rls-policy-matrix.integration.test.ts`

**Intent**: Prove that after the current migration state, GM own-row CRUD succeeds, anonymous share reads are correctly gated by status, and cross-owner access is denied — all on a fresh Supabase (no accumulated state).

**Contract**: No `vi.mock('@/lib/supabase')` — raw Supabase clients only. Two GM users via `createTestUser` (`gmA`, `gmB`); one anonymous client via `createClient(url, anonKey)` from `@supabase/supabase-js`; admin client via `createAdminClient()` for fixtures.

Six coverage groups, each as a `describe` block:

1. **GM own-row CRUD**: `gmA` creates a handout via the `POST /api/handouts` handler, reads it back via admin client, updates it, then verifies the update persisted.
2. **Anon share read — published**: admin seeds a published handout with a share token; anonymous client queries `.eq('share_token', token).in('status', ['published', 'archived']).single()` — expects a row.
3. **Anon share read — archived**: same query pattern with an archived-status fixture — expects a row (link-permanence).
4. **Anon share read — draft**: same query with a draft fixture — expects `PGRST116` + `data: null`.
5. **Anon share read — unknown token**: query with a well-formed but nonexistent UUID — expects `PGRST116` + `data: null`.
6. **Cross-owner access**: `gmB` attempts to SELECT, UPDATE, and DELETE a handout owned by `gmA` via raw Supabase client queries. Expects empty result or error; confirms via admin read-back that the row is unchanged.

Teardown: delete handouts by `gm_id` in `afterEach`; `deleteTestUser` for both users in `afterAll`.

#### 2. Update §3 Phase 6 status

**File**: `context/foundation/test-plan.md`

**Intent**: Mark Phase 6 as `complete` once this phase ships.

**Contract**: In the §3 table, set Phase 6 row `Status` to `complete`.

#### 3. Append Phase 6 per-rollout note

**File**: `context/foundation/test-plan.md`

**Intent**: Document what Phase 6 established for future test authors.

**Contract**: Append to §6.9 (per-rollout-phase notes): "**Phase 6 (RLS + migration safety).** Tests use raw Supabase clients — no `vi.mock`. Anonymous client: `createClient(url, anonKey)` from `@supabase/supabase-js`. Cross-owner cases assert both SELECT (must return empty/error) and UPDATE (admin read-back must show no mutation). The suite runs in CI against a fresh Supabase instance; do not run these against a long-lived local DB to avoid false passes from accumulated state."

### Success Criteria

#### Automated Verification

- `npm test -- --project integration` passes (new suite + all existing integration suites green)
- Each test in the new suite completes within the 30 s `testTimeout`

#### Manual Verification

- All six coverage groups have at least one test case each
- Spot-check: temporarily disable one RLS policy locally and confirm the corresponding test group fails (re-enable immediately)

**Implementation Note**: After all automated verification passes and the manual spot-check is done, pause for confirmation before starting Phase 3.

---

## Phase 3: E2E CI Wiring

### Overview

Wire the existing Playwright suite into CI as an optional (non-blocking) gate. Requires a one-line fix to `playwright.config.ts` for CI portability and a CI step that writes `.dev.vars` before starting the dev server.

### Changes Required

#### 1. `playwright.config.ts` — conditional executablePath

**File**: `playwright.config.ts`

**Intent**: Make the chromium binary path conditional on environment so CI uses Playwright's installed binary rather than the Arch Linux system path.

**Contract**: Change the `launchOptions.executablePath` in the `chromium` project from `'/usr/bin/chromium'` to `process.env.CI ? undefined : '/usr/bin/chromium'`. When `undefined`, Playwright uses the binary installed by `npx playwright install chromium`.

#### 2. `.github/workflows/ci.yml` — e2e steps

**File**: `.github/workflows/ci.yml`

**Intent**: Add four steps after the "Run integration tests" step (before "Stop Supabase") that install Playwright, write `.dev.vars`, run the e2e suite, and upload the report on failure.

**Contract**: Insert the following four steps in order, before the "Stop Supabase" step:

Step 1 — Write `.dev.vars`:
```yaml
- name: Write .dev.vars
  run: |
    STATUS=$(npx supabase status -o env)
    SUPABASE_URL=$(echo "$STATUS" | grep '^API_URL=' | cut -d'"' -f2)
    ANON_KEY=$(echo "$STATUS" | grep '^ANON_KEY=' | cut -d'"' -f2)
    printf 'SUPABASE_URL=%s\nSUPABASE_KEY=%s\n' "$SUPABASE_URL" "$ANON_KEY" > .dev.vars
```

Step 2 — Install Playwright browsers:
```yaml
- name: Install Playwright browsers
  run: npx playwright install chromium --with-deps
```

Step 3 — Run e2e tests:
```yaml
- name: Run e2e tests
  run: npm run test:e2e
  continue-on-error: true
```

Step 4 — Upload Playwright report:
```yaml
- name: Upload Playwright report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7
```

`continue-on-error: true` makes the gate optional — it runs and reports but does not block merge.

#### 3. Update §3 Phase 7 status

**File**: `context/foundation/test-plan.md`

**Intent**: Mark Phase 7 as `complete` once CI wiring ships.

**Contract**: In the §3 table, set Phase 7 row `Status` to `complete`.

#### 4. Update §5 e2e gate row

**File**: `context/foundation/test-plan.md`

**Intent**: Flip the e2e gate from "planned (optional)" to active.

**Contract**: Update the e2e gate Required? column to: `optional (CI on PR; \`continue-on-error: true\` — does not block merge)`.

#### 5. Append Phase 7 per-rollout note

**File**: `context/foundation/test-plan.md`

**Intent**: Document the two CI portability gotchas discovered during wiring.

**Contract**: Append to §6.9 (per-rollout-phase notes): "**Phase 7 (E2E CI wiring).** `playwright.config.ts` `executablePath` must be `undefined` in CI — Playwright's installed binary (from `npx playwright install chromium`) is not at `/usr/bin/chromium` on Ubuntu runners. `.dev.vars` must be written before `npm run dev` starts because Cloudflare workerd reads secrets from `.dev.vars`, not `.env.test`."

### Success Criteria

#### Automated Verification

- `npm run test:e2e` passes locally (both test cases green)
- CI run completes with an e2e job result (green) — confirm in a test PR or push to a branch
- Playwright HTML report artifact is present in the CI run artifacts

#### Manual Verification

- `playwright.config.ts` still selects `/usr/bin/chromium` locally on Arch (when `CI` env var is unset)
- CI PR check shows an e2e check entry (passes, or if red, `continue-on-error` is confirmed not blocking merge)

---

## Testing Strategy

This change's test surface is the integration suite added in Phase 2. Phases 1 and 3 are doc and config changes; their verification is the automated CI gates and the manual spot-checks listed above.

### Unit Tests

None — no application logic changes.

### Integration Tests

Phase 2 adds `__tests__/integration/migration/rls-policy-matrix.integration.test.ts`. The existing integration suite (`npm test -- --project integration`) must remain green throughout all phases.

### Manual Testing Steps

1. After Phase 1: walk every §6 sub-section and verify the path matches `__tests__/` on disk.
2. After Phase 2: disable one RLS policy, run the new suite, confirm the relevant group fails; re-enable.
3. After Phase 3: push to a branch, confirm CI shows an e2e check result and an uploaded artifact.

## References

- Current test-plan: `context/foundation/test-plan.md`
- Vitest config (confirms `__tests__/` layout): `vitest.config.ts`
- Playwright config: `playwright.config.ts`
- CI workflow: `.github/workflows/ci.yml`
- E2E reference suite: `e2e/player-share-link.spec.ts`
- Integration reference (no-mock RLS pattern): `__tests__/integration/share/share-token-read.integration.test.ts`
- Archive/delete reference suites: `__tests__/integration/handouts/archive-handout.integration.test.ts`, `__tests__/integration/handouts/delete-archived-handout.integration.test.ts`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Guide Reconciliation

#### Automated

- [x] 1.1 `npm run lint` passes — eed734c
- [x] 1.2 `npm test -- --project unit` passes — eed734c

#### Manual

- [x] 1.3 All §6 paths spot-checked against `__tests__/` folder tree — eed734c
- [x] 1.4 §4 stack table has e2e row, Sentry row, corrected browser grounding tool and checked dates — eed734c
- [x] 1.5 §2 risk map has Risk #8 row; risk response table has Risk #8 row; Risk #5 archive note updated — eed734c
- [x] 1.6 §3 has phases 5–7 appended; Phase 5 status is `complete` — eed734c
- [x] 1.7 §8 ledger dates read `2026-06-19` — eed734c

### Phase 2: RLS + Migration Safety

#### Automated

- [x] 2.1 `npm test -- --project integration` passes (new suite + all existing suites green) — a071bbf
- [x] 2.2 Each test in `rls-policy-matrix.integration.test.ts` completes within 30 s — a071bbf

#### Manual

- [x] 2.3 All six coverage groups have at least one test case — a071bbf
- [x] 2.4 Spot-check: disable one policy, confirm corresponding group fails; re-enable — a071bbf

### Phase 3: E2E CI Wiring

#### Automated

- [x] 3.1 `npm run test:e2e` passes locally (both test cases green)
- [ ] 3.2 CI run completes with e2e job result (green)
- [ ] 3.3 Playwright HTML report artifact present in CI run

#### Manual

- [ ] 3.4 `playwright.config.ts` still uses `/usr/bin/chromium` locally when `CI` env var is unset
- [ ] 3.5 CI PR check shows e2e entry; `continue-on-error` confirmed not blocking merge
