---
change_id: test-plan-refresh-2026-06-04
title: Refresh test-plan.md after Phase 1 harness shipped
status: implementing
created: 2026-06-04
updated: 2026-06-04
archived_at: null
---

## Notes

Refresh `context/foundation/test-plan.md` after rollout Phase 1 landed in
`context/archive/2026-06-03-testing-api-db-handout-coverage/`. Do **not** edit
the guide in place until the implement chain’s final sub-phase.

### Shipped since the guide was written (2026-06-03)

- Vitest **unit** + **integration** projects in `vitest.config.ts` (`exclude`
  integration from unit glob).
- Integration env: `.env.test` (gitignored) + `.env.test.example`; loaded only via
  `src/integration/setup-env.ts`.
- Helpers: `admin-client.ts`, `test-users.ts`, `context-stub.ts` (incl. `rawBody`),
  `assert-no-schema-leakage.ts`.
- Suites: `handout-ownership.integration.test.ts` (6), `handout-validation.integration.test.ts`
  (14) — 21 integration tests total; smoke test removed.
- Risks exercised in tests: **#4** (IDOR), **#6** (validation), **#7** (schema
  leakage helper); **#5** partial (own-row publish only; archive/link-permanence
  still deferred per archived plan).

### Guide drift to correct in the refresh deliverable

| Section             | Current state                       | Target                                                                 |
| ------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| Header / §8         | “Phase 1 change opened”, 2026-06-03 | Last updated 2026-06-04; ledger bumped                                 |
| §3 Phase 1          | `change opened`, active change path | `complete`, archive folder path                                        |
| §4 harness row      | “none yet”                          | Vitest 4.1.x projects + local Supabase requirement                     |
| §6.2 / §6.4         | TBD                                 | Cookbook: handler import, `vi.mock`, fixtures, `assertNoSchemaLeakage` |
| §6.6                | empty                               | Short notes: mock seam, `.env.test` isolation, PUT cross-owner 500     |
| §2 Risk #4 response | “403/404”                           | Wording: no mutation; PUT 500 / publish 404 (no file anchors)          |

### Out of scope

- Rebuilding §2 risk map or interview from scratch.
- Starting rollout Phases 2–4 (access-control, markdown safety, CI).
- Adding new tests (doc-only refresh).

### Hot-spot signal (30d, `src/`)

New churn in `src/integration/` (helpers + handout suites). Handout API routes and
`middleware.ts` remain active — supports keeping Phases 2–4 ordering unchanged.

### Test-base profile (2026-06-04)

**meaningful** — vitest configured; 4 test files (2 unit, 2 integration); 45 tests
total (`npm test` runs both projects).

### Stack grounding (session)

- Docs: Context7 MCP — available; checked: 2026-06-04
- Search: none in session; checked: 2026-06-04
- Browser: cursor-ide-browser — available; checked: 2026-06-04
- Platform: Linear + gh — available; checked: 2026-06-04
