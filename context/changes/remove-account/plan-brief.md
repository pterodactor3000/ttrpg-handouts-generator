# Remove Account Plan Brief

> Full plan: `context/changes/remove-account/plan.md`
> Roadmap: `context/foundation/roadmap.md` (S-13)

## What & Why

A signed-in GM can change their password or close their account from settings. Closing the account stops sign-in immediately, keeps handouts and share links for 30 days, and then removes the account and the handouts. There is no way back in.

## Starting Point

There is no settings page. Sign-out is the only account action, on the dashboard header. Deleting an auth user cascades that GM's handouts, so a day-0 delete would kill share links. The app has no cron and no service-role client outside tests.

## Desired End State

`/settings` shows the email, a password form, and delete. Delete asks for the current password. On success the GM is signed out and sees one sentence with the local date and time. Shared handouts stay readable and show `Scheduled for deletion by {date}`. Sign-in during the 30 days shows that same fact. A daily cron then deletes the auth user, and the handouts go with it.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Where | Protected `/settings`, linked from the dashboard | The slice asked for account settings, separate from the handout grid |
| Confirm | Dialog plus the current password | A typo or an unlocked session must not close the account |
| Day 0 | End every session and block later sign-in | An open tab on another device cannot keep editing |
| Session revoke | Anon client `signOut({ scope: 'global' })`, then the service-role ban | `admin.signOut` takes a JWT, not a user id |
| Keep the auth user | Ban and revoke, delete only at purge | `gm_id` cascades handouts, so day-0 `deleteUser` would drop the links |
| Purge | Daily Cloudflare cron at 03:00 UTC | The app already deploys to Workers, and nothing runs on a schedule today |
| Date | One instant, shown in the viewer's local day and time | Two browsers can show different local times, and the purge still happens once |
| Notice | Above the shared handout, body still readable | Players can use the handout and see the deadline |
| Goodbye | One account sentence, no title list | The share page already carries the date per handout |
| Sign-in | Closed-account sentence with the date | The GM can tell a closed account from a wrong password |
| Sign-in lookup | `account_deletions.email` via the service role | The admin client cannot look up a user by email |
| `account_deletions` access | Deny policies for `anon` and `authenticated` | The service role bypasses RLS, and the repo requires a policy per operation |
| Settings scope | Email, change password, and delete | Password change was included with the settings page |
| Failure | Stay signed in, dialog stays open | A bad password does not start the 30 days |

## Scope

**In scope:**

- `/settings`, change password, and the delete dialog
- A 30-day instant on the auth user, on `account_deletions` (including that GM's email), and on each handout
- Ban, global sign-out, the goodbye page, the share sentence, and the sign-in sentence
- A daily cron that deletes due auth users

**Out of scope:**

- Reactivation, email, or a public purge URL
- Deleting the auth user on day 0
- A profile editor beyond email, password, and delete
- Replacing the handout body, or listing titles on the goodbye page

## Architecture / Approach

The anon client checks the password, then calls `signOut({ scope: 'global' })` after the writes. The service role writes the instant, bans the user, and later calls `deleteUser`. A failed sign-in reads `scheduled_at` from `account_deletions` by email. The share page reads `scheduled_deletion_at` from the handout it already loads. The browser formats that instant. The cron reads `account_deletions` and deletes due users. The cascade removes the handouts.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Deletion record | Instant, ban, and session revoke without deleting the user | Stamping archived handouts needs the service role |
| 2. Settings | Password change, delete dialog, goodbye page, and the local date formatter | A failed write must not look like success |
| 3. Visible dates | Share sentence and sign-in sentence, reusing the Phase 2 formatter | The server must not guess the viewer's zone |
| 4. Cron purge | Daily delete of due users | The Sentry Worker wrapper must still run `scheduled` |

**Prerequisites:** S-01 is done. The service-role key must be available to the Worker, not only to tests.
**Estimated effort:** one pass across 4 phases.

## Open Risks & Assumptions

- `Sentry.withSentry` may not forward `scheduled`. The plan wraps the export if it does not.
- A late cron still leaves the user banned, because the ban outlasts the 30 days.
- The goodbye `at` query is display-only. The stored instant is the purge time.
- Account deletion has no PRD requirement yet. The plan cites FR-012 and browser compatibility as the closest refs.

## Success Criteria (Summary)

- The GM can change the password from `/settings` and stay signed in.
- Delete with the current password ends every session, and a wrong password does not.
- Shared handouts stay up for 30 days with the local deletion date, then 404 after the cron.
