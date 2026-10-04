---
change_id: theme-switch
title: Switch between Tower of Light and Darkest of Mines
status: archived
created: 2026-10-02
updated: 2026-10-04
archived_at: 2026-10-04T11:47:21Z
roadmap_id: S-15
---

## Notes

Roadmap S-15. Locked in planning on 2026-10-02.

- Complexity: Medium.
- Tower of Light is the current Moon light chrome. Darkest of Mines is the current warm-dark `:root` palette.
- The browser stores the choice in `localStorage` until the GM changes it. A new tab and a later visit keep it.
- Every view uses the stored choice. With no choice, pages follow the system theme.
- The control is one toggle on Settings. The label is the active theme.
- Darkest of Mines is darker than `#333333` and keeps the same corner radius as Tower of Light.
- Handout category art stays as it is.
