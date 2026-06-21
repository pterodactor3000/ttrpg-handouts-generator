# Edit Handout Implementation Plan

## Overview

GMs need to reopen existing handouts, modify their content and metadata, and save — with edits on published handouts propagating immediately to the live share link. This plan wires up the full edit flow: relaxing the PUT API filter, extending `HandoutEditor` to accept initial data, creating the `/handouts/[id]/edit` SSR page, and adding edit navigation from the dashboard.

## Current State Analysis

`HandoutEditor` already contains the complete create/update form and calls `PUT /api/handouts/[id]` for subsequent saves within the same browser session. However:
- `HandoutEditor` accepts **no props** — always starts empty, hardcodes "New Handout" heading.
- `PUT /api/handouts/[id]` filters `.eq('status', 'draft')` — published handouts cannot be updated.
- Save button is `disabled` when `shareToken` is set — the component assumes publish = end of editing.
- Share button calls `/publish` unconditionally — no path for "already published, just show the link".
- No `/handouts/[id]/edit` route exists; dashboard has no edit links.
- RLS `gm_update_non_archived` already permits GMs to UPDATE draft and published rows. The API filter is the only blocker.

## Desired End State

GM can click "Edit" on any non-archived handout card, arrive at `/handouts/[id]/edit` with all fields pre-populated, modify content, and save — the existing share link for published handouts continues to work and immediately reflects the new content. The dashboard shows an Edit link for every non-archived handout.

### Key Discoveries

- `PUT /api/handouts/[id]` line 72 (`src/pages/api/handouts/[id].ts`): `.eq('status', 'draft')` is the only app-layer blocker for published-handout edits.
- RLS `gm_update_non_archived` (`supabase/migrations/20260528200000_create_handouts_table.sql` lines 43–46) already allows UPDATE on draft + published; archived is blocked at DB level too.
- `serializeFormState` (line 25–36 `HandoutEditor.tsx`) drives dirty-check; must be initialized from the incoming prop values so the form doesn't appear dirty on load.
- Save button disabled condition: `isSaving || !!shareToken` (line 213) — must drop `!!shareToken` for edit mode.
- Share button disabled when `!!shareToken` (line 228) — in edit mode with a published handout the button should open `ShareDialog` directly with the existing token instead of calling `/publish`.
- `HandoutListItem` (`src/lib/handout-list.ts` line 3–6) includes `id` and `status` — sufficient for the edit link in `HandoutCard`.

## What We're NOT Doing

- No new `GET /api/handouts/[id]` route — the edit page loads data via SSR in the Astro frontmatter, consistent with the dashboard (S-02).
- No "Live link updated" toast on save — edits propagate silently per roadmap spec ("propagate immediately").
- No re-publishing or token rotation — the existing `share_token` is permanent (NFR link-permanence); the Share button in edit mode shows the existing token only.
- No edit access for archived handouts — redirect to `/dashboard`.
- No version history, undo, or conflict detection (PRD non-goals).
- No changes to the publish flow for **new** handouts — behavior unchanged on `/handouts/new`.

## Implementation Approach

Four sequential phases: API first (unblocks published-handout saves), then component (testable in isolation), then page + navigation (wires it all together), then tests. No migration required — the RLS policy already covers the use case.

---

## Phase 1: Relax PUT API Filter

### Overview

Remove the `.eq('status', 'draft')` filter from the UPDATE query and replace it with `.neq('status', 'archived')`. This unblocks editing published handouts while preserving defence-in-depth against archived-row mutation (RLS blocks it anyway, but the app layer must also assert it per the project lesson).

### Changes Required

#### 1. PUT route — status filter

**File**: `src/pages/api/handouts/[id].ts`

**Intent**: Allow GMs to update both draft and published handouts; continue blocking archived rows at the application layer in addition to RLS.

