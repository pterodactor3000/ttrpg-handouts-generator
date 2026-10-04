# Page version footer plan brief

> Full plan: `context/changes/page-version-footer/plan.md`
> Roadmap item: `context/foundation/roadmap.md` (S-22)

## What and Why

S-22 puts a version footer on every Layout page, including the shared handout. The footer prints `v` plus `package.json` `version`, which is `v1.2.0` today. The share page keeps its home link.

## Starting Point

Layout renders the page slot and then the toaster. No page reads `package.json`. The share page already has a separate home-link footer.

## Desired End State

Visitors see `v1.2.0` at the bottom of Layout pages. The share-page home link stays. The version line does not cover the handout or a toast.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Mount point | `Layout.astro` after the slot, before the toaster | Roadmap says the footer sits in Layout so every wrapped page gets it | Roadmap S-22 |
| Version source | Import `package.json`, format as `v${version}` | Vite inlines JSON. The Worker does not read the filesystem | Roadmap S-22, Astro JSON imports |
| Positioning | Document flow, not `fixed` or `sticky` | A viewport footer can cover the handout or a bottom toast | Roadmap risk |
| Share home link | Leave `src/pages/share/[token].astro` footer unchanged | Roadmap keeps that link | Roadmap S-22 |

## Scope

**In scope:**

- Version helper, footer atom, Layout mount, unit tests for format and source sync.

**Out of scope:**

- PRD FR edit, version bump, share-link restyle, sticky footer, page shell height changes, API routes.

## Approach

Format the package version in `src/lib/app-version.ts`. Render it from a presentational Astro atom mounted in Layout.

## Phases at a Glance

| Phase | Deliverable | Key risk |
| --- | --- | --- |
| 1. Version footer in Layout | Layout shows `v1.2.0` in document flow | A fixed footer covering the handout or toaster |

## Risks and Assumptions

- Pages use `min-h-screen`, so the footer sits just below the first viewport. That still counts as a footer on the page.
- Importing `package.json` is safe on Cloudflare because Vite inlines it.

## Success Criteria

- Every Layout page shows `v1.2.0`.
- The shared handout still has its home link.
- The version line does not cover the handout or a toast.
