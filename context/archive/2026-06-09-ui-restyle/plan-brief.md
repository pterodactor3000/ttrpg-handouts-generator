# UI Restyle (S-05) — Plan Brief

> Full plan: `context/changes/ui-restyle/plan.md`
> Research: `context/changes/ui-restyle/research.md`

## What & Why

Refresh the visual identity across the four existing screens (dashboard, new-handout editor, in-editor preview, shared read-only view) with a warm-dark palette, consistent typography/spacing, and a single shared loading animation. Per S-05, this is presentational only — no user flows change and no new screens are added.

## Starting Point

The app runs two disconnected color systems: a full shadcn oklch token set in `global.css` (barely used) and hardcoded "cosmic dark glass" classes (`bg-cosmic`, `bg-gray-950`, `purple-*`/`white/*`) on the actual screens. The editor shell (`bg-gray-950`) doesn't even match the dashboard (`bg-cosmic`). Markdown rendering is shared between preview and share but duplicated as inline markup with diverging `prose` scales. No `.loader` exists yet; loading states are ad-hoc (`animate-spin`, text-only).

## Desired End State

All four screens render in the warm-dark palette from one token source in `global.css`. The editor and dashboard share a background; the editor preview and shared view are pixel-consistent via a shared CSS class. A single `.loader` (with a browser-compat fallback) appears on every async state. Lint, type-check, and the existing unit/integration suites stay green.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Theme direction | Warm dark theme | Smallest blast radius — reuses dark-glass structure, keeps prose-invert/overlays valid | Plan |
| Palette wiring | Centralize in `global.css` tokens + `@theme inline` + utilities | Single source of truth; aligns the disconnected oklch system so primitives inherit the restyle | Plan |
| Loader scope | Everywhere (editor, auth, clipboard) | One consistent loader app-wide | Plan |
| Markdown prose | Keep `prose-invert`, tune accents to palette | Body text stays readable on dark backgrounds; only accents shift | Plan |
| Syntax theme | Keep `github-dark` | Reads fine on warm-dark; zero work/regression | Plan |
| Shared component | Extract `HandoutArticle` (shared CSS class + thin wrappers) | Eliminates preview/share drift; CSS class bridges the Astro/React boundary | Plan |
| `bg-cosmic` / not-found | Redefine `bg-cosmic` in place (don't remove) | `not-found` + auth pages inherit warm-dark for free, no markup edits | Plan |

## Scope

**In scope:** Palette tokens + loader in `global.css`; restyle dashboard, editor, preview, share; extract shared article wrapper; loader on editor/auth/clipboard.

**Out of scope:** Flow/routing changes; `backgrounds.ts` genre gradients; markdown pipeline; full typographic redesign; syntax-theme swap; explicit `not-found`/auth/landing restyle; new dashboard-fetch / preview-generation loaders (no async state exists).

## Architecture / Approach

Foundation-first. Phase 1 defines the palette once in `global.css` (CSS vars → `@theme inline` → aligned oklch tokens, redefined `bg-cosmic`, `.loader` + `@supports` fallback, shared article class). Phases 2–4 swap hardcoded classes to the new tokens screen-by-screen. Phase 5 wires the loader into all async states and runs cross-screen QA. The Astro/React split means preview (React) and share (Astro) achieve parity through a shared CSS class rather than one component.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Token foundation | Palette, aligned tokens, loader, shared class in `global.css` | Token misalignment cascading to all screens |
| 2. Content & prose parity | `HandoutArticle` wrapper; preview = share | XSS regression / prose legibility over gradients |
| 3. Dashboard restyle | Dashboard + list/card/badge on-palette | Status badges losing distinction |
| 4. Editor restyle | Editor shell unified; controls/dialogs on-palette | Dialog override removal breaking readability |
| 5. Loader wiring & QA | One loader everywhere; responsive + compat pass | Clipboard loader flicker; older-browser fallback |

**Prerequisites:** S-01 shipped (done); no data/schema work.
**Estimated effort:** ~2–3 sessions across 5 phases.

## Open Risks & Assumptions

- Removing the hard `bg-gray-900` dialog overrides assumes the aligned shadcn tokens read well — verify per dialog.
- The clipboard loader risks flicker on near-instant writes; kept deliberately minimal.
- Loader relies on `mask-composite: exclude` (Chrome 120+/Safari 15.4+); the `@supports` fallback covers the ~3–4% remainder.

## Success Criteria (Summary)

- All four screens are visually consistent and on-palette at mobile and desktop widths.
- The same loader appears on every async state, with a working fallback.
- No regression in the shipped S-01 create→preview→share flow; existing tests stay green.