**Contract**: In the Supabase UPDATE chain (lines 62–74), replace `.eq('status', 'draft')` with `.neq('status', 'archived')`. All other filters (`.eq('id', handoutId)`, `.eq('gm_id', user.id)`) remain unchanged. Error handling for PGRST116 / no-rows cases is unchanged.

### Success Criteria

#### Automated Verification

- Type checking passes: `npm run lint`
- Integration tests for edit (Phase 4) pass: `npm test -- --project integration`

#### Manual Verification

- `PUT /api/handouts/[id]` with a published handout `id` and valid auth returns `200 { id }`.
- `PUT /api/handouts/[id]` with an archived handout `id` returns a non-2xx error.
- `PUT /api/handouts/[id]` with another user's session returns a non-2xx error.

**Implementation Note**: This is a one-line change. Pause after this phase to confirm manual API verification before the component work begins.

---

## Phase 2: HandoutEditor Initial-Data Props

### Overview

Add an optional `initialHandout` prop to `HandoutEditor`. When provided, the component pre-populates all form fields, sets the handout ID and share token, and initializes the dirty-check snapshot — so the form is clean on load. Adjust the Save and Share button behaviors for the already-published case.

### Changes Required

#### 1. Types — `InitialHandout`

**File**: `src/types.ts`

**Intent**: Introduce a camelCase DTO representing the data the edit page passes into `HandoutEditor`. Keep it separate from the snake_case DB `Handout` type so the component has no knowledge of the DB naming convention.

**Contract**: Add and export `InitialHandout`:
```typescript
interface InitialHandout {
  id: string;
  title: string;
  markdownContent: string;
  backgroundCategory: BackgroundCategory;
  tags: string[];
  status: HandoutStatus;
  shareToken: string | null;
}
```

#### 2. `HandoutEditor` — accept and apply prop

**File**: `src/components/organisms/HandoutEditor.tsx`

**Intent**: Make the component work for both create (no prop) and edit (prop provided) without changing the create flow.

**Contract**:
- Change signature from `const HandoutEditor = () => {` to accept `{ initialHandout }: { initialHandout?: InitialHandout }`.
- Initialize each `useState` from the prop when present, falling back to the existing empty defaults:
  - `title` ← `initialHandout?.title ?? ''`
  - `markdownContent` ← `initialHandout?.markdownContent ?? ''`
  - `backgroundCategory` ← `initialHandout?.backgroundCategory ?? null`
  - `tags` ← `initialHandout?.tags ?? []`
  - `handoutId` ← `initialHandout?.id ?? null`
  - `shareToken` ← `initialHandout?.shareToken ?? null`
  - `savedSnapshot` ← when prop provided, call `serializeFormState` with the prop values; otherwise keep the current empty-state call.
- Remove `!!shareToken` from the Save button `disabled` condition (line 213). Save should always be available while not in-flight.
- Share button: when `shareToken` is already set (i.e. `initialHandout` carries a published token), clicking Share should open `ShareDialog` directly (`setShareDialogOpen(true)`) rather than calling `/api/handouts/[id]/publish`. When `shareToken` is null, the existing publish flow is unchanged. The `disabled` condition changes from `!handoutId || isSaving || isPublishing || !!shareToken` to `!handoutId || isSaving || isPublishing`.
- Page heading: render `"Edit Handout"` when `initialHandout` is provided, `"New Handout"` otherwise.

### Success Criteria

#### Automated Verification

- Type checking passes: `npm run lint`
- Unit tests for `HandoutEditor` with `initialHandout` prop pass: `npm test -- --project unit`

#### Manual Verification

- Navigate to `/handouts/new`: form is empty, heading reads "New Handout", Save/Share behavior unchanged.
- Navigate to `/handouts/[id]/edit` for a draft: heading reads "Edit Handout", all fields pre-populated, form is not dirty on load, Save enabled.
- Navigate to `/handouts/[id]/edit` for a published handout: Save button enabled, Share button opens the existing link dialog without calling `/publish`.

