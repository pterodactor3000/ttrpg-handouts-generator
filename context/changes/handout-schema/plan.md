# Handout Schema & Migrations Implementation Plan

## Overview

Create the `handouts` Supabase table — the shared database foundation for every slice in the roadmap (S-01 through S-04). Delivers two Postgres ENUM types, the full column set, indexes, RLS policies covering GM-session reads/writes and anonymous share-token reads, and matching TypeScript entity types in `src/types.ts`.

## Current State Analysis

No migrations exist; `supabase/migrations/` is absent. The Supabase SSR client and auth pipeline are fully wired (`src/lib/supabase.ts`, `src/middleware.ts`) but the only DB usage today is `supabase.auth.getUser()` — no public tables, no RLS, no application types. `supabase/config.toml` references a `supabase/seed.sql` that does not exist.

## Desired End State

After this change:
- `supabase/migrations/20260528200000_create_handouts_table.sql` applies cleanly via `npx supabase db reset` (locally) and `npx supabase db push` (remote).
- The `handouts` table exists in the `public` schema with RLS enabled and four policies in place.
- `src/types.ts` exports `HandoutStatus`, `BackgroundCategory`, and `Handout` — importable via `@/types` in any application file.
- Every subsequent slice (S-01 through S-04) can depend on these invariants without additional schema work.

### Key Discoveries

- `supabase/config.toml` uses Postgres 17 — `gen_random_uuid()` is built-in (no `pgcrypto` extension needed); ENUM types are fully supported.
- `config.toml` declares `sql_paths = ["./seed.sql"]` for seeding — the file is missing and must be created as an empty stub to prevent CLI warnings.
- `src/types.ts` does not exist; AGENTS.md requires shared entity types to live there.
- `src/lib/supabase.ts` uses the `anon` key with `@supabase/ssr`; RLS policies govern all queries made through this client.
- Auth routes in `src/pages/api/auth/` are missing `export const prerender = false` — pre-existing issue, out of scope here.

## What We're NOT Doing

- No API routes, service functions, or UI — schema and types only.
- No server-side enforcement of state-transition rules (draft → published → archived enforced by the application layer, not DB triggers).
- No database trigger for the 365-day auto-archival rule — that is an application-level scheduled task, planned in a future slice.
- No supabase-gen type generation — TypeScript types are hand-authored to match the SQL schema.
- No seed data — `seed.sql` is created as an empty stub only.
- No hard-delete RLS policy — GM-initiated removal is soft-delete (status → archived) only.

## Implementation Approach

Two-step delivery: (1) SQL migration creating all schema objects atomically; (2) TypeScript entity types mirroring the schema. Each step is independently verifiable. The SQL is a single migration file — no multi-file approach is needed for a greenfield table.

## Critical Implementation Details

**Anonymous RLS relies on the query filter, not the policy alone.** The anonymous SELECT policy allows reads on any `published` or `archived` row with a non-NULL `share_token`. Security comes from the application always querying with `WHERE share_token = $1` — the unguessable UUID is the effective access-control mechanism. The RLS policy must never be narrowed to `status = 'published'` alone; that would violate the link-permanence NFR (player links must survive archive).

**UPDATE policy requires both `USING` and `WITH CHECK`.** The `USING` clause restricts which existing rows a GM can target (`status <> 'archived'`). The `WITH CHECK` clause restricts what the updated row must satisfy (`gm_id = auth.uid()`). Omitting `WITH CHECK` on UPDATE would allow a GM to reassign `gm_id` to another user's ID.

## Phase 1: Database Migration

### Overview

Create `supabase/migrations/` and write the single SQL migration file that defines all schema objects for the handouts feature. Also create the empty `supabase/seed.sql` stub to satisfy the `config.toml` reference.

### Changes Required

#### 1. Create migrations directory

**File**: `supabase/migrations/` *(directory)*

**Intent**: The Supabase CLI requires this directory to exist before any migration file can be applied. `npx supabase db reset` and `npx supabase migration new` both expect it.

**Contract**: Empty directory. No files other than the migration SQL belong here at this stage.

#### 2. Write the initial migration

**File**: `supabase/migrations/20260528200000_create_handouts_table.sql`

**Intent**: Define the complete `handouts` schema — ENUM types, all columns with correct nullability, indexes, RLS enable, and four RLS policies — as a single atomic migration. Nothing in the public schema depends on this file before it runs; it can be applied from a clean database.

