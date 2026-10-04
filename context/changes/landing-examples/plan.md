# Landing page examples implementation plan

## Overview

S-20 puts three static example handouts on the landing page, one per style, with light motion. An unsigned visitor still sees the app name and can start sign-in without logging in. This covers FR-015 on the existing landing page. The extra examples FR stays a later PRD edit.

## Current State Analysis

`src/pages/index.astro` wraps `Welcome` in `Layout` and sets `loadChromeFont`. `src/components/organisms/Welcome.astro` is a moon-chrome landing hero. It renders `Topbar`, the heading `Handouts Scriptorium`, a product tagline, Sign In at `/auth/signin`, and Sign Up at `/auth/signup`. There are no example handouts and no motion.

`src/middleware.ts` lines 27-28 send an authenticated user from `/` to `/dashboard`. Only unsigned visitors see this page.

Handout look already exists. `renderHandoutHtml` in `src/lib/handout-renderer.ts` sanitizes markdown. `HandoutArticle.astro` prints title plus that HTML and sets `data-category`. `BACKGROUND_CONFIGS` in `src/lib/backgrounds.ts` supplies `cssBackground` and the visible label for `fantasy`, `horror`, and `scifi`. Category fonts and border images live on `.handout-article[data-category='...']` in `src/styles/global.css`. The share page at `src/pages/share/[token].astro` lines 61-73 paints `cssBackground` on a wrapper and mounts `HandoutArticle`. The editor preview does the same with the React twin.

`.moon-chrome article:not(.handout-article)` in `src/styles/global.css` line 314 already leaves `.handout-article` out of moon-chrome card paint. Landing can mount the real article without a second skin.

`DashboardDrawer.tsx` and `dashboard.astro` already cancel motion with `motion-reduce:animate-none` or `motion-reduce:transition-none`. TEC-42 says reduced motion must keep the examples still.

`__tests__/lib/app-version.test.ts` and `__tests__/lib/chrome-theme.test.ts` read source files when Vitest cannot render Astro. That is the test pattern for `Welcome.astro` and `LandingExample.astro`.

### Key Discoveries

- Authenticated visitors never see `/`. Manual checks run logged out.
- `BACKGROUND_CATEGORY_OPTIONS` is `fantasy`, `horror`, `scifi`. Example order should match.
- `HandoutArticle.astro` hard-codes `max-w-2xl` in `class:list`. `class:list` concatenates and does not merge Tailwind width classes. Landing cannot pass `max-w-none` on top of that default and expect it to win.
- Sci-fi scanlines use `.handout-article[data-category='scifi']::before`. Do not put a CSS `transform` on that article node. Put motion on an outer wrapper.
- Category labels stay High Fantasy, Eldritch, and Grimdark. S-21 owns the Sci-fi rename.

## Desired End State

An unsigned visitor on `/` sees a scrollable showcase. The page starts with the existing hero and CTAs, then one full section per style. Each section has a short description and a large static example handout. Scroll-driven keyframes play as a section enters the viewport. A closing band repeats Sign In and Sign Up. The examples are not links and they do not read the handouts table.

Verify on `/` logged out, at a desktop width and a narrow width, and with reduced motion on.

## What We're NOT Doing

- Adding or editing a PRD functional requirement. The roadmap already marks that FR as TBD.
- Reading or writing the `handouts` table.
- Linking examples to `/share` or to any live handout.
- Changing Sign In, Sign Up, the app name, or the tagline.
- Changing middleware. Signed-in visitors still leave `/` for `/dashboard`.
- Renaming Grimdark to Sci-fi. That is S-21.
- Loading a React island for this gallery.
- A `fixed` or `sticky` example overlay on top of the CTAs.

## Implementation Approach

Keep sample copy in a lib helper so tests can check category coverage and HTML without rendering Astro. Render each card with the existing share-page stack: background wrapper, `renderHandoutHtml`, `HandoutArticle.astro`. Mount the cards from `Welcome` under the CTAs. Add a light CSS float on an outer wrapper and turn it off when motion is reduced.

This follows atomic design, `class:list` on Astro markup, exports at the end of TypeScript files, and the source-sync test pattern.

## Critical Implementation Details

Do not query Supabase from the landing page. Samples are module constants.

Do not put `transform` on `.handout-article`. Sci-fi scanlines use `position: relative` and `::before`. A transform on that node would create a containing block and clip or shift the overlay. Animate a wrapper that does not have class `handout-article`.

Keep the hero and both auth links. Examples are a new section after the CTA row.

Do not clip the samples to a shared max height. Each section shows a full large sample. The background wrapper may use `overflow-hidden` only to keep sci-fi scanlines inside the painted frame. Change `HandoutArticle.astro` so `max-w-2xl` is the fallback only when `class` is omitted. Landing then passes `max-w-none` and the article fills the column. The share page does not pass `class`, so it keeps `max-w-2xl`.

Do not nest the examples grid inside the hero `max-w-4xl` column. Mount `data-landing-examples` as a sibling after that column, still inside the padded moon-chrome shell, with `max-w-6xl`.

