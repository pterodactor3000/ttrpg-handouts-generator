# Delete (Soft-Archive) Handout — Plan Brief

> Full plan: `context/changes/delete-handout/plan.md`

## What & Why

GMs need a way to remove handouts from their active dashboard list. Deleting a handout soft-archives it — the row moves to `archived` status and disappears from the Active section — while keeping the shared link permanently accessible to players (link-permanence NFR). This is roadmap slice S-04, the final piece of Stream B alongside S-03 (edit).

## Starting Point

The dashboard (S-02) is feature-complete: both the Active and Archived sections are built, cards render themed with status badges and copy buttons, and the `partitionHandouts` helper splits rows by status. The Archived section simply has no rows yet because no archive action exists. The schema (`archived_at` column, `archived` enum value) and RLS (`anon_select_shared` covers archived rows, `gm_update_non_archived` permits the transition) are already in place from F-01.

## Desired End State

Every active handout card (draft or published) has a "Delete" button. Clicking it opens a confirmation dialog that names the handout and reassures the GM that the share link stays live. Confirming archives the handout: the card disappears from the Active grid immediately, and the Archived section gains the entry on next load. If the API call fails, a toast error appears and the card remains visible.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Which statuses can be archived | Both draft and published | GMs should be able to clean up any active handout regardless of publication status. |
| Post-archive UI | Optimistic card DOM removal | Avoids a full-page reload; island calls `closest('article')?.remove()` on success. |
| Confirmation dialog | Existing `Dialog` atom (HandoutEditor pattern) | AlertDialog is not installed; the existing Radix `Dialog` already provides the correct dark-theme confirmation pattern. |
| Error UX | Sonner `toast.error(...)` | Sonner is the shadcn-recommended toast library; a single `<Toaster>` mount in Layout covers all pages. |
| Testing | Unit (ArchiveButton) + integration (archive route) | Island carries dialog/DOM logic worth unit-testing; route carries ownership/auth logic worth integration-testing against live RLS. |

## Scope

**In scope:**
- `POST /api/handouts/[id]/archive` — status update route
- `ArchiveButton.tsx` React island — trigger, dialog, API call, DOM removal, error toast
- `HandoutCard.astro` update — mount `ArchiveButton` on non-archived cards
- Sonner install + `<Toaster>` in `Layout.astro`
- Unit test for `ArchiveButton`, integration test for the archive route

**Out of scope:**
- Hard delete (rows stay in DB at `archived` status)
- Bulk delete or select-all
- Undo / restore from archived
- Delete button on already-archived cards
- Schema or RLS changes (F-01 is complete)
- Visual restyle (S-05)

## Architecture / Approach

The archive route mirrors `publish.ts`: auth check → UUID validation → `.eq('gm_id', user.id)` ownership assertion → single UPDATE with `.neq('status', 'archived')` (defence in depth alongside RLS) → PGRST116-aware 404 for any zero-row result. The `ArchiveButton` island wraps itself in a `<span ref={containerRef}>` so it can climb the DOM to remove the `<article>` card on success — keeping `HandoutCard` as a pure Astro component. Sonner's `<Toaster client:load />` mounts once in `Layout.astro` and handles error toasts from any island.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Archive API Route | `POST .../archive` — auth, ownership, status transition | PGRST116 vs. real DB error must be handled separately |
| 2. ArchiveButton + Toast + Card | Full delete UX on every active card | Optimistic DOM removal must not break CopyLinkButton layout on the same card |
| 3. Tests | Unit + integration coverage | jsdom docblock required for `.test.tsx` (per lessons); vitest config already has React plugin |

**Prerequisites:** S-02 (`handout-dashboard`) implemented — provides the card/list components and dashboard data fetch that this plan builds on.
**Estimated effort:** ~1 session across 3 phases.

## Open Risks & Assumptions

- If Sonner's `<Toaster>` conflicts with any existing portal in `Layout.astro`, it may need to be placed more carefully — unlikely given the current simple layout.
- `closest('article')` relies on `HandoutCard.astro` rendering an `<article>` element as its root (confirmed at `HandoutCard.astro:15`). If that element changes, the DOM removal breaks.

## Success Criteria (Summary)

- A GM can delete any active handout (draft or published) from the dashboard with two clicks.
- The shared link for a previously published handout remains accessible to players after archiving.
- The Archived section on the dashboard shows the archived handout on next load.
