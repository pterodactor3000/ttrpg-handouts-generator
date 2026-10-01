# Remove Account Implementation Plan

## Overview

S-13 lets a signed-in GM change their password or close their account from settings. Closing the account ends every session immediately. Handouts and share links stay for 30 days, with the purge instant shown in the viewer's local timezone. A daily Cloudflare cron then deletes the auth user, and the existing cascade removes the handouts. There is no reactivation.

## Current State Analysis

`src/pages/` has no settings route. The dashboard header in `src/pages/dashboard.astro` shows the email, New handout, and Sign out. `PROTECTED_ROUTES` in `src/middleware.ts` is `/dashboard` and `/handouts`.

`src/lib/supabase.ts` builds the anon server client from `SUPABASE_URL` and `SUPABASE_KEY`. The service-role client exists only in tests (`__tests__/integration/helpers/admin-client.ts`). `src/` never calls `auth.admin`.

`handouts.gm_id` references `auth.users (id)` with `on delete cascade` (`supabase/migrations/20260528200000_create_handouts_table.sql`). Deleting the auth user deletes that GM's handouts in the same statement. `gm_update_non_archived` lets the signed-in GM update only non-archived rows. The share page (`src/pages/share/[token].astro`) reads with the anon key and `anon_select_shared`. Sign-in (`src/pages/api/auth/signin.ts`) redirects failures to `/auth/signin?error=` with the raw auth message. `SignInForm` renders that string.

Nothing in the repo runs on a schedule. The Worker entry is `sentry.server.config.ts`, which wraps the Astro handler with `Sentry.withSentry`. `wrangler.jsonc` has no cron triggers.

## Desired End State

A signed-in GM opens `/settings` from the dashboard. The page shows their email, a form to change the password, and a delete action. Password change checks the current password, then sets the new one, and the GM stays signed in.

Delete asks for the current password in a dialog. On success, every session ends, later sign-in is rejected, and the browser lands on a public page with one sentence: the account is closed, and handouts are scheduled for deletion by `{date}`. `{date}` is that purge instant in the viewer's local timezone, including the local day and the local time.

Each shared handout stays readable and shows `Scheduled for deletion by {date}` above the content. A sign-in attempt during the 30 days shows that the account is closed and scheduled for deletion by `{date}`. A wrong password, or a failure to record the request, leaves the GM signed in and does not start the 30 days.

Thirty days after the request, a cron deletes the auth user. Handouts and the deletion row go with it. A later cron run deletes anything whose instant has already passed. Share links for that GM then 404.

Verify by signing in, changing a password, requesting deletion, opening a share link, trying to sign in again, and running the purge against a past instant.

### Key Discoveries

- Day 0 must not call `deleteUser`. The cascade would remove handouts immediately.
- The signed-in client cannot stamp archived handouts. The service role must write `scheduled_deletion_at` for every row with that `gm_id`.
- The share page cannot read `auth.users`. The instant has to be selected from the handout row.
- A GM with no handouts still needs a date on the goodbye page and on sign-in, so the instant also lives on the auth user and in `account_deletions`.
- The admin client cannot look up a user by email. Sign-in loads the instant from `account_deletions.email`.
- `Sentry.withSentry` wraps the Worker. The cron handler has to run even if that wrapper only forwards `fetch`.

## What We're NOT Doing

- Reactivation, a recovery email, or a way to cancel the deletion
- Deleting the auth user on day 0
- A public HTTP route that runs the purge
- pg_cron, or the parked 365-day auto-archive
- A profile editor beyond the email, the password form, and delete
- Listing handout titles on the goodbye page
- A deletion line on a draft that has no share link (the column may still be set)
- Replacing the handout body with the deletion sentence

## Implementation Approach

