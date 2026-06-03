# Landing Page (S-08) Implementation Plan

## Overview

Replace the starter boilerplate landing page with a real, product-branded landing page for **Handouts Generatorium**. An unauthenticated visitor sees the app name, a short product-oriented tagline, and clear calls-to-action into the login flow (Sign in + Sign up). An already-signed-in GM who hits `/` is redirected straight to `/dashboard` rather than seeing the marketing page. This delivers FR-015 (app name + clear entry point to the login flow on a no-auth-required page) and supports FR-001.

## Current State Analysis

- `src/pages/index.astro` is a thin route that renders the `Welcome.astro` organism inside `Layout.astro`.
- `src/components/organisms/Welcome.astro` is unchanged starter boilerplate: hero heading "10x Astro Starter", a generic starter blurb, **two** CTAs (`/auth/signin`, `/auth/signup`), and three "feature cards" (Authentication Ready / Modern Stack / Developer Experience) that describe the *starter template*, not the product. It also renders the shared `Topbar.astro` and owns the cosmic background markup (orbs + star field).
- `src/layouts/Layout.astro` sets a default `<title>` of `"10x Astro Starter"` (line 10), so the browser tab still shows the starter name on `/`.
- `src/middleware.ts` resolves `context.locals.user` on every request and redirects unauthenticated users away from `PROTECTED_ROUTES` (`/dashboard`, `/handouts`). It does **not** currently redirect authenticated users away from `/` — that behavior does not exist yet and must be added.
- Visual language to match: cosmic dark theme (`bg-cosmic`, gradient clip-text headings, glassmorphism `border-white/10 bg-white/5 backdrop-blur-xl`), atomic-design layout (`atoms`/`molecules`/`organisms`), `cn()` for class merging.

### Key Discoveries:

- The landing organism owns the cosmic background + `Topbar` (`src/components/organisms/Welcome.astro:5-28`); the rewrite must preserve that wrapper so the page keeps its theme and nav.
- `Topbar.astro` already branches on `user` (`src/components/molecules/Topbar.astro:8-36`) — but with the redirect in place, a signed-in user never reaches `/`, so the landing page is effectively always the "Not signed in" state.
- `Layout.astro` accepts a `title` prop with a default (`src/layouts/Layout.astro:6-10`); the landing route can pass an explicit title and the default should also be updated to the real app name as the app-wide fallback.
- Middleware redirect for an authed visitor at `/` must be an exact-path check (`pathname === '/'`), not a `startsWith`, to avoid catching other routes.

## Desired End State

- Visiting `/` while logged out shows a branded hero: "Handouts Generatorium", a one-line product tagline describing the TTRPG-handout value, and two CTAs — primary "Sign in" → `/auth/signin`, secondary "Sign up" → `/auth/signup`. No starter feature cards.
- The browser tab on `/` reads "Handouts Generatorium" (not "10x Astro Starter"), and the app-wide default title fallback is also updated.
- Visiting `/` while authenticated redirects to `/dashboard`.
- Verify: `npm run lint` and `npm run build` pass; manual check of `/` logged-out (branded page) and logged-in (redirect to dashboard).

## What We're NOT Doing

- No new auth logic, sign-in/sign-up form changes, or session handling — CTAs link to the existing `/auth/*` pages.
- No global restyle of dashboard / editor / shared view (that is S-05 `ui-restyle`).
- No new product marketing content beyond the app name + a single tagline (feature cards are removed, not replaced with product cards).
- No new routes, API endpoints, data model, or migrations.
- No logo/favicon asset work (favicon stays as-is).

## Implementation Approach

Two small, independent changes. Phase 1 is purely presentational: rewrite the existing `Welcome.astro` organism into a focused product hero and correct the title in `Layout.astro` (and pass an explicit title from the route). Phase 2 is a one-rule behavioral change in `src/middleware.ts` to redirect authenticated visitors from `/` to `/dashboard`. Keeping them separate isolates the shared-file (every-request) middleware edit from the presentational rewrite.

## Phase 1: Landing page content & branding

### Overview

Turn the boilerplate `Welcome.astro` into the Handouts Generatorium landing hero and fix the page title. Preserve the cosmic background wrapper and `Topbar`.

### Changes Required:

#### 1. Landing organism

**File**: `src/components/organisms/Welcome.astro`

**Intent**: Replace the starter hero copy with product branding — heading "Handouts Generatorium" and a one-line tagline conveying the value (compose themed TTRPG handouts and share them via a permanent link). Keep the primary "Sign in" (`/auth/signin`) and secondary "Sign up" (`/auth/signup`) CTAs. Remove the three boilerplate feature-card blocks entirely. Preserve the existing cosmic background markup (orbs + star field) and the `Topbar` include.

**Contract**: Astro component, no props. Renders the same outer `bg-cosmic` wrapper + `Topbar`; hero `<h1>` text becomes the app name; exactly two anchor CTAs pointing at `/auth/signin` and `/auth/signup`; the `grid ... feature cards` section (`Welcome.astro:56-124`) is deleted. Class composition stays in the existing Tailwind/theme style. (Optional: the file may be renamed to a product-meaningful organism name such as `LandingPage.astro` with `index.astro`'s import updated — implementer's call; keeping the name is acceptable.)

