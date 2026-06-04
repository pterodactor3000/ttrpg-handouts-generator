# Refresh test-plan.md After Phase 1 Harness — Implementation Plan

## Overview

Update `context/foundation/test-plan.md` so it reflects what actually shipped in
archived rollout Phase 1 (`context/archive/2026-06-03-testing-api-db-handout-coverage/`).
This is a documentation-only refresh: no new tests, no CI changes, no edits to §1
strategy or the §2 risk map beyond correcting Risk #4 response wording.

## Current State Analysis

The guide was authored 2026-06-03 when Phase 1 was `change opened`. Implementation
is complete and archived, but the guide still shows:

- Header / §8 freshness dated to Phase 1 opening
- §3 Phase 1 status `change opened` with an active change-folder path
- §4 harness row “none yet”
- §6.2 / §6.4 still TBD
- §6.6 empty
- Risk #4 response guidance still says “403/404” though cross-owner PUT returns 500
  (publish cross-owner returns 404) per archived research and live tests

The codebase now has:

- Vitest `unit` + `integration` projects (`vitest.config.ts`)
- Integration helpers under `src/integration/helpers/`
- Two integration suites (21 tests) exercising Risks #4, #6, #7; partial #5 (publish happy path)
- `.env.test.example` + `setup-env.ts` loading **only** `.env.test`

### Key Discoveries

- Refresh must **not** rewrite §2 risks or reorder §3 Phases 2–4 (per change.md out of scope).
- Cookbook content should describe the **handler-import + `vi.mock('@/lib/supabase')`** pattern, not HTTP e2e.
- Risk #5 archive/link-permanence remains deferred — §3 Phase 1 goal text can note partial #5 coverage without claiming archive tests exist.
- Principle #3 holds: cookbook cites paths as **patterns**, not failure anchors; no new `file:line` anchors in §2.

## Desired End State

`context/foundation/test-plan.md` is accurate for contributors and agents:

1. §3 Phase 1 is `complete` with archive folder `context/archive/2026-06-03-testing-api-db-handout-coverage/`.
2. §4 documents the integration harness (Vitest projects, `.env.test`, local Supabase).
3. §6.2 and §6.4 give copy-pasteable steps aligned with shipped helpers and suites.
4. §6.6 records rollout lessons (mock seam, env isolation, PUT 500 contract).
5. §2 Risk #4 “What would prove protection” matches observed HTTP behavior without file anchors.
6. Header + §8 freshness ledger updated to 2026-06-04.

Verification: a reader can follow §6.2 to add a new handout API integration test without reading the archive.

## What We're NOT Doing

- Re-running the original test-plan interview or rebuilding §2 from scratch
- Changing §3 Phases 2–4 status (remain `not started`)
- Adding CI integration (`§3 Phase 4`)
- Writing new integration or unit tests
- Editing application source under `src/pages/` or `vitest.config.ts` (unless a typo blocks verification)
- Committing `.env.test` (gitignored)

## Implementation Approach

Single documentation phase: edit `context/foundation/test-plan.md` in one pass using
`change.md` drift table as checklist, then verify with grep and a quick read of §6.

Preserve existing markdown structure and section numbering. Match tone of the current guide.

## Critical Implementation Details

**§2 Risk #4 row — wording only.** Replace “403/404, no mutation persisted” with language
that states: cross-owner mutations must not persist; PUT may return 500 with a generic
error; publish returns 404 when the row is not found for the caller. Do not add route
file paths to §2.

