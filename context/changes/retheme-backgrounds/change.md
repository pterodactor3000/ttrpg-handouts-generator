---
change_id: retheme-backgrounds
title: Retheme backgrounds
status: impl_reviewed
created: 2026-06-17
updated: 2026-06-18
archived_at: null
---

## Notes

- **scifi-border.png size deviation (2026-06-18)**: Asset is 256×256, below the plan's 400×400px minimum. Manual QA passed at tested viewport sizes; accepted as-is until a larger CRT bezel asset is sourced.
- **Papyrus.otf follow-up**: Font committed in p4 (a876574) but not yet wired. Wire via `fonts.ts` + `@font-face` in a follow-up change when fantasy typography is updated.