**Implementation Note**: Pause after unit tests pass before wiring up the page.

---

## Phase 3: Edit Page and Dashboard Navigation

### Overview

Create the SSR Astro page `/handouts/[id]/edit` that loads the handout by owner and passes it to `HandoutEditor`. Add an Edit link to `HandoutCard` for non-archived handouts.

### Changes Required

#### 1. Edit page — SSR Astro route

**File**: `src/pages/handouts/[id]/edit.astro` *(new file)*

**Intent**: Load a GM's handout server-side, enforce ownership and non-archived status, and mount the pre-populated editor.

**Contract**:
- `export const prerender = false`.
- `const user = context.locals.user` — middleware guarantees this for `/handouts/*` routes (already in `PROTECTED_ROUTES`).
- Extract `id` from `Astro.params`. Validate as UUID with `z.uuid().safeParse(id)` — return `Astro.redirect('/dashboard')` on invalid.
- Query Supabase authenticated client: select `id, title, markdown_content, background_category, tags, status, share_token` from `handouts` where `id = param` and `gm_id = user.id` and `status != 'archived'`. Use `.maybeSingle()`.
- If no row returned (wrong owner, non-existent id, or archived): `return Astro.redirect('/dashboard')`.
- Map the DB row to `InitialHandout` (snake_case → camelCase).
- Render inside `<Layout title="Edit Handout">` and mount `<HandoutEditor client:load initialHandout={mappedHandout} />`.

#### 2. Dashboard card — Edit link

**File**: `src/components/molecules/HandoutCard.astro`

**Intent**: Give GMs a clear path from the dashboard to the edit page for any handout they can modify.

**Contract**: In the card footer (`div[data-handout-card-footer]`, line 52), add an `<a href={/handouts/${handout.id}/edit}>` link that renders only when `handout.status !== 'archived'`. Style consistent with the existing ghost-button pattern in the footer. The link text is `"Edit"`. Position it alongside the archive/delete action group.

### Success Criteria

#### Automated Verification

- Build succeeds: `npm run build`
- Lint passes: `npm run lint`

#### Manual Verification

- Dashboard shows an Edit link on draft and published cards; no Edit link on archived cards.
- Clicking Edit on a draft navigates to `/handouts/[id]/edit` with form pre-populated.
- Clicking Edit on a published handout navigates to `/handouts/[id]/edit`; Save is enabled; Share opens the existing link.
- Navigating directly to `/handouts/[id]/edit` for an archived handout redirects to `/dashboard`.
- Navigating directly to `/handouts/[id]/edit` with a non-existent or another user's ID redirects to `/dashboard`.

**Implementation Note**: Pause here for full manual smoke-test of the edit flow end-to-end before writing tests.

---

## Phase 4: Tests

### Overview

Extend the existing `HandoutEditor` unit test file with prop-variant coverage. Add an integration test file for the relaxed PUT route.

### Changes Required

#### 1. Unit tests — HandoutEditor with initialHandout

**File**: `__tests__/components/organisms/HandoutEditor.test.tsx`

**Intent**: Verify that the component correctly applies `initialHandout` prop values to form state and adjusts button behavior for the pre-published case.

**Contract**: Add a `describe('HandoutEditor — edit mode (initialHandout prop)')` block with:
- Form fields (title input, markdown textarea) render with values from `initialHandout`.
- Save button is **enabled** when `initialHandout.shareToken` is non-null.
- Clicking Share when `initialHandout.shareToken` is set opens the share dialog **without** calling `fetch` (mock fetch asserts zero calls).
- Form is **not dirty** on initial render with prop (no discard dialog when clicking Back immediately).

#### 2. Integration tests — PUT on non-draft handouts

**File**: `__tests__/integration/handouts/edit-handout.integration.test.ts` *(new file)*

**Intent**: Verify the relaxed PUT filter at the API boundary — published handouts can be updated; archived cannot.

