# Dashboard panel chevrons Plan Brief

> Full plan: `context/changes/dashboard-panel-chevrons/plan.md`

## What and why

List headings on the dashboard already collapse during All, but they look like plain titles. TEC-45 adds a right-side chevron that points up when open and down when closed, and animates with the body.

## Starting Point

`HandoutList.astro` headings are full-width buttons with only text. `toggleDashboardListCollapse` uses `hidden` on the body, which cannot animate.

## Desired End State

Each Drafts, Published, and Archived heading has a chevron on the right. Toggle rotates the chevron and animates the body. Reduced motion skips the animation. All-only collapse rules stay the same.

## Key Decisions Made

| Decision | Choice | Why |
| -------- | ------ | --- |
| Icon host | Inline Lucide-style SVG in Astro | Avoids a React island for a static icon |
| Closed glyph | One ChevronDown, rotate 180deg when open | One node, CSS can animate the turn |
| Hide method | `inert` plus grid 0fr/1fr | `hidden` is display none and cannot animate |
| Collapse rules | Keep TEC-41 All-only rules | Out of scope to change when collapse works |

## Scope

**In scope:** Dashboard list headings, collapse attributes, unit tests.

**Out of scope:** Roadmap slice, persistence, drawer filters, search matching, shadcn Collapsible.

## Architecture / Approach

The click listener in `DashboardDrawer` stays. A shared helper writes `data-list-collapsed`, `aria-expanded`, and `inert`. CSS owns height and chevron rotation.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Chevrons and animated collapse | Visible chevrons, animated body, updated tests | Inner wrapper must keep empty-state siblings |

**Prerequisites:** TEC-41 collapse path on main.
**Estimated effort:** One session.

## Open Risks and Assumptions

- `inert` in jsdom is an attribute check, not a full interaction lock.
- Browser verification needs a signed-in `/dashboard`.

## Success Criteria (Summary)

- All three headings show a right-side chevron that matches open or closed.
- Toggle animates the chevron and the body, or snaps when reduced motion is on.
- Collapse still works only during All with search off.