**Contract**: The migration must produce these objects in dependency order:

```sql
-- 1. ENUM types
CREATE TYPE handout_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE background_category AS ENUM ('fantasy', 'horror', 'scifi');

-- 2. Table (11 columns)
CREATE TABLE handouts (
  id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  gm_id               UUID                NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT                NOT NULL DEFAULT '',
  markdown_content    TEXT                NOT NULL DEFAULT '',
  background_category background_category NOT NULL,
  tags                TEXT[]              NOT NULL DEFAULT '{}',
  status              handout_status      NOT NULL DEFAULT 'draft',
  share_token         UUID                UNIQUE,
  created_at          TIMESTAMPTZ         NOT NULL DEFAULT now(),
  published_at        TIMESTAMPTZ,
  archived_at         TIMESTAMPTZ
);

-- 3. Indexes
CREATE INDEX handouts_gm_id_idx       ON handouts (gm_id);
CREATE INDEX handouts_share_token_idx ON handouts (share_token);

-- 4. Enable RLS
ALTER TABLE handouts ENABLE ROW LEVEL SECURITY;

-- 5. GM: read all own handouts (all statuses)
CREATE POLICY "gm_select_own"
  ON handouts FOR SELECT TO authenticated
  USING (gm_id = auth.uid());

-- 6. GM: create handouts
CREATE POLICY "gm_insert_own"
  ON handouts FOR INSERT TO authenticated
  WITH CHECK (gm_id = auth.uid());

-- 7. GM: update only non-archived handouts
--    USING restricts which rows can be targeted; WITH CHECK restricts new values.
CREATE POLICY "gm_update_non_archived"
  ON handouts FOR UPDATE TO authenticated
  USING  (gm_id = auth.uid() AND status <> 'archived')
  WITH CHECK (gm_id = auth.uid());

-- 8. Anonymous: read published/archived rows (players via share link)
--    The application always filters by share_token = $1; the UUID is the security mechanism.
CREATE POLICY "anon_select_shared"
  ON handouts FOR SELECT TO anon
  USING (status IN ('published', 'archived') AND share_token IS NOT NULL);
```

No DELETE policy is created. Soft-delete (status → archived) is the only GM-initiated removal path. Hard deletes of handout rows happen only via `auth.users` cascade at account-deletion time.

#### 3. Create empty seed file

**File**: `supabase/seed.sql`

**Intent**: Satisfy the `sql_paths = ["./seed.sql"]` reference in `config.toml`; the Supabase CLI logs a warning when the declared seed file is absent.

**Contract**: A single SQL comment block. No `INSERT` statements.

### Success Criteria

#### Automated Verification

- Migration file exists: `ls supabase/migrations/20260528200000_create_handouts_table.sql`
- Migration applies cleanly: `npx supabase db reset` exits 0 (requires `npx supabase start`)
- Lint passes: `npm run lint`

#### Manual Verification

- Supabase Studio (`http://localhost:54323`) → Table Editor shows `handouts` with all 11 columns and correct nullability (`share_token`, `published_at`, `archived_at` shown as nullable)
- Table Editor → `handouts` shows RLS enabled (lock icon active)
- Authentication → Policies shows 4 policies on `handouts`: `gm_select_own`, `gm_insert_own`, `gm_update_non_archived`, `anon_select_shared`
- Database → Indexes shows `handouts_gm_id_idx` and `handouts_share_token_idx`
- Database → Types shows `handout_status` (`draft`, `published`, `archived`) and `background_category` (`grimdark`, `high_fantasy`, `postapo`)

**Implementation Note**: After Phase 1 automated and manual verification passes, pause here for human confirmation before proceeding to Phase 2. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: TypeScript Entity Types

### Overview

Create `src/types.ts` with the `Handout` entity type and supporting union types derived directly from the SQL schema. These types are the shared contract used by every slice that reads or writes handouts.

### Changes Required

#### 1. Create shared types file

**File**: `src/types.ts`

**Intent**: Expose `HandoutStatus`, `BackgroundCategory`, and `Handout` as the canonical TypeScript representation of the `handouts` table. Nullability must match the SQL schema exactly so that application code that respects (or violates) database invariants fails at compile time rather than at runtime.

**Contract**:

