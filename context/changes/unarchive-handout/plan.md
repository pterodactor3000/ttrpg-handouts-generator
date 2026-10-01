# Unarchive Handout Implementation Plan

## Overview

S-14 lets a GM restore an archived handout to draft or published from the Archived list. Published keeps the existing share token. Draft keeps that token too, and the public page stops serving the handout until it is published again. This extends the state machine past the current rule that an archived handout cannot be updated.

## Current State Analysis

`POST /api/handouts/[id]/archive` in `src/pages/api/handouts/[id]/archive.ts` sets `status` to `archived` and writes `archived_at`. It accepts any non-archived row the GM owns, including a draft. A new handout insert in `src/pages/api/handouts/index.ts` does not set `share_token`. `src/types.ts` records that token as null until publish.

`POST /api/handouts/[id]/publish` in `src/pages/api/handouts/[id]/publish.ts` loads a draft, rejects an empty title, empty content, or missing background with `422`, then writes `status: 'published'` and a new `crypto.randomUUID()` token. Calling that route from restore would replace a token players already have.

`gm_update_non_archived` in `supabase/migrations/20260528200000_create_handouts_table.sql` allows `UPDATE` only when `status <> 'archived'`. `gm_delete_archived` allows delete only for archived rows the GM owns. The edit loader and `PATCH` handler both exclude archived rows.

`HandoutCard` in `src/components/molecules/HandoutCard.astro` hides Edit and Archive on an archived card and shows Delete. The copy control renders whenever `share_token` is set, including archived. The title is a link to `/share/{token}` in that same case. The share page selects `published` and `archived` only.

`moveHandoutCardToArchivedSection` in `src/lib/archive-handout-card-dom.ts` moves the card into `[data-handout-grid="archived"]` and swaps the visible actions. The dashboard filter in `src/components/organisms/DashboardDrawer.tsx` shows one `[data-handout-list]` by toggling the `hidden` attribute. CSS in `src/components/organisms/HandoutList.astro` hides the empty copy while that list's grid contains an article.

## Desired End State

From the Archived list, the GM opens Restore, chooses draft or published, and the card leaves Archived. Draft shows Edit and Archive, and no copy control. Published shows Edit, Archive, and the same player link when a token already existed. A publish check failure leaves the card archived and explains what is missing inside the open dialog.

Verify by the automated checks in Phase 1 and the manual checks in Phase 2.

### Key Discoveries

- The publish route replaces `share_token` on every success. Restore must not call it.
- The current update policy cannot target an archived row. Restore needs its own policy.
- A draft can be archived with a null token. Published restore of that row has no link to reuse.
- The copy control and the title link are rendered on the server. A token minted during restore is not already in the card.

## What We're NOT Doing

- Editing the title, body, or tags from the Archived list
- Clearing `share_token` on draft restore
- Regenerating `share_token` when one is already stored
- Clearing `published_at` on draft restore
- Changing `scheduled_deletion_at`
- A new share-page rule for drafts
- Permanent delete, which stays the archived-card Delete control
- A dashboard reload after restore

## Implementation Approach

Add one update policy and `POST /api/handouts/[id]/unarchive`. The body selects `draft` or `published`. The route updates only the restore fields, scoped with `.eq('gm_id', user.id)` and `.eq('status', 'archived')`.

The archived card gets one Restore button and a dialog with both targets. Success moves the card into `[data-handout-grid="draft"]` or `[data-handout-grid="published"]` and leaves the Archived filter selected, so the card disappears from the list the GM is looking at. The target list stays `hidden` until the GM chooses that filter.

## Critical Implementation Details

Do not send this restore through `publish.ts`. That handler always assigns a new token.

`gm_update_non_archived` uses the row's current status. An archived row never matches it. The new policy's `USING` clause must match `status = 'archived'`, and its `WITH CHECK` clause must require the new status to be `draft` or `published`. That WITH CHECK does not veto a row that stays archived. `gm_update_non_archived` is permissive, and its WITH CHECK is only `gm_id = auth.uid()`. Permissive WITH CHECK expressions are OR'd, so the older check already allows any new row the owner still owns. The same migration adds a BEFORE UPDATE trigger. The trigger rejects the write when `OLD.status` is `archived` and `NEW.status` is outside `draft` and `published`.

The dialog stays open for `422`. Network failures and other status codes follow Archive: close the dialog and show a generic toast. The `422` body is the joined sentences already returned by publish: title, content, and background.

When the card already has a copy control, the mover only shows or hides it. When published restore mints a token and the card has no copy control, the mover adds the title link and a copy button, then moves the card. It does not navigate away. `CopyLinkButton` is a React island, so the minted-token control is plain DOM until the next full load.

## Phase 1: Restore record

### Overview

The GM's session can move an archived row to draft or published. The share token and `archived_at` follow the decisions above. Tests hit the route handler with the same context stub the archive tests use.

### Changes Required

#### 1. Update policy

**File**: `supabase/migrations/20261001190000_gm_restore_archived.sql`