## Phase 1: Static examples on the landing page

### Overview

Landing grows three static styled previews under the existing CTAs. Unit tests cover the sample list and the source contracts for motion and auth links.

### Changes Required

#### 1. Sample helper

**File:** `src/lib/landing-examples.ts`

**Intent:** One place owns the three static samples so Welcome and tests share the same category set and rendered HTML.

**Contract:** `LandingExample` has `category`, `title`, `markdown`, and `description`. `getLandingExamples()` returns exactly three entries, one each for `fantasy`, `horror`, and `scifi`, in that order. Titles, descriptions, and markdown are non-empty. Markdown is short flavor text with no raw HTML and no markdown links. `getLandingExampleCards()` maps each sample to `{ category, title, html, cssBackground, heading, description }` using `renderHandoutHtml`, `BACKGROUND_CONFIGS[category].cssBackground`, and `BACKGROUND_CONFIGS[category].label` as `heading`. Export the type and both functions at the end of the file. Use `@/` for project imports.

#### 2. Example card molecule

**File:** `src/components/molecules/LandingExample.astro`

**Intent:** One showcase section so Welcome stays a page organism and each style gets a description plus a large sample.

**Contract:** `interface Props { title: string; html: string; category: BackgroundCategory; cssBackground: string; heading: string; description: string; isReversed: boolean }`. Root node is a `section` with `data-landing-showcase={category}`. It is not an `a` and it has no `href`. The section is a two-column row at `md`, stacked on small screens. Copy shows `heading`, `title`, and `description`. `isReversed` swaps column order at `md`. The sample lives on a child with `data-landing-example={category}`. That child uses `cssBackground` as `background`, `background-size: cover`, and `background-position: center`, matching the share page. It mounts `HandoutArticle` with `title`, `html`, `category`, and `class="max-w-none"`. Enter motion is the `landing-showcase-enter` keyframe on the section, driven by `animation-timeline: view()` inside `@supports`. Float is a slow `translateY` keyframe on `[data-landing-example]` only. Include `@media (prefers-reduced-motion: reduce)` that sets `animation: none` on both markers. Also add `motion-reduce:animate-none` on the sample wrapper. Do not put `transform` or the animation on `.handout-article`.

#### 3. Article width fallback

**File:** `src/components/molecules/HandoutArticle.astro`

**Intent:** Landing cards need a full-width article. `class:list` cannot cancel the hard-coded `max-w-2xl`.

**Contract:** Keep `max-w-2xl` only when `class` is omitted, for example `class:list={['handout-article mx-auto w-full p-4 md:p-8', className ?? 'max-w-2xl']}`. Do not edit `HandoutArticle.tsx`. The share page keeps the default width.

#### 4. Welcome mount

**File:** `src/components/organisms/Welcome.astro`

**Intent:** Unsigned visitors see the examples without losing the hero or the auth CTAs.

**Contract:** Import `LandingExample` and `getLandingExampleCards`. Close the hero `max-w-4xl` column after the CTA row. Then, still inside the padded moon-chrome shell, render a lead line and a `div` with `data-landing-examples` and `max-w-6xl`. Do not nest that block inside the hero column. Do not use a three-column card grid. Map the samples in helper order. Pass `isReversed` on odd indexes. After the samples, render a closing band that repeats Sign In and Sign Up. Keep the `h1` text, tagline, Sign In `href="/auth/signin"`, and Sign Up `href="/auth/signup"`. Do not wrap the samples in a link. Do not query the database.

### Success Criteria

#### Automated Verification

- `getLandingExamples()` returns three items whose categories are `fantasy`, `horror`, and `scifi` in that order.
- Each sample has a non-empty title, description, and markdown.
- `getLandingExampleCards()` returns the same categories and a non-empty `html`, `heading`, `description`, and `cssBackground` for each card.
- `src/components/organisms/Welcome.astro` still contains `Handouts Scriptorium`, `href="/auth/signin"`, and `href="/auth/signup"`, and also contains `data-landing-examples`.
- `src/components/molecules/LandingExample.astro` contains `data-landing-example`, `data-landing-showcase`, `landing-showcase-enter`, `animation-timeline: view()`, and `prefers-reduced-motion`. It does not contain `href`.
- `src/lib/landing-examples.ts` does not import `@/lib/supabase`.
- `src/components/molecules/HandoutArticle.astro` applies `max-w-2xl` only when `class` is omitted.
- `src/components/organisms/Welcome.astro` places `data-landing-examples` outside the hero `max-w-4xl` column.
- `npm test -- --project unit` passes `__tests__/lib/landing-examples.test.ts`.
- `npm run lint` passes.

#### Manual Verification

- Logged out `/` shows the app name, Sign In, Sign Up, and three showcase sections with descriptions, one High Fantasy, one Eldritch, one Grimdark.
- The showcases sit under the CTAs. Sign In still goes to `/auth/signin`. Sign Up still goes to `/auth/signup`.
- The examples are not links. Each section has a description and a large sample that uses the category background, font, and border.
- With `prefers-reduced-motion: reduce`, the examples stay still.
- On a narrow viewport the three cards stack and stay readable. Auth buttons stay usable.

