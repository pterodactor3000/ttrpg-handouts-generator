# Landing page examples plan brief

> Full plan: `context/changes/landing-examples/plan.md`
> Roadmap item: `context/foundation/roadmap.md` S-20
> Linear: TEC-42

## What and Why

S-20 shows three static example handouts on the landing page, one per style, with light motion. An unsigned visitor can still start sign-in without logging in. TEC-42 also requires the examples to stay still when the browser asks for reduced motion.

## Starting Point

`Welcome.astro` is a hero with the app name, a tagline, Sign In, and Sign Up. It has no samples. The share page already paints `BACKGROUND_CONFIGS` behind `HandoutArticle`. Middleware sends signed-in users from `/` to `/dashboard`.

## Desired End State

Logged-out `/` still starts with the hero and CTAs. Under them sit three static previews that look like real handouts. They float a little unless reduced motion is on. They are not links and they do not load handout rows.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Data | Module constants, no Supabase | Roadmap says samples stay static | Roadmap S-20 |
| Look | Share-page stack, `HandoutArticle` plus `cssBackground` | Reuse the live handout look | Share page, fonts CSS |
| Placement | Sibling section after the hero `max-w-4xl`, `max-w-6xl` | Three framed cards need more than 56rem | Plan review F2 |
| Article width | `max-w-2xl` only when `HandoutArticle` has no `class` | `class:list` cannot cancel a hard-coded width | Plan review F1 |
| Motion | CSS float on an outer wrapper, off when reduced | Drawer already uses `motion-reduce` | TEC-42, `DashboardDrawer` |
| Labels | Keep Grimdark, Eldritch, High Fantasy | S-21 owns the Sci-fi rename | Roadmap S-21 |

## Scope

**In scope:**

- Sample helper, Astro card, Welcome mount, unit tests for the helper and source contracts.

**Out of scope:**

- PRD FR edit, database reads, share links, CTA copy changes, middleware, S-21 label rename, React island.

## Approach

`getLandingExampleCards()` renders three fixtures. `LandingExample.astro` paints each card. `Welcome.astro` mounts them after Sign In and Sign Up.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Static examples on the landing page | Three styled previews with reduced-motion still state | Motion or a transform on `.handout-article` clipping sci-fi scanlines |

**Prerequisites:** S-08 is already on main.
**Estimated effort:** One phase.

## Open Risks and Assumptions

- Unsigned `/` is the only surface. Signed-in users never see the examples.
- A shared max height plus `overflow-hidden` clips long sample markdown. Keep the copy short.

## Success Criteria

- Logged-out `/` shows the app name, both CTAs, and three category examples.
- Reduced motion keeps the cards still.
- Sign In still starts the existing login flow.