**§3 Phase 1 risks column.** Optionally append “(#5 partial: publish happy path only)”
to the Risks covered cell or add a footnote under the table — keep one line, no new rows.

**§6 cookbook — required bullets for §6.2** (minimum contract):

- Prereqs: `npx supabase start`, copy `.env.test.example` → `.env.test`
- Run: `npm test -- --project integration`
- File layout: `src/integration/handouts/*.integration.test.ts`, `src/integration/helpers/`
- Pattern: import handler from `@/pages/api/...`, `vi.mock('@/lib/supabase')`, inject
  `signInAsUser` client, `makeContext` for request/params, admin client for fixtures
- Teardown: delete handouts by `gm_id`, delete test users in `afterAll`
- Errors: call `assertNoSchemaLeakage` on every non-2xx body

**§6.4** can cross-reference §6.2 and add endpoint-specific checklist (zod boundaries,
ownership filter, generic error messages).

---

## Phase 1: Sync test-plan.md With Shipped Harness

### Overview

Apply all guide updates in one edit pass to `context/foundation/test-plan.md`.

### Changes Required

#### 1. Header and §8 Freshness Ledger

**File**: `context/foundation/test-plan.md`

**Intent**: Bump “Last updated” and §8 dates to 2026-06-04; note Phase 1 complete.

**Contract**: Line 9 `Last updated:` and §8 three “last reviewed/verified” lines.

#### 2. §3 Phased Rollout — Phase 1 row

**File**: `context/foundation/test-plan.md`

**Intent**: Mark Phase 1 `complete` and point to the archive folder.

**Contract**: Phase 1 `Status` cell → `complete`; `Change folder` cell →
`` `context/archive/2026-06-03-testing-api-db-handout-coverage/` ``.

#### 3. §4 Stack — harness row and grounding dates

**File**: `context/foundation/test-plan.md`

**Intent**: Replace “none yet” harness row with shipped stack facts; refresh `checked:` dates to 2026-06-04.

**Contract**: Row “API + DB integration harness” notes Vitest integration project,
`.env.test` / `.env.test.example`, `setup-env.ts`, local Supabase requirement.
Stack grounding tool lines: `checked: 2026-06-04`.

#### 4. §2 Risk Response Guidance — Risk #4 only

**File**: `context/foundation/test-plan.md`

**Intent**: Align “What would prove protection” with implemented behavior (no mutation;
PUT 500 / publish 404 semantics).

**Contract**: Single table cell edit in Risk #4 row — no new columns, no file anchors.

#### 5. §6.2 Adding an integration test (API + DB)

**File**: `context/foundation/test-plan.md`

**Intent**: Replace TBD with the shipped cookbook pattern (prereqs, layout, mock seam, fixtures, assertions).

**Contract**: Full subsection body; reference suites:
`handout-ownership.integration.test.ts`, `handout-validation.integration.test.ts`.

#### 6. §6.4 Adding a test for a new API endpoint

**File**: `context/foundation/test-plan.md`

**Intent**: Replace TBD with endpoint checklist derived from §6.2 pattern.

**Contract**: Bullets for: mock setup, valid/invalid body cases, ownership case if mutating,
`assertNoSchemaLeakage` on errors, admin DB assertions when needed.

#### 7. §6.6 Per-rollout-phase notes — Phase 1

**File**: `context/foundation/test-plan.md`

**Intent**: Append 2–3 lines for Phase 1 lessons.

**Contract**: Note mock bypasses cookie SSR; `.env.test` loaded in isolation; cross-owner PUT returns 500 by design today.

### Success Criteria

#### Automated Verification

- `rg 'change opened' context/foundation/test-plan.md` returns no matches
- `rg 'none yet — see §3 Phase 1' context/foundation/test-plan.md` returns no matches
- `rg 'TBD — see §3 Phase 1' context/foundation/test-plan.md` returns no matches
- `npm run format -- context/foundation/test-plan.md` succeeds (if format script covers md)
- `npm test -- --project integration` passes (sanity: no accidental code edits)
- `npm test -- --project unit` passes

#### Manual Verification

- Read §6.2 end-to-end: a new contributor could add an integration test without the archive
- Confirm §3 Phase 1 row shows `complete` and the archive path
- Confirm §2 Risk #4 wording does not promise 403 on PUT

**Implementation Note**: After automated checks pass, skim the full guide for internal consistency (Phases 2–4 still `not started`, §5 gates unchanged).

---

## Testing Strategy

No new tests. Sanity-run existing suite to ensure the working tree was not accidentally modified.

### Manual Testing Steps

1. Open `context/foundation/test-plan.md` beside `src/integration/handouts/` and verify §6 paths match disk.
2. Optionally run `/10x-test-plan --status` and confirm Phase 1 displays `complete` after §3 edit.

## References

- Refresh scope: `context/changes/test-plan-refresh-2026-06-04/change.md`
- Archived implementation: `context/archive/2026-06-03-testing-api-db-handout-coverage/`
- Live harness: `vitest.config.ts`, `src/integration/`, `.env.test.example`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Sync test-plan.md With Shipped Harness

#### Automated

- [x] 1.1 Stale strings absent (`change opened`, harness TBD, §6 Phase 1 TBD) — 86c1106
- [x] 1.2 `npm test -- --project integration` passes — 86c1106
- [x] 1.3 `npm test -- --project unit` passes — 86c1106

#### Manual

- [x] 1.4 §6.2 is actionable for a new integration test — 86c1106
- [x] 1.5 §3 Phase 1 shows `complete` with archive path — 86c1106
- [x] 1.6 §2 Risk #4 wording matches PUT 500 / publish 404 behavior — 86c1106
