# Handout Schema & Migrations — Plan Brief

> Full plan: `context/changes/handout-schema/plan.md`

## What & Why

Add the `handouts` Postgres table with ENUM types, RLS policies, and TypeScript entity types — the shared foundation that all four roadmap slices (S-01 through S-04) depend on. Without this schema in place, no handout UI or API routes can be built.

## Starting Point

The Supabase SSR client and auth pipeline are fully wired but no public-schema tables exist. `supabase/migrations/` is absent; the only DB usage today is `supabase.auth.getUser()`. `supabase/seed.sql` is referenced in `config.toml` but is missing.

## Desired End State

`supabase/migrations/20260528200000_create_handouts_table.sql` applies cleanly; the `handouts` table exists with RLS enabled and 4 policies in place; `src/types.ts` exports `HandoutStatus`, `BackgroundCategory`, and `Handout` — importable via `@/types` in any application file.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| `status` / `background_category` column types | Postgres ENUM (`fantasy`, `horror`, `scifi`) | DB-enforced valid values; integrates cleanly with supabase-gen types | Plan |
| `tags` storage | `text[]` | Native Postgres array; GIN-indexable; PostgREST-compatible out of the box | Plan |
| `share_token` assignment | NULL on create, UUID set on publish | The share link is created by the act of publishing — not before (aligns with PRD FR-010) | Plan |
| Anonymous RLS scope | `status IN ('published', 'archived')` | Player links must survive soft-delete; satisfies the link-permanence NFR | Plan |
| GM UPDATE blocked on archived rows | `USING (status <> 'archived')` in RLS | Enforces PRD "archived = read-only for GM" at the DB layer regardless of app bugs | Plan |
| GM account deletion | `ON DELETE CASCADE` | No orphaned rows; GDPR-friendly; consistent with single-owner model | Plan |
| State transition enforcement | Application-level only | MVP simplicity; single developer makes direct-SQL bypass an acceptable risk | Plan |
| TypeScript types scope | Included in this change | Types derive directly from the schema; S-01's implementer needs them immediately | Plan |

## Scope

**In scope:** `supabase/migrations/` directory, SQL migration file, `supabase/seed.sql` empty stub, `src/types.ts` entity types.

**Out of scope:** API routes, service functions, UI components, DB triggers for 365-day archival, supabase-gen type generation.

## Architecture / Approach

Single SQL migration file creates two ENUM types, the `handouts` table (11 columns), two indexes, RLS enable, and four RLS policies in one atomic transaction. TypeScript types are hand-authored to match SQL nullability exactly. No trigger-based transition enforcement — the application layer owns state-machine logic.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Database migration | ENUM types, `handouts` table, indexes, 4 RLS policies, empty seed.sql | RLS policy mismatch could violate link-permanence NFR (archived rows must remain readable by `anon`) |
| 2. TypeScript entity types | `src/types.ts` with `Handout`, `HandoutStatus`, `BackgroundCategory` | Nullability mismatch between SQL and TS causes silent runtime type errors |

**Prerequisites:** Local Supabase stack running (`npx supabase start`, requires Docker) for migration verification.
**Estimated effort:** ~1 session across 2 phases.

## Open Risks & Assumptions

- `background_category` ENUM values (`fantasy`, `horror`, `scifi`) are single lowercase words — no display-name mapping needed; S-01 can capitalise on render.
- The anonymous SELECT policy allows reads on all `published`/`archived` rows (application always filters by `share_token = $1`). If a future feature needs public handout browsing, the policy is already permissive enough — but that is a non-goal for MVP.
- `npx supabase db push` to the hosted project requires `SUPABASE_URL` and the service-role key to be configured in `.dev.vars` — not validated in this change.

## Success Criteria (Summary)

- `npx supabase db reset` exits 0; Supabase Studio shows `handouts` table with RLS enabled and 4 policies.
- `npm run build` passes with `src/types.ts` in place.
- All subsequent slices can `import type { Handout } from '@/types'` without additional schema work.
