# Page version footer implementation plan

## Overview

S-22 adds a footer on every page that uses `Layout`, including the shared handout. The footer shows the `package.json` version with a `v` prefix, so the current package version `1.2.0` renders as `v1.2.0`. The shared handout keeps its existing home link. This covers FR-012 as the cited visual requirement. The extra footer FR stays a later PRD edit.

## Current State Analysis

`package.json` line 4 already sets `"version": "1.2.0"`. No page reads that field. `src/layouts/Layout.astro` lines 75-76 render `<slot />` and then `<Toaster client:load />`. There is no footer in Layout.

Every HTML page wraps in Layout: landing (`src/pages/index.astro` line 6), dashboard (`src/pages/dashboard.astro` line 43), settings, new and edit handout, auth pages, account-closed, share not-found, and both branches of `src/pages/share/[token].astro` (lines 60 and 82). API routes do not use Layout.

The shared handout already has its own footer at `src/pages/share/[token].astro` lines 74-78. That footer is a home link labeled `TTRPG Handouts Generator`. The 404 and unavailable branches use a `Back to home` link instead (lines 99-104). Those links stay.

Most page shells use `min-h-screen` (`dashboard.astro` line 44, `share/[token].astro` line 62, `Welcome.astro` line 5, `HandoutEditor.tsx` line 174). A Layout footer after the slot therefore sits just below that full-viewport shell. The user scrolls a short way to see it. Sonner toasts mount as a viewport overlay from `src/components/atoms/sonner.tsx` with no `position` prop, so they keep sonner's `bottom-right` default. `ArchiveButton.tsx`, `DeleteHandoutButton.tsx`, and `RestoreHandoutButton.tsx` call `toast.error` on failure. `CopyLinkButton.tsx` changes button state and does not toast. A document-flow footer does not sit on top of those toasts.

Astro imports JSON as a default object (`import someData from '../data/pokemon.json'`). `resolveJsonModule` is on in the Astro base tsconfig. Vite inlines that import at build time, so the Cloudflare Worker never reads the filesystem.

`__tests__/lib/chrome-theme.test.ts` already reads `Layout.astro` as text to keep strings in sync. That is the test pattern for markup that Vitest cannot render as an Astro island.

## Desired End State

Every Layout page shows a footer whose text is `v` plus the current `package.json` version. With the file at `1.2.0`, the text is `v1.2.0`. The shared handout still shows its home link. The version line does not cover the handout article or a toast.

Verify on `/`, `/auth/signin`, `/dashboard`, and `/share/<token>`. Confirm the share page still has the home link and the version line.

## What We're NOT Doing

- Adding or editing a PRD functional requirement. The roadmap already marks that FR as TBD.
- Changing the `package.json` version number.
- Removing or restyling the share-page home link.
- A `fixed` or `sticky` viewport footer.
- Changing page `min-h-screen` shells or the Layout `html, body { height: 100% }` rule.
- Putting the footer on API routes.
- Theme work beyond muted, small footer text.

## Implementation Approach

Read `package.json` in a small helper so tests can check the `v` prefix without rendering Astro. Mount a presentational Astro atom from Layout after the slot and before the toaster. Keep the footer in normal document flow.

This follows the existing Layout slot-then-toaster order, the chrome-theme source-sync test, atomic design for a new Astro atom, and `class:list` on Astro markup.

## Critical Implementation Details

Do not give the footer `position: fixed` or `position: sticky`. Either one sits on the viewport and can cover the share-page home link, the handout article, or a bottom-right toast.

Do not read `package.json` with `node:fs` at request time. Import the JSON module so Vite inlines the version into the Worker bundle.

Leave the share-page `<footer>` at `src/pages/share/[token].astro` lines 74-78 unchanged. Layout adds a second footer. Two footers on that page is the intended outcome.

## Phase 1: Version footer in Layout

### Overview

Layout grows a document-flow footer that prints `v` plus the package version. Unit tests cover the formatter and the Layout mount order.

### Changes Required

#### 1. Version helper

**File:** `src/lib/app-version.ts`

**Intent:** One place formats the package version so Layout and tests share the same `v` prefix rule.

**Contract:** Import `package.json` from the repo root. `formatAppVersion(version)` returns `` `v${version}` ``. `APP_VERSION` is `formatAppVersion` applied to `package.json` `version`. Export both at the end of the file. Use the `@/` alias for any project-source import. The JSON import stays a relative path because `package.json` is outside `src/`.

#### 2. Footer atom

**File:** `src/components/atoms/PageVersionFooter.astro`

**Intent:** Presentational footer so Layout stays a template and the new UI unit follows atomic design.

