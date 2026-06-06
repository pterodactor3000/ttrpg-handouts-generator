# Landing Page (S-08) — Plan Brief

> Full plan: `context/changes/landing-page/plan.md`

## What & Why

Replace the starter boilerplate landing page with a real, product-branded landing page for **Handouts Generatorium**. A logged-out visitor needs to see what the app is and how to get in; today they see generic starter-template copy ("10x Astro Starter"). This delivers FR-015 — app name + a clear entry point to the login flow on a no-auth page.

## Starting Point

`/` renders the `Welcome.astro` organism: starter hero ("10x Astro Starter"), generic blurb, Sign in + Sign up CTAs, and three starter "feature cards" describing the template (not the product). `Layout.astro`'s default `<title>` is also "10x Astro Starter". Middleware does not currently redirect signed-in users away from `/`.

## Desired End State

Logged-out visitors at `/` see "Handouts Generatorium", a one-line product tagline, and Sign in (primary) + Sign up (secondary) CTAs — no feature cards. The browser tab reads the product name. Signed-in GMs hitting `/` are redirected to `/dashboard`.

## Key Decisions Made

| Decision                 | Choice                                  | Why (1 sentence)                                                           | Source |
| ------------------------ | --------------------------------------- | -------------------------------------------------------------------------- | ------ |
| App/brand name           | "Handouts Generatorium"                 | No name existed; user chose it during planning.                            | Plan   |
| Signed-in visitor at `/` | Redirect to `/dashboard`                | Matches roadmap risk note; marketing page is for logged-out users only.    | Plan   |
| CTAs                     | Sign in (primary) + Sign up (secondary) | Keeps the existing two-path entry into auth.                               | Plan   |
| Starter feature cards    | Removed (not replaced)                  | They describe the template, not the product; keeps the page focused.       | Plan   |
| Tests                    | None (lint + build + manual)            | Pure presentational + middleware config; matches `src/AGENTS.md` guidance. | Plan   |

## Scope

**In scope:**

- Rewrite `Welcome.astro` into a branded product hero (name + tagline + 2 CTAs, cards removed).
- Update the app title in `Layout.astro` and the landing route.
- Add a middleware redirect for authenticated visitors at `/`.

**Out of scope:**

- Auth form/flow changes (CTAs link to existing `/auth/*`).
- Global restyle of other screens (that's S-05 `ui-restyle`).
- New routes, APIs, data model, logo/favicon assets.

## Architecture / Approach

Two small changes. Presentational rewrite of one organism + a title fix (`Welcome.astro`, `Layout.astro`, `index.astro`); a single exact-path (`pathname === '/'`) redirect rule in `src/middleware.ts`. The cosmic background wrapper and `Topbar` are preserved.

## Phases at a Glance

| Phase                              | What it delivers                                    | Key risk                                      |
| ---------------------------------- | --------------------------------------------------- | --------------------------------------------- |
| 1. Landing page content & branding | Branded hero + correct title, feature cards removed | Breaking the shared background/Topbar wrapper |
| 2. Authenticated-visitor redirect  | Signed-in users at `/` → `/dashboard`               | Over-broad path match or redirect loop        |

**Prerequisites:** None — standalone slice; CTAs use the already-shipped `/auth/signin` and `/auth/signup`.
**Estimated effort:** ~1 short session across 2 phases.

## Open Risks & Assumptions

- Redirect must use exact-path equality (`=== '/'`), not `startsWith`, to avoid catching other routes.
- Assumes "Handouts Generatorium" is the final display name; trivial to change later if not.

## Success Criteria (Summary)

- Logged-out `/` shows the app name + tagline + working Sign in / Sign up CTAs, no starter cards.
- Browser tab shows "Handouts Generatorium".
- Signed-in `/` redirects to `/dashboard`; logged-out `/` does not loop, and protected routes still gate correctly.