**Contract**: Follow the pattern from `archive-handout.integration.test.ts` (admin client for fixtures, `vi.mock('@/lib/supabase')`, `makeContext`, `signInAsUser`). Cover:
- `PUT` on an **owner's draft** handout → `200 { id }` (baseline; also covered in existing validation tests but explicit here for completeness).
- `PUT` on an **owner's published** handout → `200 { id }` *(net-new assertion, was previously 500)*.
- `PUT` on an **owner's archived** handout → non-2xx (PGRST116 path → `500 { error: 'Failed to save handout' }`).
- `PUT` by a **non-owner** → non-2xx (no rows matched).

### Success Criteria

#### Automated Verification

- Unit tests pass: `npm test -- --project unit`
- Integration tests pass: `npm test -- --project integration`
- Lint passes: `npm run lint`

#### Manual Verification

- No regressions in existing back-button tests.
- Create-flow on `/handouts/new` unaffected.

---

## Testing Strategy

### Unit Tests

- `HandoutEditor` prop variants: pre-populated fields, save-enabled-when-published, share-opens-dialog-directly, not-dirty-on-load.
- Existing back-button tests must continue to pass with the signature change.

### Integration Tests

- PUT: draft → 200, published → 200, archived → 500, wrong owner → 500.

### Manual Testing Steps

1. Log in as a GM; create and save a draft handout.
2. From dashboard, click Edit — confirm form pre-populated, heading "Edit Handout", form not dirty.
3. Edit title, click Save — confirm redirect-less save, form becomes non-dirty.
4. Publish the handout, then click Edit from dashboard — confirm Save enabled, Share opens link dialog without re-publishing.
5. Open the share link in a private window — confirm content reflects saved edits.
6. Archive the handout; confirm no Edit link on archived card.
7. Try navigating directly to `/handouts/[id]/edit` for the archived handout — confirm redirect to `/dashboard`.

## References

- Roadmap S-03: `context/foundation/roadmap.md` lines 110–120
- S-01 plan (editor patterns): `context/archive/2026-05-30-first-handout-creation-and-sharing/plan.md`
- S-04 plan (integration test pattern): `context/archive/2026-06-07-delete-handout/plan.md`
- RLS policy: `supabase/migrations/20260528200000_create_handouts_table.sql` lines 43–46

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Relax PUT API Filter

#### Automated

- [x] 1.1 Lint passes after filter change — 8a5f74f

#### Manual

- [x] 1.2 PUT on published handout returns 200 — 8a5f74f
- [x] 1.3 PUT on archived handout returns non-2xx — 8a5f74f
- [x] 1.4 PUT by wrong owner returns non-2xx — 8a5f74f

### Phase 2: HandoutEditor Initial-Data Props

#### Automated

- [ ] 2.1 Lint passes
- [ ] 2.2 Unit tests (HandoutEditor edit-mode describe block) pass

#### Manual

- [ ] 2.3 `/handouts/new` unchanged (empty form, "New Handout" heading)
- [ ] 2.4 Edit page: draft handout pre-populated, not dirty on load, Save enabled
- [ ] 2.5 Edit page: published handout — Save enabled, Share opens dialog without publish call

### Phase 3: Edit Page and Dashboard Navigation

#### Automated

- [ ] 3.1 Build succeeds
- [ ] 3.2 Lint passes

#### Manual

- [ ] 3.3 Edit link visible on draft + published cards; absent on archived
- [ ] 3.4 Edit flow end-to-end: draft handout
- [ ] 3.5 Edit flow end-to-end: published handout, share link reflects edits
- [ ] 3.6 Archived redirect and wrong-owner redirect work

### Phase 4: Tests

#### Automated

- [ ] 4.1 Unit tests pass (all HandoutEditor tests)
- [ ] 4.2 Integration tests pass (edit-handout suite)
- [ ] 4.3 Lint passes
