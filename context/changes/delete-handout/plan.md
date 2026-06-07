# Delete (Soft-Archive) Handout Implementation Plan

## Overview

Add a "Delete" action to each active handout card on the dashboard. A GM clicks Delete, confirms in a dialog, and the card disappears — the handout transitions to `archived` status in the database. Published handouts' share links remain fully accessible to players. This is roadmap slice S-04 (PRD FR-008, Business Logic state machine).

## Current State Analysis

The dashboard (S-02) is already complete at the component and data layer:

- `dashboard.astro` fetches all of the GM's handouts, calls `partitionHandouts`, and renders both the Active and Archived sections. The Archived section already exists but has no rows yet — S-04 is what populates it.
- `HandoutCard.astro` — themed card with gradient swatch, title, `StatusBadge`, tag chips, and `CopyLinkButton` island. No delete action present.
- `HandoutList.astro` — responsive grid with empty-state slot.
- `partitionHandouts` in `src/lib/handout-list.ts` — splits by status, sorts newest-first.
- Schema: `handouts` table has `status` enum (`draft | published | archived`) and `archived_at timestamptz` (column already present, always `null` until this slice).
- RLS: `gm_update_non_archived` permits `status → archived` transitions (USING: `gm_id = auth.uid() and status <> 'archived'`). `anon_select_shared` covers `status in ('published', 'archived')` — share links survive archive without any migration change.
- API: no archive route exists yet. `src/pages/api/handouts/[id]/publish.ts` is the direct pattern to follow.
- Dialogs: `Dialog` atom in `src/components/atoms/dialog.tsx` (Radix). `HandoutEditor.tsx` (lines 269–292) demonstrates the exact dark-theme confirmation pattern (Cancel + destructive action, no X close button).
- Toast: Sonner is not yet installed.

## Desired End State

A signed-in GM on `/dashboard`:

- Sees a **Delete** button on every Active-section card (draft and published). Archived-section cards have no Delete button.
- Clicking Delete opens a confirmation dialog naming the handout and noting that the share link stays live.
- Clicking **Confirm** archives the handout: the card animates out of the grid immediately (optimistic DOM removal). The Archived section appears (or gains a new card) on next page load.
- If the API call fails, a toast error appears and the card remains visible.
- Clicking **Cancel** closes the dialog without any change.

### Key Discoveries

- `src/pages/api/handouts/[id]/publish.ts:23-100` — canonical API pattern: auth check, UUID validation, `.eq('gm_id', user.id)` ownership assertion, PGRST116 error handling, no raw DB error leakage.
- `src/components/organisms/HandoutEditor.tsx:269-292` — confirmation dialog pattern to mirror: dark `bg-gray-900`, no `showCloseButton`, Cancel (`outline`) + destructive confirm.
- `src/components/atoms/CopyLinkButton.tsx` — island size/shape reference; `ArchiveButton` follows the same export-at-end convention.
- `src/integration/handouts/handout-ownership.integration.test.ts` — integration test template: `vi.mock('@/lib/supabase')`, `createAdminClient`, `makeContext`, test user lifecycle.
- `supabase/migrations/20260528200000_create_handouts_table.sql:45-54` — `gm_update_non_archived` USING clause and `anon_select_shared` confirm no migration is needed.

## What We're NOT Doing

- No hard delete — rows stay in the database at `archived` status.
- No bulk delete / select-all.
- No undo / restore from archived (S-03/future work).
- No delete button on archived cards — they're already archived.
- No schema or RLS changes — F-01 is complete.
- No page reload after archive — optimistic card removal only.
- No restyle (S-05 handles visual polish across all screens).

## Implementation Approach

Three phases, each independently verifiable:

1. **API route** — a `POST /api/handouts/[id]/archive` route that performs the status transition. Shorter than `publish.ts` (no content validation, no share token generation, single UPDATE).
2. **UI** — install Sonner, create the `ArchiveButton` React island (trigger + confirmation dialog + optimistic DOM removal + error toast), mount it on `HandoutCard` for non-archived cards.
3. **Tests** — unit test for `ArchiveButton` (dialog lifecycle, API call, DOM removal, error toast) + integration test for the archive route (auth, ownership, happy paths, idempotency).

## Critical Implementation Details

**Optimistic DOM removal without converting the card to React.** `HandoutCard.astro` is a server-rendered Astro component. The `ArchiveButton` island is nested inside it. On successful archive, the island calls `containerRef.current?.closest('article')?.remove()` where `containerRef` is a `useRef<HTMLSpanElement>` attached to a wrapper `<span>` around the island's JSX. This removes the entire card from the DOM without converting `HandoutCard` to React or triggering a page reload.