**Intent**: Let the owning GM update an archived handout only as part of leaving the archived status.

**Contract**: Policy `gm_restore_archived`, `UPDATE` for `authenticated`. `USING` is `gm_id = auth.uid()` and `status = 'archived'`. `WITH CHECK` is `gm_id = auth.uid()` and `status` in `('draft', 'published')`. Leave `gm_update_non_archived` and `gm_delete_archived` in place. In the same migration, add a BEFORE UPDATE trigger on `handouts`. It rejects the update when `OLD.status` is `archived` and `NEW.status` is not `draft` or `published`.

#### 2. Restore route

**File**: `src/pages/api/handouts/[id]/unarchive.ts`

**Intent**: Apply one chosen target, or refuse a published restore that would fail the publish checks.

**Contract**: Export `const prerender = false` and `POST`, matching `archive.ts`. Zod body: `target` is `'draft'` or `'published'`. Require a signed-in user. Validate the id with `z.uuid()`. Load the archived row the GM owns, including `title`, `markdown_content`, `background_category`, `share_token`, and `published_at`.

Draft: set `status` to `draft` and `archived_at` to null. Leave `share_token` and `published_at` unchanged.

Published: if the title, content, or background would fail `publish.ts`, respond `422` with those same sentences joined, and do not write. Otherwise set `status` to `published` and `archived_at` to null. Keep a stored `share_token`. When `share_token` is null, set it to a new UUID and set `published_at` to now when `published_at` is null.

Respond `200` with `{ id, status, shareToken }`. `shareToken` is the stored or newly minted token, or null for a draft that has none. Missing user: `401`. Bad body or id: `400`. Row missing, not archived, or owned by someone else: `404`. Other database failures: log the raw error, report it to Sentry, and respond `500` with a generic message. The update filter includes `.eq('gm_id', user.id)` and `.eq('status', 'archived')`.

#### 3. Integration coverage

**File**: `__tests__/integration/handouts/unarchive-handout.integration.test.ts`

**Intent**: Prove the route's status, token, and timestamp rules against local Supabase.

**Contract**: Follow `__tests__/integration/handouts/archive-handout.integration.test.ts`: admin fixture, owner session, other-owner session, handler called with `makeContext`. Cover the automated checks below.

### Success Criteria

#### Automated Verification

- The migration applies, and `gm_restore_archived` lets the owner update an archived row to draft or published.
- Draft restore sets `status` to `draft`, sets `archived_at` to null, and leaves `share_token` and `published_at` unchanged.
- Published restore of a row that already has `share_token` keeps that token, sets `status` to `published`, and sets `archived_at` to null.
- Published restore of a valid archived draft with a null token writes a token and sets `published_at`.
- Published restore of an archived row with an empty title returns `422`, and the row stays archived with the same `archived_at`.
- Another GM receives `404`, and the owner's row stays archived.
- A direct owner update that leaves `status` as `archived` fails, and the row stays unchanged.
- `npm test -- --project integration` covers the cases above, and `npm run lint` passes.

#### Manual Verification

- None for this phase. The route has no page yet.

**Implementation Note**: After the automated checks pass, continue to Phase 2. This phase has no manual check.

---

## Phase 2: Restore control

### Overview

Archived cards offer Restore. The dialog explains the share link, keeps a failed publish on screen, and moves a successful card into the matching list.

### Changes Required

#### 1. Restore dialog

**File**: `src/components/atoms/RestoreHandoutButton.tsx`

**Intent**: Let the GM pick draft or published, and keep a failed publish in the dialog.

**Contract**: Default export at the end of the file. Render it only for archived cards, beside Delete in `src/components/molecules/HandoutCard.astro`. The dialog names the handout and states both outcomes. Draft stops the public page until publish. Published reopens an existing link, or creates one when the handout never had one. `POST` `{ target }` to `/api/handouts/${id}/unarchive`. On `422`, stay open and show the string `error`. On other failures, close and toast a generic message. On `200`, close, then move the card. Stay on the dashboard.

#### 2. Card move

**File**: `src/lib/archive-handout-card-dom.ts`

**Intent**: Make a restored card match the draft or published card the dashboard would have rendered.

**Contract**: Add a mover that prepends the card to `[data-handout-grid="draft"]` or `[data-handout-grid="published"]`. Do not change which `[data-handout-list]` is `hidden`. Set the badge label, classes, and `data-status` from `StatusBadge` for the target status. Remove the `hidden` class from Edit and Archive. Add the `hidden` class to Delete. Hide `[data-handout-copy-action]` for draft, and show it for published when it exists. When published restore returns a token and the card has no copy control, add `[data-handout-copy-action]` with a button that copies `/share/{token}`, and make the title a link to that URL. For draft, the title is plain text. For published, the title links to `/share/{token}`.

**File**: `src/components/molecules/HandoutCard.astro`

**Intent**: Give the mover stable hooks, and stop offering a copy control on drafts.

**Contract**: Wrap the copy control in `[data-handout-copy-action]`. Render that control when `share_token` is set and `status` is not `draft`. Render `[data-handout-edit-action]` for archived cards with the `hidden` class, so the mover can reveal the Edit link. Mark the title element so the mover can switch it between text and a share link.

