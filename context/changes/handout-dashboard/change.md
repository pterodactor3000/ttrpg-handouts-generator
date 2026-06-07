---
change_id: handout-dashboard
title: Handout dashboard list view
status: impl_reviewed
created: 2026-06-07
updated: 2026-06-07
---

## Notes

Roadmap slice S-02 from @context/foundation/roadmap.md (PRD ref FR-002, plus Business Logic state machine). Depends on S-01 (`first-handout-creation-and-sharing`, done). Stream B (Handout management) — unlocks S-03 (edit) and S-04 (delete) by providing the navigation surface into existing handouts.

Key scope decisions (from planning):

- List is server-rendered directly in `dashboard.astro` (read-only data → pure SSR, no React island for the list itself).
- Two sections: **Active** (draft + published) and **Archived**. Archived rows can't exist yet (S-04 unbuilt) but the section + empty state are built now per user direction.
- "Open" rule: any handout with a `share_token` (published or archived) links to `/share/[token]`; drafts are non-clickable (edit lands in S-03).
- Each card: theme gradient swatch (`BACKGROUND_CONFIGS`), title, status badge, tag chips, and a "Copy link" button on shareable cards (the one interactive piece → small React island).
- Empty Active list shows a "Create your first handout" CTA.