**PGRST116 must be distinguished from real DB errors in the archive route.** A single `.update(...).select('id').single()` returns PGRST116 when 0 rows match — which happens for a non-existent ID, a cross-owner attempt, or an already-archived handout. All three are 404s. Any other Supabase error code is a real failure → 500 with server-side logging.

---

## Phase 1: Archive API Route

### Overview

Create `POST /api/handouts/[id]/archive`. A one-shot status update: auth, UUID validation, application-layer ownership assertion, single UPDATE to `archived` + `archived_at`, PGRST116-aware response. No request body. Immediately verifiable against Supabase.

### Changes Required

#### 1. Archive API route

**File**: `src/pages/api/handouts/[id]/archive.ts`

**Intent**: Accept a `POST` request from an authenticated GM and transition the target handout to `archived` status, setting `archived_at`. Return 200 with `{ id }` on success; return 404 when the handout is not found, not owned by the caller, or already archived; return 500 on unexpected DB errors.

**Contract**: Export `const prerender = false` and `POST: APIRoute`. No request body to parse. Auth and UUID validation follow `publish.ts` exactly. The UPDATE query:

```ts
.update({ status: 'archived', archived_at: new Date().toISOString() })
.eq('id', handoutId)
.eq('gm_id', user.id)
.neq('status', 'archived')
.select('id')
.single()
```

On result: if `error?.code === 'PGRST116'` or `!data` → 404 `{ error: 'Handout not found or already archived' }`. If other error → `console.error('DB error archiving handout:', error)` → 500 `{ error: 'Failed to archive handout' }`. On success → 200 `{ id: data.id }`. Use local interfaces for query result types (mirror `publish.ts` pattern). Export at end of file.

### Success Criteria

#### Automated Verification

- `npm run lint` passes on the new file
- `npm run build` succeeds with no type errors
- `npx prettier --check .` passes (no formatting drift)

#### Manual Verification

- `curl -X POST /api/handouts/<valid-draft-id>` with a valid session cookie → 200 `{ "id": "..." }`, row in Supabase has `status = 'archived'` and a non-null `archived_at`
- Calling archive again on the same (now-archived) row → 404
- Calling archive with another user's session → 404

**Implementation Note**: After automated verification passes, pause here for manual confirmation before Phase 2.

---

## Phase 2: ArchiveButton Island + Toast + Card Integration

### Overview

Install Sonner, create the `ArchiveButton` React island, and mount it on `HandoutCard`. At the end of this phase the full delete flow works end-to-end: click Delete → dialog → confirm → card disappears; on API failure → toast error.

### Changes Required

#### 1. Install Sonner and wire the Toaster

**Files**: `package.json` (install), `src/layouts/Layout.astro` (mount)

**Intent**: Make `toast.error(...)` available anywhere in the app, including React islands on the dashboard.

**Contract**: Run `npx shadcn@latest add sonner` (installs the `sonner` package and adds `src/components/atoms/sonner.tsx` with the `<Toaster>` component). In `src/layouts/Layout.astro`, import and render `<Toaster client:load />` inside `<body>` (after the page `<slot />`). The `client:load` directive ensures the portal mounts immediately so toasts are available on first interaction.

#### 2. ArchiveButton island

**File**: `src/components/atoms/ArchiveButton.tsx`

**Intent**: A self-contained React island that handles the full delete interaction: trigger button → confirmation dialog → archive API call → optimistic DOM removal or error toast.

**Contract**: Props `{ handoutId: string; handoutTitle: string }`. State: `confirmOpen: boolean`, `isLoading: boolean`. Ref: `containerRef: useRef<HTMLSpanElement>` on the root `<span>` wrapper (needed for DOM removal). Wrap all returned JSX in a `<span ref={containerRef}>`.

Trigger button: small, muted destructive styling (`border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20`), label "Delete", `size="sm" variant="outline"`, `onClick={() => setConfirmOpen(true)}`.

Confirmation dialog: `Dialog open={confirmOpen} onOpenChange={setConfirmOpen}`, dark theme `border-white/10 bg-gray-900 text-white sm:max-w-md`, no `showCloseButton`. `DialogTitle`: "Delete handout?". `DialogDescription`: `"${handoutTitle}" will be archived. Players with the share link can still view it.` `DialogFooter`: Cancel (`variant="outline"`, disabled while loading) + Confirm (`variant="destructive"`, disabled while loading, label: "Deleting…" while loading / "Delete" otherwise).

