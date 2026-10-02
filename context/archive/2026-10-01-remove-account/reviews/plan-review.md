<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Close an account and purge it after 30 days

- **Plan:** `context/changes/remove-account/plan.md`
- **Mode:** Deep
- **Date:** 2026-10-01
- **Grounding:** 8/8 named paths exist. `on delete cascade` is at `supabase/migrations/20260528200000_create_handouts_table.sql:11`. `gm_update_non_archived` is at line 43. `anon_select_shared` is at line 52. Sign-in puts `error.message` on the redirect at `src/pages/api/auth/signin.ts:16-22`. `PROTECTED_ROUTES` is `/dashboard` and `/handouts` at `src/middleware.ts:8`. The Worker export is `Sentry.withSentry` in `sentry.server.config.ts:8`. `wrangler.jsonc` has no cron. Brief and plan match on the four phases and the locked decisions.
- **Verdict:** SOUND

## Dimension Verdicts

| Dimension | Verdict |
| --- | --- |
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | PASS |
| Plan Completeness | PASS |

## Findings

### F1: Sign-in cannot load the deletion date by email

- **Severity:** WARNING
- **Impact:** HIGH
- **Dimension:** Blind Spots
- **Location:** Phase 3, sign-in message
- **Detail:** The plan looked up `app_metadata.deletion_scheduled_at` by email after `signInWithPassword` fails. The installed admin client has `listUsers`, `getUserById`, and `updateUserById`. It has no email lookup. `account_deletions` stored `gm_id` only, and a failed sign-in does not yield that id. Criterion 3.6 needs the date.
- **Fix:** Add `email` to `account_deletions` and, on a failed sign-in, read `scheduled_at` with the service role where `email` matches.
- **Decision:** FIXED
- **Chosen fix:** Store `email text not null` with a unique index on `account_deletions`. The deletion route writes that email. A failed sign-in selects the row by the submitted email and redirects with `deletionAt`.

### F2: Global sign-out is not a service-role call by user id

- **Severity:** WARNING
- **Impact:** MEDIUM
- **Dimension:** Architectural Fitness
- **Location:** Phase 1, schedule deletion
- **Detail:** The plan has the service role revoke every session. `GoTrueAdminApi.signOut` takes a user JWT and posts to `/logout?scope=`. It does not take a user id. After a correct `signInWithPassword`, that route holds the GM's JWT. `signOut` with `scope: 'global'` on that client revokes every session for that user. The service role is still required for the ban, the metadata write, and `deleteUser`.
- **Fix:** After the password check, call the user client's `signOut` with `scope: 'global'`, then clear cookies. Keep the service-role ban.
- **Decision:** FIXED
- **Chosen fix:** After the three writes, the anon client that checked the password calls `signOut({ scope: 'global' })`. The service role then bans the user. The plan does not call `admin.signOut`.

### F3: `account_deletions` has no per-operation RLS policies

- **Severity:** WARNING
- **Impact:** MEDIUM
- **Dimension:** Architectural Fitness
- **Location:** Phase 1, deletion table
- **Detail:** The plan enables RLS and adds no policies. `AGENTS.md` requires per-operation policies on every new table. Default deny is safe, and the service role bypasses RLS, but the migration misses the repo rule.
- **Fix:** Add `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies for `anon` and `authenticated` with `USING (false)` and `WITH CHECK (false)`.
- **Decision:** FIXED
- **Chosen fix:** `SELECT` and `DELETE` use `USING (false)`. `INSERT` uses `WITH CHECK (false)`. `UPDATE` uses both. The service role still bypasses RLS.

### F4: The goodbye page formats a helper that Phase 3 creates

- **Severity:** WARNING
- **Impact:** MEDIUM
- **Dimension:** Plan Completeness
- **Location:** Phase 2, goodbye page, and Phase 3, local formatting
- **Detail:** `src/pages/account-closed.astro` in Phase 2 must format `{date}` with `formatDeletionInstant`. That function and its unit test are created in Phase 3. Manual check 2.9 requires the local date before Phase 3 exists.
- **Fix:** Move `formatDeletionInstant` and `__tests__/lib/format-deletion-instant.test.ts` into Phase 2. Phase 3 reuses them for the share page and the sign-in form. Move Progress rows 3.1 and 3.2 into Phase 2.
- **Decision:** FIXED
- **Chosen fix:** Phase 2 creates the helper and its unit test. Those checks are Progress 2.4 and 2.5. Phase 3 reuses the helper. Its manual checks are Progress 3.1 through 3.5.

### F5: The purge manual check names no command

- **Severity:** OBSERVATION
- **Impact:** LOW
- **Dimension:** Plan Completeness
- **Location:** Phase 4, manual check 4.6
- **Detail:** 4.6 says to invoke the purge function in local dev. The plan forbids an HTTP purge route. The integration test in 4.1 through 4.4 already calls `purgeScheduledAccounts`.
- **Fix:** Point 4.6 at `npm test -- --project integration` for the purge cases, and leave 4.7 as the cron-config check.
- **Decision:** FIXED
- **Chosen fix:** Progress 4.6 is the integration test for a past instant. Progress 4.7 stays the cron-config check.
