# Extract Shared handoutInputSchema — Plan Brief

> Full plan: `context/changes/refactor-opportunities/plan.md`
> Research: `context/changes/refactor-opportunities/research.md`

## What & Why

`handoutInputSchema` is defined identically in both handout API routes. Any future field addition requires a dual manual update with no compile-time catch — a drift already happened once across commits `d09b4c4` and `5474f48` before re-converging. Extracting to a shared module eliminates the dual-maintenance tax and makes the validated type reusable.

## Starting Point

Both `src/pages/api/handouts/index.ts:8-13` and `src/pages/api/handouts/[id].ts:8-13` contain byte-for-byte identical `const handoutInputSchema = z.object(...)` definitions. No shared import exists today; TypeScript cannot detect drift between the two.

## Desired End State

`src/lib/handout-schema.ts` is the single source of truth. Both API routes import `handoutInputSchema` and `HandoutInput` from there. Adding a field requires one edit in one file.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Scope | TD-1 only | Highest impact/cost ratio; no prerequisites; other TDs deferred or dependent | Plan |
| Target location | `src/lib/handout-schema.ts` | Consistent with existing lib service pattern (`load-handout-for-edit.ts`, etc.) | Research |
| Export style | Named exports at end of file | Project convention (lessons.md) | Research |
| Error format fix (TD-3) | Deferred | Independent change; Option A is a separate 1-line fix per API file | Plan |
| PR strategy | Single PR | Three file touches, one logical change | Plan |

## Scope

**In scope:**
- Create `src/lib/handout-schema.ts` with `handoutInputSchema` and `HandoutInput`
- Remove local schema definitions from `index.ts` and `[id].ts`
- Add imports from the new module in both files

**Out of scope:**
- TD-3 (error message format), TD-4 (PUT 404), TD-2 (Supabase gen types), TD-6 (TagsInput limits), TD-7 (type split)
- Any logic changes to validation behaviour

## Architecture / Approach

New lib module created at `src/lib/handout-schema.ts`. Both API routes replace their local 6-line `const` block with a single import. The `z` import stays in both routes — each file still uses `z` directly for other purposes. No test changes needed; existing integration tests cover all schema paths and are transparent to the extraction.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Extract Schema to Shared Module | `handout-schema.ts` created; both API routes import from it | Trivial — purely mechanical extraction; TypeScript enforces correctness |

**Prerequisites:** None. No running Supabase required; no migration involved.
**Estimated effort:** ~1 session, ~15 minutes of implementation.

## Open Risks & Assumptions

- No risks identified. The extraction is transparent to runtime behaviour; TypeScript and integration tests verify correctness at compile time and at test time respectively.
- Note: `refactor-opportunities` has no roadmap ID (it is a maintenance change, not a product slice). PR title prefix should use `// [N/A]::[refactor-opportunities] //` or agree on a convention with the team.

## Success Criteria (Summary)

- `npm run lint`, `npm test -- --project integration`, and `npm run build` all pass with no changes to test assertions.
- Create and edit handout flows work correctly end-to-end in the dev environment.