Verify the current password with the anon client. Persist one instant, `now + 30 days`, with the service role: `app_metadata.deletion_scheduled_at`, one `account_deletions` row that stores that GM's email, and `handouts.scheduled_deletion_at` on every handout that GM owns. Then call `signOut({ scope: 'global' })` on the same anon client that checked the password. That revokes every session and clears this browser's cookies. Then ban the user for longer than 30 days with the service role. Do not call `admin.signOut` with a user id. Display code formats that instant in the browser's timezone. The cron reads `account_deletions` and calls `deleteUser` for rows whose instant has passed.

Change password is a separate route on the same page. It checks the current password, requires the new password and the confirmation to match, and calls `updateUser`. It does not touch the deletion record.

## Critical Implementation Details

Do not ban the user before the three writes succeed. After those writes, call the user client's `signOut({ scope: 'global' })`, then ban. `admin.signOut` takes a user JWT and posts to `/logout`. It does not take a user id. If sign-out fails, return an error and do not ban. If the ban fails after sign-out, return an error and keep the rows. A retry must keep the original instant, sign in again, sign out globally, then ban. A second request must not move the deadline.

A ban of about 30 days is the wrong length. A late cron would let the GM sign in again while the handouts are still scheduled. Ban for a duration that outlasts any reasonable cron delay. `deleteUser` is what ends the ban.

The user's JWT cannot update archived handouts (`gm_update_non_archived`). The stamp goes through the service role and still filters `.eq('gm_id', user.id)`.

`anon_select_shared` does not need a new policy. The share query adds `scheduled_deletion_at` to its select list. Do not widen who can read the row.

The goodbye query string is display-only. The stored instant is the one on `account_deletions` and the handouts. Tampering with `?at=` changes that page's sentence and does not change the purge.

A failed sign-in does not yield `gm_id`. The installed admin client has no email lookup. `account_deletions` stores the email, and the sign-in route reads `scheduled_at` with the service role where `email` matches. It does not scan `listUsers`, and it does not read `app_metadata` for that sentence.

## Phase 1: Deletion record

### Overview

Persist the purge instant, ban sign-in, and revoke sessions, without removing the auth user or the handouts. No settings page yet. Tests call the route.

### Changes Required

#### 1. Deletion table and handout column

**File**: `supabase/migrations/20261001140000_account_deletion.sql`

**Intent**: Give the cron and the share page a place to read the purge instant without deleting the auth user.

