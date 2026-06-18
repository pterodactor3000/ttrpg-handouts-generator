---
date: 2026-06-17T18:39:00+02:00
researcher: Cogitator
git_commit: 929f2a8b6e898f245220d32ddf02dc970cdc49e5
branch: feature/s-09-retheme-backgrounds
repository: ttrpg-handouts-generator
topic: "Retheme category backgrounds — replace CSS gradients with themed imagery (parchment / CRT / newspaper)"
tags: [research, backgrounds, backgrounds.ts, HandoutEditor, share-page, HandoutCard, BackgroundPicker, retheme-backgrounds]
status: complete
last_updated: 2026-06-17
last_updated_by: Cogitator
---

# Research: Retheme Category Backgrounds

**Date**: 2026-06-17T18:39:00+02:00
**Researcher**: Cogitator
**Git Commit**: `929f2a8b6e898f245220d32ddf02dc970cdc49e5`
**Branch**: `feature/s-09-retheme-backgrounds`
**Repository**: ttrpg-handouts-generator

## Research Question

What is the current background implementation, and what must change to deliver S-09 — replacing the CSS gradient placeholders with themed backgrounds (old paper for High Fantasy, green-tinted CRT for Grimdark, newspaper for Eldritch)?

## Summary

Backgrounds are **CSS gradients only** — no raster images exist. Every callsite reads from a single string field (`cssBackground`) in `src/lib/backgrounds.ts`. Because all four callsites consume the same field, **replacing the gradient strings (or changing them to `url(...)` references) requires a single-file edit to `backgrounds.ts`** plus any image assets in `public/backgrounds/`.

The prerequisite change S-07 (`per-style-fonts`) is fully archived. It added a two-layer system:
- **Outer wrapper** — inline `style` with the `cssBackground` gradient (full viewport / preview area)
- **Inner `HandoutArticle`** — semi-transparent overlay card (`background-color: var(--palette-overlay)`) + `data-category` attribute driving per-category fonts/colors via CSS

S-09 replaces the outer wrapper's gradient. The inner overlay and font system are independent and unaffected.

The roadmap names the three themes:
- **High Fantasy** (`fantasy`) — old paper / parchment
- **Grimdark** (`scifi`) — green-tinted CRT display
- **Eldritch** (`horror`) — newspaper print

Whether these are **CSS-only** (complex gradients + CSS textures) or **raster image assets** is the outstanding user decision from the roadmap (`context/foundation/roadmap.md:229`). Either approach slots into the same `cssBackground` field without touching callers.

---

## Detailed Findings

### Current `backgrounds.ts` — single source of truth

**File:** `src/lib/backgrounds.ts` (24 lines)

```typescript
const BACKGROUND_CONFIGS: Record<BackgroundCategory, { label: string; cssBackground: string }> = {
  fantasy: {
    label: 'High Fantasy',
    cssBackground:
      'radial-gradient(ellipse at top, #c8a87a 0%, #8b6035 40%), linear-gradient(180deg, #d4b47e 0%, #7a4e28 100%)',
  },
  horror: {
    label: 'Eldritch',
    cssBackground:
      'radial-gradient(ellipse at top, #c8c0a8 0%, #a89878 40%), linear-gradient(180deg, #d0c8b0 0%, #9c8c70 100%)',
  },
  scifi: {
    label: 'Grimdark',
    cssBackground:
      'radial-gradient(ellipse at top, #001a3a 0%, #000d1a 40%), linear-gradient(180deg, #002244 0%, #000d1a 100%)',
  },
};
```

`BACKGROUND_CATEGORY_OPTIONS: BackgroundCategory[] = ['fantasy', 'horror', 'scifi']` is a separate export used by `BackgroundPicker` for iteration.

### Existing assets in `public/`

No background image assets exist today. Full inventory:

| File | Purpose |
|------|---------|
| `public/favicon.png` | Site icon |
| `public/template.png` | Unused (not referenced in background-related code) |
| `public/fonts/Tisk.ttf` | High Fantasy font (S-07) |
| `public/fonts/Metalick.ttf` | Grimdark font (S-07) |
| `public/fonts/Consul Typewriter.ttf` | Eldritch font (S-07) |
| `public/fonts/Glendora.otf` | Superseded fantasy font — unused |
| `public/.assetsignore` | Cloudflare asset exclusions |

If S-09 uses raster images, they should go under `public/backgrounds/`.

### Four callsites — all read `cssBackground` as a string

All four consume the same `cssBackground` string via inline `style`. None require changes if the field shape stays `string`.

| File | Element | Property | Lines |
|------|---------|----------|-------|
| `src/components/organisms/HandoutEditor.tsx` | Preview wrapper `<div>` | `backgroundImage` (+ `backgroundColor` fallback) | 76, 265–270 |
| `src/pages/share/[token].astro` | `<main>` (full viewport) | `background` shorthand | 53, 59–62 |
| `src/components/molecules/BackgroundPicker.tsx` | Per-option `<button>` swatch | `background` | 26 |
| `src/components/molecules/HandoutCard.astro` | Top strip `<div class="h-12">` | `background` | 12, 18 |

**Key difference between editor and share page:**
- Editor uses `backgroundImage: previewBackground` with a separate `backgroundColor: var(--palette-preview-fallback)` fallback
- Share page uses `background: ${pageBackground}` shorthand

For raster images, this matters: the editor's `backgroundImage` + `backgroundSize: 'cover'` + `backgroundPosition: 'center'` already handles image scaling correctly. The share page's shorthand `background` would need `background-size: cover; background-position: center` added if not already present (currently it is: `background-size: cover; background-position: center` at `share/[token].astro:61`).

### Two-layer rendering architecture (established by S-05 + S-07)

```
┌─────────────────────────────────────────────────┐
│ Outer wrapper (full viewport / preview area)    │
│ background: cssBackground (gradient → S-09 art) │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ HandoutArticle (.handout-article)         │  │
│  │ background-color: var(--palette-overlay)  │  │
│  │ backdrop-filter: blur(12px)               │  │
│  │ data-category → fonts + text color (S-07) │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

`var(--palette-overlay)` is a semi-transparent dark color. It provides the readable panel over the gradient. This overlay's opacity/color may need per-category tuning once real backgrounds land — especially for Eldritch (newspaper = light background; dark overlay may look wrong) and possibly Fantasy (parchment = warm light; dark overlay may obscure texture).

### Per-category font/color compatibility with proposed themes

| Category | Font | Text Color | Proposed Background | Readability Risk |
|----------|------|-----------|---------------------|-----------------|
| `fantasy` | Tisk (serif) | `#2c1810` (dark sepia) | Old paper / parchment (warm light) | Low — dark text on light warm bg |
| `scifi` | Metalick (monospace) | `#39ff14` (neon green) | Green-tinted CRT (dark) | Low — neon on dark is high contrast |
| `horror` | Consul Typewriter | `#1a1812` (near-black) | Newspaper (light, mid-contrast) | **Medium** — near-black on newsprint is fine for text; but `--palette-overlay` dark layer sits between article and background, may hide newspaper texture |

The `--palette-overlay` dark overlay is the primary risk for Eldritch (newspaper). If newspaper is the *outer* background and the article card has a dark semi-transparent layer on top, the newspaper aesthetic is obscured. Plan should decide: adjust overlay opacity per category, or remove overlay for horror and rely on white/cream card background instead.

---

## Code References

- `src/lib/backgrounds.ts:3–23` — full `BACKGROUND_CONFIGS` definition + exports
- `src/types.ts:3` — `type BackgroundCategory = 'fantasy' | 'horror' | 'scifi'`
- `src/components/organisms/HandoutEditor.tsx:76` — `previewBackground` derived from `BACKGROUND_CONFIGS`
- `src/components/organisms/HandoutEditor.tsx:265–270` — preview wrapper inline styles
- `src/pages/share/[token].astro:53` — `pageBackground` derived
- `src/pages/share/[token].astro:59–62` — `<main>` with inline `style`
- `src/components/molecules/BackgroundPicker.tsx:26` — swatch button inline `style`
- `src/components/molecules/HandoutCard.astro:12,18` — top strip inline `style`
- `src/styles/global.css:260–267` — `.handout-article` overlay styles (semi-transparent)
- `src/styles/global.css:298–355` — per-category font/color selectors (S-07 output)