#### 2. App title

**File**: `src/layouts/Layout.astro`

**Intent**: Update the default `title` fallback from `"10x Astro Starter"` to `"Handouts Generatorium"` so the app-wide default and the landing tab both reflect the product.

**Contract**: The `title` default in the `Astro.props` destructure (`Layout.astro:10`) becomes `"Handouts Generatorium"`.

#### 3. Landing route title (optional reinforcement)

**File**: `src/pages/index.astro`

**Intent**: Pass an explicit `title="Handouts Generatorium"` to `<Layout>` on the landing route so the tab is correct independent of the layout default.

**Contract**: `<Layout title="Handouts Generatorium">` wrapping `<Welcome />` (or the renamed organism).

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Production build succeeds: `npm run build`

#### Manual Verification:

- Visiting `/` logged out shows "Handouts Generatorium" in the hero and the browser tab.
- A product tagline (not the starter blurb) is shown; the three starter feature cards are gone.
- "Sign in" navigates to `/auth/signin`; "Sign up" navigates to `/auth/signup`.
- Layout/background and `Topbar` still render correctly; page is responsive on a narrow (mobile) viewport.

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation that the landing page renders correctly before proceeding to Phase 2.

---

## Phase 2: Authenticated-visitor redirect

### Overview

Redirect a signed-in GM who visits the landing page (`/`) to `/dashboard`, so the marketing page is only shown to logged-out visitors.

### Changes Required:

#### 1. Middleware redirect rule

**File**: `src/middleware.ts`

**Intent**: After `context.locals.user` is resolved (and before/independent of the existing protected-route check), redirect an authenticated user whose request path is exactly `/` to `/dashboard`. Unauthenticated visitors at `/` fall through and see the landing page.

**Contract**: An exact-path guard — `if (context.locals.user && context.url.pathname === '/') return context.redirect('/dashboard');`. Must use exact equality (`=== '/'`), not `startsWith`, so no other route is affected. Order it so it runs after `context.locals.user` is set; it does not interfere with the existing `PROTECTED_ROUTES` block.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Production build succeeds: `npm run build`

#### Manual Verification:

- Visiting `/` while signed in redirects to `/dashboard`.
- Visiting `/` while signed out still shows the landing page (no redirect loop).
- Protected routes (`/dashboard`, `/handouts/*`) still redirect unauthenticated users to `/auth/signin` as before.

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation of the redirect behavior (both signed-in and signed-out) before considering the change complete.

---

## Testing Strategy

### Unit Tests:

- None required. Both changes are presentational / framework-config (Astro component markup + middleware redirect) with no extractable business logic; this matches the `src/AGENTS.md` guidance to omit tests for pure-presentational units. Verification is via lint, build, and manual checks.

### Manual Testing Steps:

1. Logged out, open `/` → see "Handouts Generatorium", tagline, Sign in + Sign up CTAs; no feature cards; tab title correct.
2. Click "Sign in" → lands on `/auth/signin`; back, click "Sign up" → lands on `/auth/signup`.
3. Sign in, then navigate to `/` → redirected to `/dashboard`.
4. Sign out, navigate to `/` → landing page renders (no redirect loop).
5. Confirm `/dashboard` and a `/handouts/*` route still redirect to `/auth/signin` when logged out.
6. Check `/` at a mobile viewport width — layout is responsive.

## Performance Considerations

Negligible — one fewer DOM section than before and a single exact-path conditional in middleware (which already runs `auth.getUser()` on every request).

## Migration Notes

None — no data or schema changes.

## References

- Roadmap slice: `context/foundation/roadmap.md` (S-08 `landing-page`)
- PRD: `context/foundation/prd.md` (FR-015, FR-001)
- Landing organism to rewrite: `src/components/organisms/Welcome.astro`
- Title default: `src/layouts/Layout.astro:10`
- Redirect target: `src/middleware.ts:6-24`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Landing page content & branding

#### Automated

- [x] 1.1 Linting passes: `npm run lint`
- [x] 1.2 Production build succeeds: `npm run build`

#### Manual

- [x] 1.3 `/` logged out shows "Handouts Generatorium" in hero and browser tab
- [x] 1.4 Product tagline shown; three starter feature cards removed
- [x] 1.5 "Sign in" → `/auth/signin`; "Sign up" → `/auth/signup`
- [x] 1.6 Background + Topbar render correctly; responsive on mobile viewport

### Phase 2: Authenticated-visitor redirect

#### Automated

- [ ] 2.1 Linting passes: `npm run lint`
- [ ] 2.2 Production build succeeds: `npm run build`

#### Manual

- [ ] 2.3 `/` while signed in redirects to `/dashboard`
- [ ] 2.4 `/` while signed out still shows landing page (no redirect loop)
- [ ] 2.5 Protected routes still redirect unauthenticated users to `/auth/signin`
