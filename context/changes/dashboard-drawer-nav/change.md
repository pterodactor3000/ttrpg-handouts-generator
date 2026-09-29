---
change_id: dashboard-drawer-nav
title: Filter dashboard handouts from a left drawer
status: implemented
created: 2026-09-29
updated: 2026-09-29
archived_at: null
roadmap_id: S-12
---

## Notes

Roadmap S-12. Locked in rites-of-true-aim on 2026-09-29.

- Complexity: Medium.
- First load shows Drafts only.
- Pin is session memory. Refresh clears it and returns to Drafts.
- A pinned drawer is a sidebar only at viewport width 768px and up. Narrower viewports stay an overlay.
- Archived cards stay read-only. Unarchive is S-14.
- The filter runs on handouts already loaded for `/dashboard`. No schema or API change.
- An unpinned drawer closes after a filter choice.