On confirm: `setIsLoading(true)`, `fetch(\`/api/handouts/${handoutId}/archive\`, { method: 'POST' })`. On non-ok response or thrown error: `setIsLoading(false)`, `setConfirmOpen(false)`, `toast.error('Failed to delete handout — please try again')`. On success: `setConfirmOpen(false)`, `containerRef.current?.closest('article')?.remove()`. Default-export the component. Export at end of file.

#### 3. Mount ArchiveButton on HandoutCard

**File**: `src/components/molecules/HandoutCard.astro`

**Intent**: Add the delete action to every active card (draft and published), keeping it out of the Archived section. Restructure the card footer so ArchiveButton (left) and CopyLinkButton (right) coexist cleanly on published cards.

**Contract**: Import `ArchiveButton`. Replace the existing conditional `CopyLinkButton` footer block with a unified footer `<div>` that renders whenever either button is needed:

```
{(handout.share_token != null || handout.status !== 'archived') && (
  <div class="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
    {handout.status !== 'archived' && <ArchiveButton ... client:idle />}
    {handout.share_token && <CopyLinkButton ... client:idle />}
  </div>
)}
```

Draft cards: ArchiveButton only (left-aligned via flex). Published active cards: ArchiveButton left + CopyLinkButton right. Archived cards: CopyLinkButton only (no ArchiveButton). No other card markup changes.

### Success Criteria

#### Automated Verification

- `npm run lint` passes on all new/changed files
- `npm run build` succeeds with no type errors
- `npx prettier --check .` passes

#### Manual Verification

- Draft card shows a red-tinted "Delete" button; published active card shows "Delete" (left) and "Copy link" (right); archived card shows only "Copy link"
- Clicking Delete opens the confirmation dialog naming the handout; Cancel closes it without any change
- Clicking Confirm: card disappears immediately; row in Supabase has `status = 'archived'` and non-null `archived_at`; refreshing the dashboard shows the card in the Archived section
- With devtools: simulate a 500 from the archive API → toast error appears, card stays visible
- A published handout's `/share/[token]` page remains accessible after archiving

**Implementation Note**: After automated verification passes, pause here for manual confirmation before Phase 3.

---

## Phase 3: Tests

### Overview

Add automated coverage for the two units that carry logic: the `ArchiveButton` island (dialog lifecycle, API interaction, DOM removal, error toast) and the archive API route (auth, ownership, status transitions, idempotency).

### Changes Required

#### 1. ArchiveButton unit tests

**File**: `src/components/atoms/__tests__/ArchiveButton.test.tsx`

**Intent**: Lock in the dialog lifecycle, the correct API call, optimistic DOM removal on success, and the error toast on failure.

**Contract**: Must begin with `// @vitest-environment jsdom` (per lessons — `unit` project defaults to `node`). Stub `window.location` with `origin` set (per `HandoutEditor.test.tsx:16-22` pattern). Mock `global.fetch`. Mock `sonner` to capture `toast.error` calls (`vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))`).

Test cases:
- Renders "Delete" button; no dialog visible initially.
- Clicking "Delete" opens confirmation dialog with the handout title and a "Delete" confirm button.
- Clicking "Cancel" closes the dialog; `fetch` not called.
- Clicking "Confirm" calls `fetch('/api/handouts/<id>/archive', { method: 'POST' })`, then removes the closest `article` element from the DOM on a 200 response.
- On a non-ok fetch response: `toast.error` is called with the failure message; card article remains in the DOM.

Wrap the component in an `<article>` in each test so `closest('article')` has a target. Use the `@/` alias for imports. Rely on the React plugin already in `vitest.config.ts` (per lessons).

#### 2. Archive route integration tests

**File**: `src/integration/handouts/archive-handout.integration.test.ts`

**Intent**: Verify auth enforcement, application-layer ownership assertion, correct status transition for both draft and published handouts, and idempotency (already-archived → 404).

**Contract**: Follows `handout-ownership.integration.test.ts` exactly: `vi.mock('@/lib/supabase')`, import `POST as archiveHandout` from the route, `createAdminClient`, `createTestUser`/`signInAsUser`, `makeContext({ params: { id } })`, `deleteAllTestHandouts` in `afterEach`/`afterAll`.

Test cases:
- Unauthenticated → 401 `{ error: 'Unauthorized' }`.
- Own draft → 200 `{ id }`, row has `status = 'archived'`, `archived_at` is a valid ISO timestamp, `share_token` stays `null`.
- Own published → 200 `{ id }`, row has `status = 'archived'`, `archived_at` set, `share_token` preserved (not nulled).
- Cross-owner attempt → 404 `{ error: 'Handout not found or already archived' }`, row unchanged.
- Already archived → 404 `{ error: 'Handout not found or already archived' }`.

