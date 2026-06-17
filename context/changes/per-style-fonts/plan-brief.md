# Per-Style Fonts — Plan Brief

> Full plan: `context/changes/per-style-fonts/plan.md`

## What & Why

Add a preset font family and text color to each of the three handout style categories (High Fantasy / Grimdark / Eldritch). Also corrects the `scifi` and `horror` display labels, which were swapped from their intended themes. Implements FR-014 and unblocks S-09 (`retheme-backgrounds`).

## Starting Point

Three font files already exist in `public/fonts/` but have no `@font-face` declarations. `HandoutArticle` (both React and Astro variants) has no category awareness — all category styling today lives in parent wrappers as background gradients only. The `horror` label reads "Grimdark" and `scifi` reads "Post-Apocalyptic" — the reverse of their intended themes.

## Desired End State

Every handout article panel — in both the GM preview and the shared player view — renders text in the font and color preset for its category. The new-handout category picker and dashboard cards show the corrected labels. No DB schema changes; enum values are unchanged.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Font loading | Self-hosted TTF/OTF from `public/fonts/` | Files already committed, no CDN dependency, meets < 5s NFR | Plan |
| CSS architecture | `data-category` attr + CSS selectors | CSS-only theming, consistent with existing prose overrides in `global.css` | Plan |
| Font config | New `src/lib/fonts.ts` | Testable contract, separate from background config | Plan |
| Scope | Both `<h1>` and prose body | Fully cohesive look | Plan |
| Fallbacks | Category-appropriate generics (serif / monospace / sans-serif) | Correct semantic degradation per theme | Plan |
| Label fix | `scifi` → "Grimdark", `horror` → "Eldritch" | Corrects reversed labels from initial setup | Plan |
| No DB migration | Enum values unchanged | Labels are application-layer only | Plan |

## Scope

**In scope:**
- `@font-face` registration for Tisk, Metalick, Consul Typewriter (fantasy uses Tisk; Glendora.otf superseded)
- `src/lib/fonts.ts` — typed font config
- `backgrounds.ts` label corrections
- Per-category CSS in `global.css`
- `category?` prop on both `HandoutArticle` variants
- Caller wiring in `HandoutEditor.tsx` and `[token].astro`
- Unit tests for font config + attribute rendering

**Out of scope:**
- Background gradient changes (S-09)
- WOFF2 conversion
- Per-category link or code-block colors
- Font size changes
- User font selection

## Architecture / Approach

Font files are served as static assets from `public/fonts/`. `@font-face` declarations in `global.css` register three named families. A new `src/lib/fonts.ts` documents the category → font/color mapping for testing. `HandoutArticle` gains a `category?` prop rendered as `data-category` on `<article>`. `global.css` adds per-category CSS blocks (placed after the existing base prose overrides) that override `font-family`, `color`, and `--tw-prose-*` vars. Callers pass the category down.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Font registration & config | `@font-face` + `fonts.ts` + label corrections | Font file paths must match exactly |
| 2. Per-category CSS | Visual font + color per category in both views | CSS specificity — rules must come after base prose block |
| 3. Component wiring | `category` prop plumbed through both variants + callers | Dual-component parity (TSX + Astro) |
| 4. Unit tests | Contract verified for `FONT_CONFIGS` + `HandoutArticle` rendering | Vitest TSX setup may need React plugin check |

**Prerequisites:** S-01 done, S-05 done (prose overrides in `global.css` are the base this plan builds on)  
**Estimated effort:** ~1 session, 4 phases

## Open Risks & Assumptions

- Font file names are case-sensitive on Linux; paths in `@font-face` must match exactly (`Consul Typewriter.ttf` — note the space).
- Fantasy category uses dark sepia text (`#2c1810`) on a dark green gradient background. The overlay (`background-color: var(--palette-overlay)` on `.handout-article`) provides the light panel — verify readability in manual testing.
- `vitest.config.ts` may need `@vitejs/plugin-react` if no `.test.tsx` files exist yet (check before Phase 4).

## Success Criteria (Summary)

- All three categories render their preset font and color in both the GM preview and the share view
- Category picker and dashboard cards show "High Fantasy", "Grimdark", "Eldritch"
- All unit tests pass; no lint/build regressions