---

## Architecture Insights

1. **Minimal blast radius** — `cssBackground` is a CSS string. Whether S-09 delivers complex CSS (CRT scanlines via `repeating-linear-gradient`, paper via `background-image: url(...)`) or pure gradients, the four callsites need zero changes as long as the field stays a `string`. Only `backgrounds.ts` values change.

2. **CSS-only vs raster** — the choice matters for:
   - **Load time**: raster images add HTTP requests; `background-size: cover` is already in place at all four callsites, so images scale correctly
   - **Texture fidelity**: CSS gradients can approximate CRT scanlines adequately; newspaper grain is harder without a raster image
   - **`public/` deployment**: raster images committed to `public/backgrounds/` are served as static assets by Cloudflare Workers — same pattern as fonts

3. **`--palette-overlay` and new backgrounds**: the semi-transparent dark overlay was designed around dark gradient backgrounds (S-01/S-05). Light backgrounds (parchment, newspaper) may need a different overlay color or opacity. This is a CSS-only change to `global.css` — either a new CSS custom property or per-category override on `.handout-article`.

4. **`BackgroundPicker` swatches and `HandoutCard` strip auto-update** — both read from `BACKGROUND_CONFIGS` directly. No changes needed in these components.

5. **No unit tests for `backgrounds.ts`** — unlike `fonts.ts` (which got a CSS sync test in F3 of S-07), `backgrounds.ts` has no test coverage. If the plan introduces a parallel structure (e.g. `background-image` + `background-color` fields), a completeness test is worth adding.

---

## Historical Context

- `context/archive/2026-05-30-first-handout-creation-and-sharing/plan-brief.md` — "CSS-gradient placeholders now; real art drops in by filename later." Decision to defer was explicit and pre-planned.
- `context/archive/2026-06-09-ui-restyle/plan.md` — "Genre gradients in `backgrounds.ts` are handout content, not app chrome — out of scope, leave untouched." S-05 deliberately preserved gradient values.
- `context/archive/2026-06-17-per-style-fonts/plan.md` — "No background gradient changes — that is S-09." S-07 confirmed the deferred scope.
- `context/foundation/roadmap.md:229` — Open question: CSS-only effects vs raster assets. Owner: user. Block: no.

---

## Related Research

- `context/archive/2026-06-09-ui-restyle/research.md` — contains full color audit of `backgrounds.ts` at S-05 time; good baseline for contrast/readability analysis
- `context/archive/2026-05-30-first-handout-creation-and-sharing/reviews/impl-review-phase-1.md` — notes gradient placeholder colors drifted from original plan spec (acceptable for MVP)

---

## Open Questions

1. **CSS-only or raster images?** — Roadmap marks this as owner: user. Each theme:
   - *Parchment (fantasy)*: achievable with layered gradients + CSS `filter` or `noise()`, but a scanned parchment texture `.jpg` is much more authentic
   - *CRT (scifi)*: `repeating-linear-gradient` scanlines + dark tint is fully CSS-achievable
   - *Newspaper (horror)*: dot-screen pattern possible with CSS, but authentic newsprint grain is easier with a tileable `.png`

2. **Overlay adjustment for light backgrounds** — Does the `--palette-overlay` dark card remain on all three, or do parchment/newspaper categories warrant a lighter/warmer overlay? This affects `global.css`.

3. **`HandoutCard` strip on light backgrounds** — The 48px strip currently works well for dark gradient themes. On parchment or newspaper, the strip may look washed out. May warrant a min-contrast border or vignette.

4. **`template.png` in `public/`** — Unused but present. Unrelated to backgrounds, but worth noting during asset inventory.
