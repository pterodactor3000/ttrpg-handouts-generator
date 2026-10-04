---
change_id: landing-examples
title: Example handouts on the landing page
status: archived
created: 2026-10-04
updated: 2026-10-04
archived_at: 2026-10-04T11:47:21Z
roadmap_id: S-20
---

## Notes

Roadmap S-20. Linear TEC-42. Branch `feature/S-20-landing-examples`. Locked in planning on 2026-10-04.

- Complexity: Low.
- Three static samples, one each for fantasy, horror, and scifi. No handout table read.
- Examples sit under the existing hero and CTAs so Sign In stays first.
- The page is a scrollable set of described sections, one per style, with a large sample. It is not a three-column card grid.
- Motion is a scroll-driven enter keyframe plus a light CSS float. `prefers-reduced-motion: reduce` turns both off.
- Cards reuse `HandoutArticle.astro`, `renderHandoutHtml`, and `BACKGROUND_CONFIGS`. They are not links.
- Visible category labels stay High Fantasy, Eldritch, and Grimdark. S-21 owns the Sci-fi rename.
