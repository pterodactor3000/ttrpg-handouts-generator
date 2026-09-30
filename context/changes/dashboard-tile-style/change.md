---
change_id: dashboard-tile-style
title: Uniform dashboard tiles with a themed strip
status: planned
created: 2026-09-30
updated: 2026-09-30
archived_at: null
roadmap_id: S-11
---

## Notes

Roadmap S-11. Locked in planning on 2026-09-30.

- Complexity: Low.
- The top strip crops the top edge of the existing border PNG for that category.
- Every card has one fixed height. The footer stays on the bottom edge. Title and tags clamp.
- The title is one line, then an ellipsis.
- Tags stay on one row. When they overflow, a +N control opens a dialog that lists every tag.
- Tests cover a pure strip-URL helper and a pure chip-fit helper. The card layout is checked by hand.
- The category label under the title stays.
