# Refresh test-plan.md After Phase 1 Harness — Plan Brief

> Full plan: `context/changes/test-plan-refresh-2026-06-04/plan.md`

## What & Why

Rollout Phase 1 shipped the Supabase API integration harness and handout-route tests,
but `context/foundation/test-plan.md` still describes Phase 1 as open and leaves §6
cookbook sections as TBD. This refresh syncs the guide with reality so future phases
and contributors use accurate instructions.

## Starting Point

- Archived change: `context/archive/2026-06-03-testing-api-db-handout-coverage/`
- Live harness: Vitest unit + integration projects, 21 integration tests, helpers in `src/integration/`
- Guide drift table in `change.md` lists every section to update

## Desired End State

`test-plan.md` shows Phase 1 `complete`, documents the harness in §4, fills §6.2/§6.4/§6.6,
corrects Risk #4 response wording (no file anchors), and updates freshness dates — with
Phases 2–4 unchanged.

## Key Decisions Made

| Decision         | Choice                       | Why                                          | Source                |
| ---------------- | ---------------------------- | -------------------------------------------- | --------------------- |
| Scope            | Doc-only `test-plan.md` edit | Matches `--refresh` contract; no new tests   | Change                |
| §2 risk map      | Wording fix for #4 only      | PUT returns 500, not 403; avoid anchor creep | Archive + impl-review |
| §3 Phases 2–4    | Leave `not started`          | Out of scope for this refresh                | Change                |
| Cookbook pattern | Handler import + `vi.mock`   | Matches shipped suites, not e2e HTTP         | Archive plan          |
| Phases in plan   | Single phase                 | All edits are one markdown file              | Plan                  |

## Scope

**In scope:** Header, §8, §3 Phase 1 row, §4 harness row, §2 Risk #4 response cell, §6.2, §6.4, §6.6.

**Out of scope:** New tests, CI wiring, §2 rebuild, Phases 2–4 work, app code changes.

## Architecture / Approach

One edit pass on `context/foundation/test-plan.md` guided by the drift table in
`change.md`, then grep + test sanity checks. No in-place refresh outside implement.

## Phases at a Glance

| Phase                | What it delivers          | Key risk                                               |
| -------------------- | ------------------------- | ------------------------------------------------------ |
| 1. Sync test-plan.md | Accurate guide + cookbook | Cookbook too vague or re-introduces file anchors in §2 |

**Prerequisites:** Archived Phase 1 readable for reference; `test-plan.md` exists in repo.

**Estimated effort:** One short session (~30–45 min).

## Open Risks & Assumptions

- `test-plan.md` may be untracked in git — implement should still commit the updated file.
- Risk #5 partial coverage is documented narratively; full #5 waits for S-04 / future rollout.

## Success Criteria (Summary)

- Phase 1 row is `complete` with archive path
- §6.2 lets a contributor add an integration test without reading the archive
- Stale “TBD” / “change opened” strings are gone
