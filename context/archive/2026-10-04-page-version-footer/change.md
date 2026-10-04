---
change_id: page-version-footer
title: Page footer with package version
status: impl_reviewed
created: 2026-10-04
updated: 2026-10-04
archived_at: null
roadmap_id: S-22
---

## Notes

Roadmap S-22. Branch `feature/S-22-page-version-footer`. Locked in planning on 2026-10-04.

- Complexity: Low.
- Footer lives in `Layout`, so every HTML page that already wraps in Layout gets it, including the shared handout.
- The visible string is `v` plus `package.json` `version`. That file is currently `1.2.0`, so the page shows `v1.2.0`.
- The footer stays in document flow. It is not `fixed` or `sticky`, so it does not cover the handout or the toaster.
- The shared handout keeps the existing home link in `src/pages/share/[token].astro`.
