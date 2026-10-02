---
change_id: theme-switch
title: Switch between Tower of Light and Darkest of Mines
status: implementing
created: 2026-10-02
updated: 2026-10-02
archived_at: null
roadmap_id: S-15
---

## Notes

Roadmap S-15. Locked in planning on 2026-10-02.

- Complexity: Medium.
- Tower of Light is the current Moon light chrome. Darkest of Mines is the current warm-dark `:root` palette.
- The browser stores the choice in `localStorage` until the GM changes it. A new tab and a later visit keep it.
- Landing, sign-in, sign-up, and confirm-email follow the system theme and ignore the stored choice.
- The control sits in the existing header of the dashboard, the new-handout page, the edit page, and Settings. It names both themes and shows which one is active.
- The shared handout, handout category art, and the account-closed page stay as they are.
