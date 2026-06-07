---
change_id: delete-handout
title: Delete (soft-archive) handout
status: planned
created: 2026-06-07
updated: 2026-06-07
---

## Notes

Roadmap slice S-04 from `context/foundation/roadmap.md` (PRD ref FR-008). Depends on S-02 (`handout-dashboard`). Parallel with S-03 (`edit-handout`). Stream B (Handout management).

Key scope decisions (from planning):

- Soft-delete only: handout moves to `archived` status; the shared link stays live for players (RLS `anon_select_shared` already covers `archived` rows — no migration needed).
- Both **draft** and **published** handouts can be archived from the Active section.
- Post-archive UI: optimistic card removal — the `ArchiveButton` island removes the closest `<article>` from the DOM on success; no page reload.
- Confirmation dialog uses the existing `Dialog` atom (same dark-theme pattern as `HandoutEditor`'s back-navigation confirm).
- Error UX: `toast.error(...)` via Sonner for API failures.
- No schema, RLS, or migration changes — F-01 already provides everything this slice needs.
