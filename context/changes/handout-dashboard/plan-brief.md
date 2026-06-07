# Handout Dashboard List View — Plan Brief

> Full plan: `context/changes/handout-dashboard/plan.md`

## What & Why

Replace the dashboard stub with a real list of the GM's handouts (titles + tags), so they can see what they've created and reach it again. This is roadmap S-02 (PRD FR-002) and the navigation surface that S-03 (edit) and S-04 (delete) depend on.

## Starting Point

`src/pages/dashboard.astro` is a placeholder card with only a "New handout" link and sign-out. The data layer is fully ready: the `handouts` table + `gm_select_own` RLS already return all of a GM's rows, and the authenticated SSR-client query pattern is established in `src/pages/share/[token].astro`.

## Desired End State

`/dashboard` server-renders the GM's handouts in two sections — **Active** (draft + published) and **Archived** — as themed cards (gradient swatch, title, status badge, tag chips). Cards with a share token link to `/share/[token]` and offer a "Copy link" button; drafts are non-clickable. New GMs see a "Create your first handout" CTA. The grid is mobile-responsive.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Render approach | Pure SSR in `dashboard.astro` | Read-only data → simplest, fastest, matches "Astro for static content" convention | Plan |
| "Open" target | Token present (published/archived) → `/share/[token]`; drafts non-clickable | No dead links since S-03 edit isn't built yet | Plan |
| Status scope | Two sections: Active (draft+published) + Archived | User wants the PRD's separate archived list now, even though S-04 hasn't created archived rows | Plan |
| Status display | Status badge (Draft/Published/Archived) per card | Distinguishes draft vs published in the mixed Active list | Plan |
| Empty state | "Create your first handout" CTA | Guides first-run GMs into the core flow | Plan |
| Copy share link | "Copy link" button on shareable cards | Fast re-sharing from the dashboard (the one interactive piece → small React island) | Plan |
| Card visual | Theme gradient swatch from `BACKGROUND_CONFIGS` | Reuses single source of truth; quick visual identity | Plan |

## Scope

**In scope:** SSR handout list on the dashboard; Active + Archived sections; themed cards with badge + tags; share-link navigation + copy button; empty-state CTA; responsive grid; unit tests for the partition helper and copy island.

**Out of scope:** Edit route/editor reuse (S-03); delete/archive action (S-04); GET API endpoint; search/filter/pagination; full visual restyle (S-05); per-style fonts (S-07); any schema/RLS/migration change.

## Architecture / Approach

`dashboard.astro` fetches all the GM's rows once (newest first), partitions them via a pure `lib/handout-list.ts` helper, and renders two `HandoutList` organisms. Atomic-design components: `atoms/StatusBadge.astro`, `atoms/CopyLinkButton.tsx` (the only React island, `client:idle`), `molecules/HandoutCard.astro`, `organisms/HandoutList.astro`. Navigation (linked title) and the copy button are separate elements to avoid a button-inside-anchor.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Data layer + Active list | SSR fetch, partition helper, card/list components, Active section + empty CTA | Card legibility over the gradient swatch |
| 2. Archived + copy island | Archived section (reused list) + `CopyLinkButton` on shareable cards | Nested-anchor/button HTML; archived rows can't exist yet (S-04) |
| 3. Responsive + tests | Mobile grid, unit tests for helper + copy button | Keeping `.test.tsx` working (React plugin already configured) |

**Prerequisites:** S-01 done (it is). No new env, schema, or deps.
**Estimated effort:** ~1–2 focused sessions across 3 phases.

## Open Risks & Assumptions

- Archived section is built but rendered only when archived rows exist — none can until S-04, so it stays hidden in normal use and is verified via a manually-seeded row.
- Adding a per-card copy button forces one small React island into an otherwise pure-SSR page (accepted for the re-share convenience).

## Success Criteria (Summary)

- A GM sees their draft + published handouts (titles, tags, status) on the dashboard and can open published ones via their share link.
- A new GM is guided into creating their first handout via the empty-state CTA.
- The dashboard reads cleanly on mobile and desktop, with the share-link copy action working.
