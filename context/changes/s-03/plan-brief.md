# Edit Handout — Plan Brief

> Full plan: `context/changes/s-03/plan.md`

## What & Why

GMs need to reopen saved handouts, change content or metadata, and save — with edits on published handouts propagating immediately to the live player link. This is S-03 (`edit-handout`) in the roadmap: the natural next step after S-02 gave GMs a dashboard to see their handouts but no way to modify them.

## Starting Point

`HandoutEditor` already handles in-session create+update (POST then PUT), but accepts no props and always starts empty. `PUT /api/handouts/[id]` blocks updates with `.eq('status', 'draft')` — RLS already permits GM updates on published rows but the app layer refuses them. No `/handouts/[id]/edit` route or dashboard Edit link exists.

## Desired End State

GMs can click "Edit" on any non-archived dashboard card, arrive at `/handouts/[id]/edit` with all fields pre-populated, make changes, and save. Saving a published handout is silent and immediate — the existing player share link reflects the new content with no token rotation or republish step required. Archived handouts have no Edit link and redirect to `/dashboard` on direct URL access.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Edit URL pattern | `/handouts/[id]/edit` | Leaves `/handouts/[id]` open for a future detail view and matches REST convention. |
| Data loading | SSR in Astro frontmatter | Consistent with dashboard (no extra API surface, no extra round-trip). |
| Published-handout save UX | Silent save, no dialog | Roadmap specifies "propagate immediately" — a warning dialog adds friction with no benefit. |
| Share button on published handout | Open existing token dialog | Token is permanent (NFR link-permanence); no re-publish, no token rotation. |
| Archived access | Redirect to `/dashboard` | Clean server-side redirect; archived = read-only is the established invariant. |
| Edit link scope | Non-archived only (draft + published) | Matches RLS model — archived rows block UPDATE at the DB layer too. |
| Testing | Unit + integration | The relaxed PUT filter is security-adjacent; needs an explicit regression net. |

## Scope

**In scope:**
- Relax `PUT /api/handouts/[id]` filter from draft-only to non-archived
- `HandoutEditor` optional `initialHandout` prop (pre-populate + adjust button behavior)
- New SSR page `/handouts/[id]/edit`
- Edit link on `HandoutCard` for non-archived handouts
- Unit tests (component) + integration tests (API)

**Out of scope:**
- `GET /api/handouts/[id]` — SSR suffices
- Toast on published-handout save
- Token rotation or re-publish
- Edit access for archived handouts
- Version history, undo, conflict detection

## Architecture / Approach

SSR Astro page queries Supabase directly (same pattern as dashboard) and passes a typed `InitialHandout` DTO to `HandoutEditor` as a prop. The component uses `useState` initial values from the prop, so the edit and create paths share identical code paths after mount. The API change is a single filter swap; no migration needed.

```
/handouts/[id]/edit.astro  →  SSR load (Supabase, ownership check)
                           →  <HandoutEditor initialHandout={...} client:load />
                           →  PUT /api/handouts/[id]  (filter: neq 'archived')
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Relax PUT filter | Published handouts can be saved via API | Must not break archived-row guard |
| 2. HandoutEditor props | Editor accepts and applies initial data | `savedSnapshot` init must match prop values or form appears dirty |
| 3. Edit page + nav | Full end-to-end edit route + dashboard links | Archived redirect must fire before rendering |
| 4. Tests | Regression net for relaxed PUT + prop variants | Integration env must be running (local Supabase) |

**Prerequisites:** S-02 done (dashboard in place, `HandoutListItem` has `id` + `status`). Local Supabase running for integration tests.
**Estimated effort:** ~1-2 sessions across 4 phases.

## Open Risks & Assumptions

- The edit page redirects to `/dashboard` for any "not found" result — wrong owner, bad UUID, archived status all collapse to the same redirect. This is intentional (no information leakage) but means GMs get no explanation when an archived handout redirects them.
- Existing integration test `handout-validation.integration.test.ts` has a test asserting `PUT` on a published handout returns 500 (lines 263–289). That test will **fail** after Phase 1 and must be updated to expect 200 in Phase 4.

## Success Criteria (Summary)

- GM can edit and save a published handout; the share link reflects the change immediately.
- Archived handouts have no Edit link and redirect on direct URL access.
- `PUT` on published handout returns `200`; `PUT` on archived returns non-2xx.
