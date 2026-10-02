---
change_id: drawer-type-filters
title: Filter the dashboard drawer by handout type
status: impl_reviewed
created: 2026-10-02
updated: 2026-10-02
archived_at: null
---

## Notes

Roadmap S-18. Linear TEC-39. Branch `feature/S-18-drawer-type-filters`.

A GM filters the dashboard from the left drawer by one handout type at a time. The stored values are `fantasy`, `horror`, and `scifi`, labeled High Fantasy, Eldritch, and Grimdark. The product word postapo is the `horror` row. All clears the type filter. The choice combines with Drafts, Published, or Archived.

The type selection is `data-type-filter` on `[data-dashboard]`, so S-17 can read it. This slice does not build search.

The uncommitted S-17 and S-18 edits in `context/foundation/roadmap.md` stay. Do not edit `context/foundation/prd.md`.