---

## Testing Strategy

### Unit Tests

- Sample list covers each `BackgroundCategory` once, in `BACKGROUND_CATEGORY_OPTIONS` order.
- Card helper renders sanitized HTML and copies `cssBackground` from `BACKGROUND_CONFIGS`.
- Welcome source keeps the hero copy, both auth hrefs, and the examples section marker.
- LandingExample source marks the card, honors reduced motion, and is not a link.
- Sample module does not import Supabase.

### Integration Tests

- None. No API, schema, or auth change.

### Manual Testing Steps

1. Open `/` logged out. Confirm the heading, both CTAs, and three example cards.
2. Click Sign In, then return and click Sign Up. Confirm the existing auth pages.
3. Confirm the cards are not clickable and show the three category looks.
4. In devtools, set `prefers-reduced-motion: reduce` and reload. Confirm the cards do not move.
5. Resize to a phone width. Confirm the cards stack and the CTAs still work.

## References

- Roadmap: `context/foundation/roadmap.md` S-20
- Linear: TEC-42
- PRD: `context/foundation/prd.md` FR-015
- `src/components/organisms/Welcome.astro`
- `src/pages/share/[token].astro` lines 61-73
- `src/lib/backgrounds.ts`
- `src/lib/handout-renderer.ts`
- `src/styles/global.css` lines 314 and 518-663
- `__tests__/lib/app-version.test.ts`

## Progress

> `- [ ]` is pending and `- [x]` is complete. Append a commit SHA when a step lands.

### Phase 1: Static examples on the landing page

#### Automated

- [x] 1.1 `getLandingExamples()` returns three items whose categories are `fantasy`, `horror`, and `scifi` in that order. — a2a1408
- [x] 1.2 Each sample has a non-empty title and non-empty markdown. — a2a1408
- [x] 1.3 `getLandingExampleCards()` returns the same categories and a non-empty `html` and `cssBackground` for each card. — a2a1408
- [x] 1.4 `src/components/organisms/Welcome.astro` still contains `Handouts Scriptorium`, `href="/auth/signin"`, and `href="/auth/signup"`, and also contains `data-landing-examples`. — a2a1408
- [x] 1.5 `src/components/molecules/LandingExample.astro` contains `data-landing-example` and `prefers-reduced-motion`. It does not contain `href`. — a2a1408
- [x] 1.6 `src/lib/landing-examples.ts` does not import `@/lib/supabase`. — a2a1408
- [x] 1.7 `npm test -- --project unit` passes `__tests__/lib/landing-examples.test.ts`. — a2a1408
- [x] 1.8 `npm run lint` passes. — a2a1408
- [x] 1.14 `src/components/molecules/HandoutArticle.astro` applies `max-w-2xl` only when `class` is omitted. — a2a1408
- [x] 1.15 `src/components/organisms/Welcome.astro` places `data-landing-examples` outside the hero `max-w-4xl` column. — a2a1408
- [x] 1.16 Each sample has a non-empty description and each card copies the category label as `heading`. — d6c1d8f
- [x] 1.17 `src/components/molecules/LandingExample.astro` contains `data-landing-showcase`, `landing-showcase-enter`, and `animation-timeline: view()`. — d6c1d8f
- [x] 1.18 `src/components/organisms/Welcome.astro` contains a closing CTA band and does not use `md:grid-cols-3`. — d6c1d8f
- [x] 1.19 `npm test -- --project unit` passes `__tests__/lib/landing-examples.test.ts` after the showcase revision. — d6c1d8f
- [x] 1.20 `npm run lint` passes after the showcase revision. — d6c1d8f

#### Manual

- [x] 1.9 Logged out `/` shows the app name, Sign In, Sign Up, and three example handouts, one High Fantasy, one Eldritch, one Grimdark. — a2a1408
- [x] 1.10 The examples sit under the CTAs. Sign In still goes to `/auth/signin`. Sign Up still goes to `/auth/signup`. — a2a1408
- [x] 1.11 The examples are not links. They use the category background, font, and border, and they float a little on a desktop width. — a2a1408
- [x] 1.12 With `prefers-reduced-motion: reduce`, the examples stay still. — a2a1408
- [x] 1.13 On a narrow viewport the three cards stack and stay readable. Auth buttons stay usable. — a2a1408
- [x] 1.21 Logged-out `/` is a scrollable showcase. Each style has a description and a large sample. — d6c1d8f
- [x] 1.22 Desktop rows alternate copy and sample. Mobile stacks copy above the sample. — d6c1d8f
- [x] 1.23 Scrolling plays the enter keyframe. Reduced motion keeps every section still. — d6c1d8f
- [x] 1.24 The closing band still opens `/auth/signin` and `/auth/signup`. — d6c1d8f