```typescript
export type HandoutStatus = 'draft' | 'published' | 'archived';

export type BackgroundCategory = 'fantasy' | 'horror' | 'scifi';

export interface Handout {
  id: string;
  gm_id: string;
  title: string;
  markdown_content: string;
  background_category: BackgroundCategory;
  tags: string[];
  status: HandoutStatus;
  share_token: string | null;   // null until published
  created_at: string;           // ISO 8601 timestamp from Supabase
  published_at: string | null;  // null while draft
  archived_at: string | null;   // null until archived
}
```

Per `context/foundation/lessons.md`: exports at end of file; any helper functions added later must use arrow functions with `const` declarations.

### Success Criteria

#### Automated Verification

- File exists: `ls src/types.ts`
- Build type-checks cleanly: `npm run build`
- Lint passes: `npm run lint`

#### Manual Verification

- `import type { Handout } from '@/types'` in any `src/` file resolves with no TypeScript errors
- `share_token`, `published_at`, `archived_at` are typed `string | null` (not `string`)
- `status` is `HandoutStatus` (not `string`); `background_category` is `BackgroundCategory` (not `string`)
- `tags` is `string[]` (not `string`)

---

## Testing Strategy

### Automated Tests

No application unit tests are added in this change — the migration SQL is the primary artifact and `npx supabase db reset` is the integration harness.

### Manual Testing Steps

1. Run `npx supabase start` then `npx supabase db reset`; confirm no errors in terminal output.
2. Open Supabase Studio → Authentication → Policies. Confirm 4 policies on `handouts` with correct role targets (`authenticated` vs `anon`).
3. In Studio's SQL editor, verify a service-role INSERT works:
   ```sql
   INSERT INTO handouts (gm_id, background_category) VALUES (gen_random_uuid(), 'fantasy');
   ```
   Expected: row inserted (Studio uses the service role, which bypasses RLS).
4. Verify the anonymous policy blocks reads with no share_token:
   ```sql
   SET ROLE anon;
   SELECT * FROM handouts;
   ```
   Expected: 0 rows returned (the inserted row is `draft` with `share_token = NULL`).
5. Confirm TypeScript: open any `src/` file, add `import type { Handout, HandoutStatus } from '@/types'`, and verify the IDE shows correct type signatures with no red underlines.

## Performance Considerations

Query patterns covered by indexes:
- GM dashboard (S-02): `WHERE gm_id = $1` → `handouts_gm_id_idx`
- Player share link (S-01): `WHERE share_token = $1` → `handouts_share_token_idx`

At MVP scale (single GM, ~10–100 handouts) index overhead is negligible. Indexes are additive — no risk of premature optimization.

## Migration Notes

This is the first migration in the project. `supabase/migrations/` must be created before the SQL file can be placed. For local development, `npx supabase db reset` re-runs all migrations from scratch. For the hosted Supabase project, run `npx supabase db push` (requires `SUPABASE_URL` and service-role key in `.dev.vars`). No rollback migration is written — at MVP stage, `db reset` restores a clean local state.

## References

- Roadmap F-01: `context/foundation/roadmap.md` lines 61–72
- PRD Business Logic & Access Control: `context/foundation/prd.md`
- Supabase SSR client: `src/lib/supabase.ts`
- Supabase config: `supabase/config.toml`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database Migration

#### Automated

- [ ] 1.1 Migration file exists: `ls supabase/migrations/20260528200000_create_handouts_table.sql`
- [ ] 1.2 Migration applies cleanly: `npx supabase db reset` exits 0
- [ ] 1.3 Lint passes: `npm run lint`

#### Manual

- [ ] 1.4 Supabase Studio shows `handouts` table with all 11 columns and correct nullability
- [ ] 1.5 RLS enabled on `handouts`; all 4 policies visible under Authentication > Policies
- [ ] 1.6 Indexes `handouts_gm_id_idx` and `handouts_share_token_idx` exist in Database > Indexes
- [ ] 1.7 ENUM types `handout_status` and `background_category` visible in Database > Types with correct values

### Phase 2: TypeScript Entity Types

#### Automated

- [ ] 2.1 `src/types.ts` exists: `ls src/types.ts`
- [ ] 2.2 Build type-checks cleanly: `npm run build`
- [ ] 2.3 Lint passes: `npm run lint`

#### Manual

- [ ] 2.4 `import type { Handout } from '@/types'` resolves with no TS errors in any `src/` file
- [ ] 2.5 `share_token`, `published_at`, `archived_at` are typed `string | null`
- [ ] 2.6 `status` is `HandoutStatus`; `tags` is `string[]`; `background_category` is `BackgroundCategory`
