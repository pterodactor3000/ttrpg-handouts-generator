---
change_id: dashboard-drawer-nav
title: Filter dashboard handouts from a left drawer
status: impl_reviewed
created: 2026-09-29
updated: 2026-09-30
archived_at: null
roadmap_id: S-12
---

## Notes

Roadmap S-12. Locked in rites-of-true-aim on 2026-09-29.

- Complexity: Medium.
- First load shows Drafts only.
- At viewport width 768px and up, the drawer stays open as a sidebar. There is no pin control.
- Narrower viewports use an icon to open an overlay. Choosing a status closes that overlay.
- Archived cards stay read-only. Unarchive is S-14.
- The filter runs on handouts already loaded for `/dashboard`. No schema or API change.