#### 3. Mover tests

**File**: `__tests__/lib/archive-handout-card-dom.test.ts`

**Intent**: Lock the badge, the actions, and which grid receives the card.

**Contract**: Extend the existing DOM tests. Draft move hides copy and Delete, shows Edit and Archive, and leaves the card in the draft grid. Published move shows copy when the hook exists. After the last archived card leaves, the archived empty copy is visible.

### Success Criteria

#### Automated Verification

- The mover tests in `__tests__/lib/archive-handout-card-dom.test.ts` pass.
- `npm test -- --project unit` passes, and `npm run lint` passes.

#### Manual Verification

- Archived cards show Restore. The dialog offers draft and published and describes the share link.
- A published restore that fails the checks stays in the dialog, shows the missing-field message, and the card remains under Archived.
- A draft restore removes the card from Archived. Drafts shows it with Edit and Archive, and without a copy control.
- A published restore of a handout that already has a token shows that same link and a copy control.
- A published restore of a handout that never had a token stays on the page, moves the card into Published, and that card shows a title link and a copy control.

**Implementation Note**: After the automated checks pass, pause for the manual checks before treating the slice as done.

---

## Testing Strategy

### Unit Tests

- Card move for draft and published: grid, badge, Edit, Archive, Delete, and copy visibility.
- Empty archived list after the last card moves.

### Integration Tests

- Draft restore preserves the token and clears `archived_at`.
- Published restore preserves an existing token.
- Published restore mints a token only when the archived draft has none.
- `422` does not write.
- Another GM cannot restore the row.

### Manual Testing Steps

1. Archive a published handout, restore it to draft, and confirm the old share URL no longer loads.
2. Publish it again from the editor and confirm the share URL matches the token from before the archive.
3. Restore an archived published handout straight to published and open the same share URL.
4. Archive a draft with an empty title, choose published, and confirm the dialog explains the missing title while the card stays archived.
5. Choose draft for that handout and confirm it appears under Drafts.
6. Archive a draft that has a title, content, and background, restore it to published, and confirm Archived stays the open list while the card leaves it. Open Published and confirm the title link and copy control.

## Performance Considerations

Restore is one read and one update for a single row the GM already has on screen. No list refetch on the in-place path.

## Migration Notes

Apply `20261001190000_gm_restore_archived.sql` before the route tests. Existing archived rows stay archived until a GM restores them. No backfill.

## References

- Roadmap S-14: `context/foundation/roadmap.md`
- Linear: TEC-23
- Archive route: `src/pages/api/handouts/[id]/archive.ts`
- Publish checks: `src/pages/api/handouts/[id]/publish.ts`
- Update policy: `supabase/migrations/20260528200000_create_handouts_table.sql`
- Card move: `src/lib/archive-handout-card-dom.ts`
- Lessons in `context/foundation/lessons.md`: ownership filter on writes, generic HTTP errors, and exports at the end of React files

## Progress

> `- [ ]` is pending and `- [x]` is complete. Append the closing short SHA when a step lands. Do not rename step titles.

### Phase 1: Restore record

#### Automated

- [x] 1.1 The migration applies, and `gm_restore_archived` lets the owner update an archived row to draft or published. d18c49b
- [x] 1.2 Draft restore sets `status` to `draft`, sets `archived_at` to null, and leaves `share_token` and `published_at` unchanged. d18c49b
- [x] 1.3 Published restore of a row that already has `share_token` keeps that token, sets `status` to `published`, and sets `archived_at` to null. d18c49b
- [x] 1.4 Published restore of a valid archived draft with a null token writes a token and sets `published_at`. d18c49b
- [x] 1.5 Published restore of an archived row with an empty title returns `422`, and the row stays archived with the same `archived_at`. d18c49b
- [x] 1.6 Another GM receives `404`, and the owner's row stays archived. d18c49b
- [x] 1.8 A direct owner update that leaves `status` as `archived` fails, and the row stays unchanged. d18c49b
- [x] 1.7 `npm test -- --project integration` covers the cases above, and `npm run lint` passes. d18c49b

### Phase 2: Restore control

#### Automated

- [x] 2.1 The mover tests in `__tests__/lib/archive-handout-card-dom.test.ts` pass. cd1e98a
- [x] 2.2 `npm test -- --project unit` passes, and `npm run lint` passes. cd1e98a

#### Manual

- [ ] 2.3 Archived cards show Restore. The dialog offers draft and published and describes the share link.
- [ ] 2.4 A published restore that fails the checks stays in the dialog, shows the missing-field message, and the card remains under Archived.
- [ ] 2.5 A draft restore removes the card from Archived. Drafts shows it with Edit and Archive, and without a copy control.
- [ ] 2.6 A published restore of a handout that already has a token shows that same link and a copy control.
- [ ] 2.7 A published restore of a handout that never had a token stays on the page, moves the card into Published, and that card shows a title link and a copy control.
