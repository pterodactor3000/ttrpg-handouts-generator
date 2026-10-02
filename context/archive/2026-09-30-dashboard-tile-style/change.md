---
change_id: dashboard-tile-style
title: Uniform dashboard tiles with a themed strip
status: archived
created: 2026-09-30
updated: 2026-10-02
archived_at: 2026-10-02T07:38:52Z
roadmap_id: S-11
---

## Notes

Roadmap S-11. Locked in planning on 2026-09-30.

- Complexity: Low.
- The strip shows the border-image slice: 80px for fantasy and horror, 60px for scifi. Horror rows 0-36 are a cream margin, so the strip does not use file row 0.
- Every card has one fixed height. The footer stays on the bottom edge. Title and tags clamp.
- The title is one line, then an ellipsis.
- Tags stay on one row. When they overflow, a +N control opens a dialog that lists every tag.
- Tests cover a pure strip-URL helper and a pure chip-fit helper. The card layout is checked by hand.
- The category label under the title stays.