**Contract:** `interface Props { version: string }`. Render a `<footer data-page-version-footer>` whose text content is the `version` prop. Use `class:list` if classes are conditional. Default classes are muted, centered, extra-small text with modest padding (`text-muted-foreground w-full px-4 py-3 text-center text-xs`). No `fixed`, no `sticky`, no `moon-chrome`.

#### 3. Layout mount

**File:** `src/layouts/Layout.astro`

**Intent:** Every HTML page that already uses Layout shows the version footer without touching each page.

**Contract:** Import `APP_VERSION` from `@/lib/app-version` and `PageVersionFooter` from `@/components/atoms/PageVersionFooter.astro`. After `<slot />` and before `<Toaster client:load />`, render `<PageVersionFooter version={APP_VERSION} />`. Do not change the theme boot script, Banner, or Toaster.

### Success Criteria

#### Automated Verification

- `formatAppVersion('1.2.0')` returns `v1.2.0`.
- `APP_VERSION` equals `v` plus the live `package.json` `version`.
- `src/layouts/Layout.astro` imports `APP_VERSION` and `PageVersionFooter`, renders `PageVersionFooter` after `<slot />`, and renders `<Toaster` after `PageVersionFooter`.
- `src/components/atoms/PageVersionFooter.astro` contains `data-page-version-footer` and does not contain `fixed` or `sticky`.
- `src/pages/share/[token].astro` still contains the `TTRPG Handouts Generator` home link.
- `npm test -- --project unit` passes `__tests__/lib/app-version.test.ts`.
- `npm run lint` passes.

#### Manual Verification

- `/`, `/auth/signin`, and `/dashboard` each show a footer whose text is `v1.2.0`.
- A published share page still shows the `TTRPG Handouts Generator` home link and also shows `v1.2.0` below the handout, not over the article.
- On `/dashboard`, the version footer sits below the `min-h-screen` shell. The toaster stays a viewport overlay. A failed archive or restore toast, if one appears, stays readable and is not covered by the footer.

---

## Testing Strategy

### Unit Tests

- `formatAppVersion` prefixes `v` onto the raw `package.json` version string.
- `APP_VERSION` tracks the live package version.
- Layout source keeps slot, footer, toaster order.
- Footer atom source stays in document flow.
- Share page source still has the home link.

### Integration Tests

- None. No API, schema, or auth change.

### Manual Testing Steps

1. Open `/` and `/auth/signin`. Confirm the footer text is `v1.2.0`.
2. Sign in and open `/dashboard`. Confirm the same footer.
3. Open a published `/share/<token>`. Confirm the home link and `v1.2.0` are both visible after the handout.
4. On `/dashboard`, confirm `[data-page-version-footer]` is below the main shell and `.toaster` remains a viewport overlay. A failed archive or restore toast, if triggered, stays readable.

## References

- Roadmap: `context/foundation/roadmap.md` (S-22)
- PRD: `context/foundation/prd.md` (FR-012)
- `src/layouts/Layout.astro` lines 75-76
- `src/pages/share/[token].astro` lines 74-78
- `package.json` line 4
- `__tests__/lib/chrome-theme.test.ts` lines 103-113

## Progress

> `- [ ]` is pending and `- [x]` is complete. Append a commit SHA when a step lands.

### Phase 1: Version footer in Layout

#### Automated

- [x] 1.1 `formatAppVersion('1.2.0')` returns `v1.2.0`.
- [x] 1.2 `APP_VERSION` equals `v` plus the live `package.json` `version`.
- [x] 1.3 `src/layouts/Layout.astro` imports `APP_VERSION` and `PageVersionFooter`, renders `PageVersionFooter` after `<slot />`, and renders `<Toaster` after `PageVersionFooter`.
- [x] 1.4 `src/components/atoms/PageVersionFooter.astro` contains `data-page-version-footer` and does not contain `fixed` or `sticky`.
- [x] 1.5 `src/pages/share/[token].astro` still contains the `TTRPG Handouts Generator` home link.
- [x] 1.6 `npm test -- --project unit` passes `__tests__/lib/app-version.test.ts`.
- [x] 1.7 `npm run lint` passes.

#### Manual

- [x] 1.8 `/`, `/auth/signin`, and `/dashboard` each show a footer whose text is `v1.2.0`.
- [x] 1.9 A published share page still shows the `TTRPG Handouts Generator` home link and also shows `v1.2.0` below the handout, not over the article.
- [x] 1.10 On `/dashboard`, the version footer sits below the `min-h-screen` shell. The toaster stays a viewport overlay. A failed archive or restore toast, if one appears, stays readable and is not covered by the footer.