### Success Criteria

#### Automated Verification

- `npm test -- --project unit` passes including `ArchiveButton.test.tsx`
- `npm test -- --project integration` passes including `archive-handout.integration.test.ts`
- `npm run lint` passes
- `npm run build` succeeds
- `npx prettier --check .` passes

#### Manual Verification

- Full flow re-checked end-to-end: create a draft → Delete it → Archived section gains the card; create a published handout → Delete it → Archived section gains the card, share link still works
- No regressions: CopyLinkButton still works on published active cards and archived cards; existing "Create your first handout" empty state still appears when active list is empty

**Implementation Note**: After all phases pass manual verification, the S-04 slice is complete and ready for `/10x-archive`.

---

## Testing Strategy

### Unit Tests

- `src/components/atoms/__tests__/ArchiveButton.test.tsx` — dialog lifecycle, API call shape, optimistic DOM removal, error toast.

### Integration Tests

- `src/integration/handouts/archive-handout.integration.test.ts` — auth gate, ownership, draft/published happy paths, idempotency.

### Manual Testing Steps

1. Sign in → create a draft → click Delete → Cancel → card still visible.
2. Click Delete again → Confirm → card disappears; check Supabase: `status = 'archived'`, `archived_at` non-null.
3. Refresh dashboard → Archived section now shows the card with an "Archived" badge and Copy link button.
4. Create and publish a handout → visit its `/share/[token]` page → confirm it loads.
5. Delete (archive) the published handout from the dashboard → `/share/[token]` page still loads.
6. Refresh dashboard → Archived section shows the published handout; its share link is clickable and working.
7. Simulate API failure (devtools → block the archive request) → toast error appears, card stays.

## Performance Considerations

Archive is a single indexed UPDATE (`handouts_gm_id_idx`). The `ArchiveButton` hydrates with `client:idle` (same as `CopyLinkButton`). No measurable performance impact.

## Migration Notes

None. The `archived_at` column, `archived` enum value, and all required RLS policies are already present from F-01.

## References

- Roadmap slice S-04: `context/foundation/roadmap.md`
- PRD FR-008 + Business Logic state machine: `context/foundation/prd.md`
- API route pattern: `src/pages/api/handouts/[id]/publish.ts`
- Confirmation dialog pattern: `src/components/organisms/HandoutEditor.tsx:269-292`
- Island test pattern: `src/components/organisms/__tests__/HandoutEditor.test.tsx`
- Integration test pattern: `src/integration/handouts/handout-ownership.integration.test.ts`
- RLS policies: `supabase/migrations/20260528200000_create_handouts_table.sql`
- Atomic design + lessons: `src/AGENTS.md`, `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Archive API Route

#### Automated

- [ ] 1.1 `npm run lint` passes on the new file
- [ ] 1.2 `npm run build` succeeds with no type errors
- [ ] 1.3 `npx prettier --check .` passes (no formatting drift)

#### Manual

- [ ] 1.4 Valid draft → 200, row has `status = 'archived'` and non-null `archived_at`
- [ ] 1.5 Calling archive again on archived row → 404
- [ ] 1.6 Calling archive with another user's session → 404

### Phase 2: ArchiveButton Island + Toast + Card Integration

#### Automated

- [ ] 2.1 `npm run lint` passes on all new/changed files
- [ ] 2.2 `npm run build` succeeds with no type errors
- [ ] 2.3 `npx prettier --check .` passes

#### Manual

- [ ] 2.4 Draft card has Delete button; published active card has Delete + Copy link; archived card has Copy link only
- [ ] 2.5 Cancel closes dialog without any change
- [ ] 2.6 Confirm archives the row and removes the card from the DOM immediately
- [ ] 2.7 Published handout's `/share/[token]` page still loads after archiving
- [ ] 2.8 Simulated API failure → toast error, card stays visible

### Phase 3: Tests

#### Automated

- [ ] 3.1 `npm test -- --project unit` passes including `ArchiveButton.test.tsx`
- [ ] 3.2 `npm test -- --project integration` passes including `archive-handout.integration.test.ts`
- [ ] 3.3 `npm run lint` passes
- [ ] 3.4 `npm run build` succeeds
- [ ] 3.5 `npx prettier --check .` passes

#### Manual

- [ ] 3.6 Full flow re-checked: draft delete → archived; published delete → archived, share link still works
- [ ] 3.7 No regressions: CopyLinkButton works; empty-state CTA works