**Contract**: Create `account_deletions` with `gm_id uuid primary key references auth.users (id) on delete cascade`, `email text not null`, and `scheduled_at timestamptz not null`. Add a unique index on `email`. Enable RLS. Add `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies for `anon` and `authenticated` that deny every row: `SELECT` and `DELETE` use `USING (false)`, `INSERT` uses `WITH CHECK (false)`, and `UPDATE` uses both. The service role bypasses RLS. Add nullable `handouts.scheduled_deletion_at timestamptz`. Do not change `anon_select_shared` or the `gm_id` cascade.

#### 2. Server admin client

**File**: `src/lib/supabase-admin.ts`

**Intent**: Let server routes ban a user and later delete that user. Session revoke uses the anon client. The browser never receives this key.

**Contract**: Export `createAdminClient()` at the end of the file. It uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `astro:env/server`. Return `null` when either is missing, matching `createClient`. Declare `SUPABASE_SERVICE_ROLE_KEY` in `astro.config.mjs` as a server secret, optional, next to `SUPABASE_KEY`. Add the same name to `.env.example` and `.dev.vars.example`. Do not import this module from a client component.

#### 3. Schedule deletion

**File**: `src/pages/api/account/deletion.ts`

**Intent**: Turn a correct password into a scheduled deletion, and refuse to start the clock when the password or the writes fail.

**Contract**: Export `const prerender = false` and `POST`. Validate the body with zod: `password` is a non-empty string. The caller is the signed-in GM (`context.locals.user`). Check the password with `signInWithPassword` for that email. On failure, respond `401` with a generic message and write nothing. On success, if `user.email` is missing, respond `500` and write nothing. Otherwise compute one instant 30 days ahead. If `account_deletions` already has this `gm_id`, keep that `scheduled_at` and that `email`. Otherwise insert the row with that email, set `app_metadata.deletion_scheduled_at` to that instant, and set `handouts.scheduled_deletion_at` on every row with `.eq('gm_id', user.id)`, including archived rows. Then call `signOut({ scope: 'global' })` on that same anon client, which revokes every session and clears this browser's cookies. Then ban the user with a duration that outlasts the instant. Do not call `admin.signOut`. Respond `200` with `{ scheduledAt: <iso> }`. A later failure after the row exists returns `500` with a generic message, leaves the row in place, and does not claim success. Log the raw error server-side. Do not call `deleteUser`.

### Success Criteria

#### Automated Verification

- The migration applies, `account_deletions` exists with deny policies for `anon` and `authenticated` on `SELECT`, `INSERT`, `UPDATE`, and `DELETE`, and `handouts.scheduled_deletion_at` is nullable.
- A wrong password returns `401` and inserts no `account_deletions` row.
- A correct password inserts one row that stores that GM's email, stamps draft, published, and archived handouts for that GM, and leaves the auth user in place.
- After a successful request, `signInWithPassword` for that user fails, and a share-token read of a published handout still returns the row, including `scheduled_deletion_at`.
- A second successful request keeps the original `scheduled_at`.
- `npm test -- --project integration` covers the cases above, and `npm run lint` passes.

#### Manual Verification

- None for this phase. The route has no page yet.

**Implementation Note**: After the automated checks pass, continue to Phase 2. This phase has no manual check.

---

## Phase 2: Settings

### Overview

`/settings` shows the email, changes the password, and requests deletion. Success ends on the goodbye page. Failure stays on the dialog.

### Changes Required

#### 1. Settings page and header link

**File**: `src/pages/settings.astro`

**Intent**: Give the GM one protected page for the email, the password form, and delete.

**Contract**: Add `/settings` to `PROTECTED_ROUTES`. The page shows `locals.user.email`, a change-password form (current password, new password, confirmation), and a delete control. Add a Settings link in the dashboard header beside Sign out (`src/pages/dashboard.astro`).

#### 2. Change password

**File**: `src/pages/api/auth/password.ts`

**Intent**: Let the GM replace the password without scheduling deletion.

**Contract**: Export `const prerender = false` and `POST`. Zod: `currentPassword`, `newPassword`, and `confirmPassword` are non-empty strings, and `newPassword` equals `confirmPassword`. Require a signed-in user. Check `currentPassword` with `signInWithPassword`. On failure, `401` and a generic message. On success, `updateUser` with `newPassword` and respond `200`. The session stays. Do not write `account_deletions`.

**File**: `src/components/organisms/ChangePasswordForm.tsx`

**Intent**: Submit that route and show success or failure on the settings page.

**Contract**: Named export at the end of the file. On `401` or `500`, the form stays filled enough to retry and shows the generic error. On `200`, show a success message and clear the password fields. The GM remains on `/settings`.

#### 3. Local formatting

**File**: `src/lib/format-deletion-instant.ts`

**Intent**: One function owns the local day and time so the goodbye page, the share page, and the sign-in form cannot drift.

**Contract**: Export `formatDeletionInstant(instant: Date, locale: string, timeZone: string): string` at the end of the file. The result includes the calendar day and the time in `timeZone`. It does not append a timezone abbreviation unless `Intl` includes one for that zone.

**File**: `__tests__/lib/format-deletion-instant.test.ts`

**Intent**: Lock the timezone choice the viewer sees.

**Contract**: An instant just after midnight UTC formats to the previous local day in `America/Los_Angeles` and to that same UTC day in `UTC`. Use a fixed `locale`.

#### 4. Delete dialog and goodbye page

**File**: `src/components/organisms/DeleteAccountDialog.tsx`

**Intent**: Match the existing confirm dialog, and add the password so a typo cannot close the account.

**Contract**: Named export at the end of the file. Use `Dialog` the way `DeleteHandoutButton` does. The body includes a password field. Submit `POST /api/account/deletion`. On failure, the dialog stays open and shows the error. On `200`, navigate to `/account-closed?at=<scheduledAt>`.

**File**: `src/pages/account-closed.astro`

**Intent**: Tell the signed-out GM the account is closed and when the handouts go.

**Contract**: Public page, not in `PROTECTED_ROUTES`. One sentence: the account is closed, and handouts are scheduled for deletion by `{date}`. `{date}` comes from the `at` query, formatted in the browser with `formatDeletionInstant`. No handout titles. No sign-in form.

### Success Criteria

#### Automated Verification

- A password change with a wrong current password returns `401` and the old password still signs in.
- A password change with mismatched confirmation is rejected and does not call `updateUser`.
- A password change with the right current password lets the new password sign in.
- `formatDeletionInstant` returns the previous local day for an instant just after midnight UTC when the zone is `America/Los_Angeles`.
- `npm test -- --project unit` passes `__tests__/lib/format-deletion-instant.test.ts`, and `npm run lint` passes.

#### Manual Verification

- The dashboard header opens `/settings`, and the page shows the signed-in email.
- A wrong current password on the change form shows an error and leaves the GM signed in.
- A matching new password signs in afterward, and the old password does not.
- Delete with a wrong password keeps the dialog open and leaves the GM on `/settings`.
- Delete with the right password lands on the goodbye page, signed out, with the local date and time in the sentence.

**Implementation Note**: After the unit test and lint pass, pause for the manual checks before Phase 3.

---

## Phase 3: Visible dates

### Overview

The shared handout and the sign-in form show the same local date the goodbye page showed. Both reuse `formatDeletionInstant` from Phase 2. This phase does not create that function.

### Changes Required

#### 1. Share banner

**File**: `src/pages/share/[token].astro`

**Intent**: Keep the handout readable and show the sentence above it when a purge is scheduled.

**Contract**: Add `scheduled_deletion_at` to the select. When it is null, render the handout as today. When it is set, render `Scheduled for deletion by {date}` above the handout article. `{date}` is `formatDeletionInstant` in the viewer's timezone. Pass the ISO string from the server and format it in the browser so the server render does not guess the zone.

#### 2. Sign-in message

**File**: `src/pages/api/auth/signin.ts`

**Intent**: Replace the raw ban error with the closed-account sentence.

**Contract**: When `signInWithPassword` fails, select `account_deletions` with the admin client where `email` equals the submitted email. If a row exists, redirect to `/auth/signin?deletionAt=<scheduled_at iso>` and do not put `error.message` in the query. Any other failure, including a missing admin client or no matching row, keeps the current `error` redirect.

**File**: `src/pages/auth/signin.astro` and `src/components/organisms/SignInForm.tsx`

**Intent**: Show the sentence when `deletionAt` is present.

**Contract**: `SignInForm` accepts the ISO string and displays: the account is closed and scheduled for deletion by `{date}`, formatted in the browser. When `deletionAt` is absent, keep the current `serverError` behavior.

### Success Criteria

#### Manual Verification

- A shared handout whose GM is scheduled shows `Scheduled for deletion by {date}` above the content, and the handout body is still there.
- The date on that page matches the goodbye page's date in the same browser.
- A handout with no scheduled instant has no sentence.
- Signing in during the 30 days shows the closed-account sentence with the local date, and does not show the raw Supabase error.
- After the phrase is visible, reloading the share page still shows it.

**Implementation Note**: The formatter already landed in Phase 2. Pause for the manual checks before Phase 4.

---

## Phase 4: Cron purge

### Overview

A daily Worker cron deletes every auth user whose instant has passed. Handouts disappear with the cascade. The job is safe to run twice.

### Changes Required

#### 1. Purge function

**File**: `src/lib/purge-scheduled-accounts.ts`

**Intent**: Keep the cron and the test on one function.

**Contract**: Export `purgeScheduledAccounts(now: Date)` at the end of the file. It reads `account_deletions` where `scheduled_at` is less than or equal to `now`, and calls `deleteUser` for each `gm_id`. A missing auth user is not a failure. It continues with the rest. It returns the ids it deleted. It does not delete a row whose `scheduled_at` is still in the future. There is no HTTP route.

#### 2. Scheduled handler

**File**: `sentry.server.config.ts`

**Intent**: Run the purge when Cloudflare fires the cron, without dropping Sentry's request handling.

**Contract**: The default export still handles `fetch` through `Sentry.withSentry`. It also handles `scheduled` by calling `purgeScheduledAccounts(new Date())`. If `withSentry` does not forward `scheduled`, wrap the export so `fetch` stays on the Sentry handler and `scheduled` calls the purge. Add a daily cron in `wrangler.jsonc` at 03:00 UTC (`0 3 * * *`).

### Success Criteria

#### Automated Verification

- `purgeScheduledAccounts` with `now` before `scheduled_at` deletes no user and leaves the handout.
- `purgeScheduledAccounts` with `now` after `scheduled_at` deletes the auth user, the handouts, and the `account_deletions` row.
- A second call after that deletion completes without throwing.
- A share-token read after the purge returns no row.
- `npm test -- --project integration` covers the cases above, and `npm run lint` passes.
- `npm test -- --project integration` confirms a past instant removes that GM's share link.

#### Manual Verification

- `wrangler.jsonc` lists the daily cron, and the Worker export includes `scheduled`.

**Implementation Note**: After the automated checks pass, pause for the manual checks before calling this change done.

---

## Testing Strategy

### Unit Tests

- `formatDeletionInstant` for a fixed instant in `UTC` and in `America/Los_Angeles`, including an instant within an hour after midnight UTC.

### Integration Tests

- Wrong password does not insert `account_deletions`.
- Correct password stamps draft, published, and archived handouts, blocks sign-in, and leaves the share row readable.
- A second request keeps the first `scheduled_at`.
- Password change rejects a bad current password and a mismatched confirmation, and accepts a matching new password.
- Purge before the instant is a no-op. Purge after the instant removes the user, the handouts, and the deletion row. A second purge does not throw.

Use `createTestUser` and the admin client already in `__tests__/integration/helpers/`. Do not point tests at the test helper from `src/`.

### Manual Testing Steps

1. Sign in and open Settings from the dashboard. Confirm the email.
2. Change the password. Sign out. Sign in with the new password. Confirm the old password fails.
3. Request deletion with a wrong password. Confirm the dialog stays open and the dashboard still loads.
4. Request deletion with the right password. Confirm the goodbye page shows a local date and time, and the dashboard redirects to sign-in.
5. Open a published share link. Confirm the handout is readable and the sentence uses that same local date and time.
6. Try to sign in. Confirm the closed-account sentence, not a raw auth error.
7. Run `npm test -- --project integration`. Confirm the purge cases pass, including a past instant that removes the share row. Confirm `wrangler.jsonc` lists the daily cron and the Worker export includes `scheduled`.

## Performance Considerations

The cron runs once a day and deletes only rows already due. The share page adds one column to a query it already runs. Formatting happens in the browser for that one instant.

## Migration Notes

Existing handouts gain a null `scheduled_deletion_at`. No backfill. GMs who have not requested deletion are unchanged. Rollback is the migration down plus removing the routes. Users already banned stay banned until an operator clears the ban or the cron deletes them. Do not ship the ban without the cron.

## References

- Roadmap: `context/foundation/roadmap.md` (S-13)
- PRD: `context/foundation/prd.md` (FR-012, NFR browser-compatibility). Account deletion has no FR yet.
- `supabase/migrations/20260528200000_create_handouts_table.sql` (`gm_id` cascade, `anon_select_shared`, `gm_update_non_archived`)
- `src/pages/api/auth/signin.ts`
- `src/pages/share/[token].astro`
- `src/components/atoms/DeleteHandoutButton.tsx`
- `sentry.server.config.ts`
- `context/foundation/lessons.md` (ownership filter on writes, no raw database errors, exports at the end of the file)

## Progress

> `- [ ]` is pending and `- [x]` is complete. Append the closing short SHA when a step lands. Do not rename step titles.

### Phase 1: Deletion record

#### Automated

- [x] 1.1 The migration applies, `account_deletions` exists with deny policies for `anon` and `authenticated` on `SELECT`, `INSERT`, `UPDATE`, and `DELETE`, and `handouts.scheduled_deletion_at` is nullable. 8aea0c9
- [x] 1.2 A wrong password returns `401` and inserts no `account_deletions` row. 8aea0c9
- [x] 1.3 A correct password inserts one row that stores that GM's email, stamps draft, published, and archived handouts for that GM, and leaves the auth user in place. 8aea0c9
- [x] 1.4 After a successful request, `signInWithPassword` for that user fails, and a share-token read of a published handout still returns the row, including `scheduled_deletion_at`. 8aea0c9
- [x] 1.5 A second successful request keeps the original `scheduled_at`. 8aea0c9
- [x] 1.6 `npm test -- --project integration` covers the cases above, and `npm run lint` passes. 8aea0c9

### Phase 2: Settings

#### Automated

- [x] 2.1 A password change with a wrong current password returns `401` and the old password still signs in. bf76260
- [x] 2.2 A password change with mismatched confirmation is rejected and does not call `updateUser`. bf76260
- [x] 2.3 A password change with the right current password lets the new password sign in. bf76260
- [x] 2.4 `formatDeletionInstant` returns the previous local day for an instant just after midnight UTC when the zone is `America/Los_Angeles`. bf76260
- [x] 2.5 `npm test -- --project unit` passes `__tests__/lib/format-deletion-instant.test.ts`, and `npm run lint` passes. bf76260

#### Manual

- [x] 2.6 The dashboard header opens `/settings`, and the page shows the signed-in email. bf76260
- [x] 2.7 A wrong current password on the change form shows an error and leaves the GM signed in. bf76260
- [x] 2.8 A matching new password signs in afterward, and the old password does not. bf76260
- [x] 2.9 Delete with a wrong password keeps the dialog open and leaves the GM on `/settings`. bf76260
- [x] 2.10 Delete with the right password lands on the goodbye page, signed out, with the local date and time in the sentence. bf76260

### Phase 3: Visible dates

#### Manual

- [x] 3.1 A shared handout whose GM is scheduled shows `Scheduled for deletion by {date}` above the content, and the handout body is still there. a02f972
- [x] 3.2 The date on that page matches the goodbye page's date in the same browser. a02f972
- [x] 3.3 A handout with no scheduled instant has no sentence. a02f972
- [x] 3.4 Signing in during the 30 days shows the closed-account sentence with the local date, and does not show the raw Supabase error. a02f972
- [x] 3.5 After the phrase is visible, reloading the share page still shows it. a02f972

### Phase 4: Cron purge

#### Automated

- [x] 4.1 `purgeScheduledAccounts` with `now` before `scheduled_at` deletes no user and leaves the handout.
- [x] 4.2 `purgeScheduledAccounts` with `now` after `scheduled_at` deletes the auth user, the handouts, and the `account_deletions` row.
- [x] 4.3 A second call after that deletion completes without throwing.
- [x] 4.4 A share-token read after the purge returns no row.
- [x] 4.5 `npm test -- --project integration` covers the cases above, and `npm run lint` passes.
- [x] 4.6 `npm test -- --project integration` confirms a past instant removes that GM's share link.

#### Manual

- [x] 4.7 `wrangler.jsonc` lists the daily cron, and the Worker export includes `scheduled`.
