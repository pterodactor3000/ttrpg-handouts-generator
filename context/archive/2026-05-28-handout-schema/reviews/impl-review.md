# Implementation Review — handout-schema

- **Reviewed:** 2026-05-30
- **Verdict:** PASS — plan fully implemented, no issues found
- **Commits:** `ea50d38` (p1 migration), `6dfd729` (p2 types), `93572ae` (epilogue)

## Scope

Full-plan review of both phases against `plan.md`, the critical implementation details, `context/foundation/lessons.md`, and `AGENTS.md`/`CLAUDE.md` hard rules.

## Phase 1 — Database Migration (`ea50d38`)

Verified against the live local database (`11 columns`, `4 policies`, `relrowsecurity = t`).

- **ENUM types**: `handout_status('draft','published','archived')` and `background_category('fantasy','horror','scifi')` — exact match to contract.
- **Table**: all 11 columns with correct types, defaults, and nullability. Only `share_token`, `published_at`, `archived_at` are nullable; everything else `NOT NULL` (including `gm_id` and `background_category`, by design).
- **FK**: `gm_id REFERENCES auth.users(id) ON DELETE CASCADE` — account deletion cascades to handouts.
- **Indexes**: `handouts_gm_id_idx`, `handouts_share_token_idx` present (plus the auto-created `handouts_share_token_key` from the UNIQUE constraint).
- **RLS**: enabled; 4 policies with correct role targets and commands:
  - `gm_select_own` (SELECT / authenticated)
  - `gm_insert_own` (INSERT / authenticated)
  - `gm_update_non_archived` (UPDATE / authenticated)
  - `anon_select_shared` (SELECT / anon)
- **No DELETE policy** — soft-delete only, as specified.

### Critical implementation details — both honored

- `anon_select_shared` permits both `published` AND `archived` rows (with non-NULL `share_token`), preserving the link-permanence NFR. Not narrowed to `published` alone.
- `gm_update_non_archived` carries both `USING` (targets non-archived own rows) and `WITH CHECK` (`gm_id = auth.uid()`), preventing a GM from reassigning `gm_id` to another user.

## Phase 2 — TypeScript Entity Types (`6dfd729`)

`src/types.ts` exports `HandoutStatus`, `BackgroundCategory`, `Handout`. `npm run build` and `npm run lint` pass.

### Cross-phase consistency (SQL ↔ TS)

All 11 columns map with matching nullability; enum unions match the Postgres ENUM labels exactly in both directions. The three nullable timestamp/token columns are typed `string | null` (not `string`); `tags` is `string[]`; `status`/`background_category` use the union types rather than `string`.

## Rules & lessons compliance

- `lessons.md`: exports at end of file; no abbreviated identifiers; arrow-function rule N/A (no functions defined).
- `AGENTS.md`/`CLAUDE.md`: migration naming `YYYYMMDDHHmmss_short_description.sql`; RLS enabled with per-operation policies; shared types in `src/types.ts`.

## Adaptations from the plan (non-substantive, both improvements)

1. SQL keywords lowercased (Supabase convention) vs. the plan's uppercase contract — functionally identical.
2. Exports moved to end-of-file vs. the plan's inline `export type` — required by `lessons.md`, which the plan itself flagged (line 187).

## Documentation note

The plan's manual-verification prose for item 1.7 (line 145) listed `grimdark`/`high_fantasy`/`postapo` for `background_category`, contradicting the authoritative SQL/TS contract (`fantasy`/`horror`/`scifi`). Implementation followed the canonical contract. The stray prose is a plan typo, not an implementation defect.

## Outstanding items

None. The change is ready to archive.
