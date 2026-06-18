# Retheme Backgrounds Implementation Plan

## Overview

Replace the current plain CSS gradient aesthetics with a fully themed visual identity per handout category. Each category gets:

- A more thematic outer CSS gradient backdrop (visible around/behind the HandoutArticle card)
- A `border-image` with `fill` that renders the card itself as an authentic themed artifact — parchment scroll for High Fantasy, newspaper page for Eldritch, CRT monitor bezel for Grimdark

The `border-image fill` keyword paints the image's center slice over the card background, replacing the semi-transparent dark overlay with the actual themed texture. The border edges frame the card with the decorative motif. Fonts and text colors (S-07) are untouched.

## Current State Analysis

- `src/lib/backgrounds.ts` — single source of truth; 3 plain CSS gradient strings in `cssBackground`
- `.handout-article` base (`global.css:260-267`) — `border-radius: 1rem`, `border: 1px solid`, `background-color: var(--palette-overlay)`, `backdrop-filter: blur(12px)`
- Per-category blocks (`global.css:298-355`) — font-family + color overrides only (S-07); no background or border overrides
- 4 callsites consume `cssBackground` as a plain CSS string inline: `HandoutEditor.tsx:265-270`, `share/[token].astro:59-62`, `BackgroundPicker.tsx:26`, `HandoutCard.astro:18`
- `BackgroundPicker` and `HandoutCard` set `background` without `background-size` or `background-position`
- No image assets exist in `public/` beyond `favicon.png` and `template.png`

## Desired End State

1. Background picker swatches and HandoutCard top strips reflect updated themed gradients
2. The HandoutArticle card in both the GM preview and the player share view renders as the correct themed artifact per category — parchment scroll, newspaper page, or CRT screen
3. All three themed cards have sharp corners (`border-radius: 0`); the no-category fallback keeps rounded corners unchanged
4. The outer gradient backdrop matches the aesthetic of the themed border
5. `BackgroundPicker` and `HandoutCard` set `background-size: cover; background-position: center` for future-proofing
6. Unit test verifies `BACKGROUND_CONFIGS` completeness

### Key Discoveries

- `border-image` and `border-radius` are incompatible in CSS — `border-radius: 0` must be set per category, overriding the base `1rem`
- `border-image` with `fill` makes `background-color: var(--palette-overlay)` irrelevant for themed categories — override to `transparent` so the image covers the card interior completely
- `border-width` must be explicitly overridden per category — the base `border: 1px solid` only allocates 1px of space; decorative borders need 40–80px
- Slice values in the `border-image` shorthand are in **source image pixels**, not rendered pixels — they depend on the actual asset and must be tuned after sourcing
- `BackgroundPicker.tsx:26` and `HandoutCard.astro:18` lack `background-size`/`background-position` — add now to future-proof
- `public/.assetsignore` should be checked to confirm `borders/` is not excluded from Cloudflare static serving
- S-07 per-category CSS blocks (lines 298–355) must remain untouched; S-09 border rules are appended after them

## What We're NOT Doing

- No change to `backgrounds.ts` field shape — `{ label: string; cssBackground: string }` stays
- No font or text color changes — S-07 per-category rules are preserved exactly
- No changes to `HandoutArticle` component props, `data-category` wiring, or caller wiring — correct from S-07
- No DB or API changes — `BackgroundCategory` enum values are identifiers, not user-visible labels
- No border-image on the no-category fallback state — base `.handout-article` keeps rounded dark card
- No E2E test changes — border rendering is visual-only

## Implementation Approach

Five phases in dependency order:

1. Update gradient values in `backgrounds.ts` (independent; can land first)
2. Source and place 3 border image assets in `public/borders/` (prerequisite for Phase 3 CSS tuning)
3. Add per-category `border-image` CSS in `global.css` (appended after S-07 blocks)
4. Add `background-size: cover` + `background-position: center` to `BackgroundPicker` and `HandoutCard` (small, independent)
5. Unit test `backgrounds.ts` completeness

## Critical Implementation Details

**`border-image` slice values are in source image units.** For a 400×400px PNG with 80px decorative edges: `border-image: url('/borders/fantasy-border.png') 80 fill / 60px / 0 round`. The `80` refers to pixels in the source image; `60px` is the rendered border width. Start with `40 fill / 40px` as a safe default and tune visually once assets are in place.

**`border-width` must match the `border-image` width.** CSS `border-width` must be explicitly declared (e.g. `border-width: 60px`) to override the inherited `1px` from the base rule. If `border-image: ... fill / 60px` is set but `border-width` stays at `1px`, the browser only allocates 1px of border space and the image renders incorrectly.

**Per-category `background-color: transparent` must be unlayered.** The base `background-color: var(--palette-overlay)` is outside `@layer` (unlayered). The override must also be unlayered and placed after the base rule — it relies on source order to win, not layer priority.

---

## Phase 1: Updated gradient backdrops in backgrounds.ts

### Overview

Update the three `cssBackground` values to richer, more thematic gradients. These are the outer backdrops visible around the HandoutArticle card — they set atmospheric context for the border imagery.

### Changes Required

#### 1. Gradient values

**File:** `src/lib/backgrounds.ts`

**Intent:** Update all three `cssBackground` strings to better complement the incoming border aesthetics. Fantasy moves to a brighter golden-amber parchment tone. Horror moves to a desaturated cool newsprint tone. Scifi gains CRT scanlines on a deep phosphor-green-black.

**Contract:**

```typescript
fantasy: {
  label: 'High Fantasy',
  cssBackground:
    'radial-gradient(ellipse at top, #e8d0a0 0%, #c4a050 40%), linear-gradient(180deg, #f0d888 0%, #a87828 100%)',
},
horror: {
  label: 'Eldritch',
  cssBackground:
    'radial-gradient(ellipse at top, #f0ece0 0%, #d8d0b8 40%), linear-gradient(180deg, #ece8d8 0%, #c0b898 100%)',
},
scifi: {
  label: 'Grimdark',
  cssBackground:
    'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px), radial-gradient(ellipse at top, #0c2010 0%, #020a05 40%), linear-gradient(180deg, #082008 0%, #010802 100%)',
},
```

These are starting values — implementer may tune hex values and stop positions after visual review. The `label` fields (`'High Fantasy'`, `'Eldritch'`, `'Grimdark'`) are unchanged.

### Success Criteria

#### Automated Verification

- Type check + lint: `npm run lint`

#### Manual Verification

- BackgroundPicker swatches show updated gradient colors (golden-amber for fantasy, pale cream-gray for horror, deep green-black with horizontal line pattern for scifi)
- HandoutCard top strips reflect updated gradients
- Preview wrapper in HandoutEditor and share page `<main>` background update accordingly

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Border image assets

### Overview

Source three border image files and place them in `public/borders/`. These are a prerequisite for tuning Phase 3 CSS slice values. The CSS can be written before assets arrive but cannot be finalized until the images are in place.

### Changes Required

#### 1. Asset placement

**Directory:** `public/borders/` (create if absent)

**Files to source and place:**

| Filename | Category | Theme | What to look for |
|---|---|---|---|
| `fantasy-border.png` | fantasy | Parchment scroll / old paper | Aged paper or parchment texture with torn, burnt, or scroll-like edges; centre area relatively uniform for text readability |
| `horror-border.png` | horror | Newspaper front page | Newspaper-style border with masthead/column ornamentation at edges; light centre suitable for dark text |
| `scifi-border.png` | scifi | CRT monitor bezel | Monitor frame or HUD border with phosphor green tint; wear, scratches, or scanline artifacts at edges; dark centre |

**Recommended sources:** Wikimedia Commons (public domain), OpenClipart (CC0), Unsplash (Unsplash licence). Confirm the licence permits use in a web application before committing.

**Image requirements:**
- Minimum 400×400px for sharp rendering at desktop widths
- PNG with transparency preferred so the outer gradient backdrop shows through transparent edge regions
- The centre area of the image is painted over the card interior (border-image `fill`) — it must be opaque enough that the S-07 text colours (`#2c1810` fantasy, `#1a1812` horror, `#39ff14` scifi) remain readable on top

#### 2. `.assetsignore` check

**File:** `public/.assetsignore`

**Intent:** Verify `borders/` is not excluded from Cloudflare static asset serving. Add an explicit include or remove any glob that would exclude it.

### Success Criteria

#### Automated Verification

- Build passes with new files present: `npm run build`

#### Manual Verification

- `GET /borders/fantasy-border.png` returns 200 in dev server network tab
- `GET /borders/horror-border.png` returns 200
- `GET /borders/scifi-border.png` returns 200

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Per-category border-image CSS in global.css

### Overview

Append three `border-image` CSS blocks to `global.css`, one per category. These blocks override the base `.handout-article` `border-radius`, `background-color`, `border-width`, and `box-shadow`, and introduce `border-image` with the `fill` keyword. They are appended after the existing S-07 per-category prose blocks (currently ending at line 355) and must remain outside `@layer`.

### Changes Required

#### 1. Border-image blocks

**File:** `src/styles/global.css`

**Intent:** After the last S-07 `horror` prose block (line 355), append a clearly labelled S-09 section with three per-category blocks. Each block: sets `border-image` with `fill`, declares `border-width` matching the border-image width, overrides `border-radius: 0`, clears `background-color`, and sets a category-appropriate `box-shadow`.

**Contract:**

```css
/* S-09: themed border-image per category */
.handout-article[data-category='fantasy'] {
  border-image: url('/borders/fantasy-border.png') 80 fill / 60px / 0 round;
  border-width: 60px;
  border-radius: 0;
  background-color: transparent;
  box-shadow: 0 12px 40px -8px rgba(120, 80, 20, 0.5);
}

.handout-article[data-category='horror'] {
  border-image: url('/borders/horror-border.png') 80 fill / 60px / 0 round;
  border-width: 60px;
  border-radius: 0;
  background-color: transparent;
  box-shadow: 0 12px 40px -8px rgba(60, 50, 30, 0.4);
}

.handout-article[data-category='scifi'] {
  border-image: url('/borders/scifi-border.png') 80 fill / 60px / 0 round;
  border-width: 60px;
  border-radius: 0;
  background-color: transparent;
  box-shadow: 0 12px 40px -8px rgba(0, 80, 30, 0.5);
}
```

Slice value `80` and width `60px` are starting points — adjust after inspecting the actual asset's edge thickness. The `round` repeat keyword tiles edge slices to fill without distortion; swap to `stretch` if the edge motif looks wrong tiled.

### Success Criteria

#### Automated Verification

- Lint passes: `npm run lint`

#### Manual Verification

- GM preview (HandoutEditor): selecting each category and clicking Generate shows the article card framed by the correct border texture, with no rounded corners, and the card interior covered by the image's centre slice
- Text remains readable for all three categories (S-07 font colours on the new textured backgrounds)
- Share view: each published handout at `/share/<token>` shows the correct border and backdrop
- BackgroundPicker swatches and HandoutCard top strips render without regression (no border-image applied there)
- Mobile: shared view on a narrow viewport renders the border texture without overflow or layout break

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 4: background-size on picker and card callsites

### Overview

Add `background-size: cover` and `background-position: center` to `BackgroundPicker` and `HandoutCard`. These callsites currently set `background` without size or position. Harmless for CSS gradients but prevents broken display if any `cssBackground` value later contains a `url()` reference.

### Changes Required

#### 1. BackgroundPicker

**File:** `src/components/molecules/BackgroundPicker.tsx`

**Intent:** Extend the swatch button's inline style to include explicit background sizing so the swatch remains correctly positioned if `cssBackground` ever becomes a `url()` reference.

**Contract:** Add `backgroundSize: 'cover'` and `backgroundPosition: 'center'` to the `style` prop on the swatch `<button>` (currently at line 26).

#### 2. HandoutCard

**File:** `src/components/molecules/HandoutCard.astro`

**Intent:** Same intent as the picker — add explicit background sizing to the top strip.

**Contract:** On the strip `<div>`'s `style` attribute (currently `background: ${backgroundConfig.cssBackground}` at line 18), append `background-size: cover; background-position: center`.

### Success Criteria

#### Automated Verification

- Lint passes: `npm run lint`

#### Manual Verification

- BackgroundPicker swatches render identically to before
- HandoutCard top strips render identically to before

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 5: Unit test — backgrounds.ts completeness

### Overview

Add a unit test asserting `BACKGROUND_CONFIGS` covers all three `BackgroundCategory` values with non-empty `cssBackground` and `label` strings. Mirrors the pattern in `__tests__/lib/fonts-css-sync.test.ts`.

### Changes Required

#### 1. Test file

**File:** `__tests__/lib/backgrounds.test.ts` (new file)

**Intent:** Prevent future edits from accidentally removing a category entry or leaving a field empty — the same class of drift that fonts-css-sync.test.ts guards for `FONT_CONFIGS`.

**Contract:**

```typescript
import { describe, expect, it } from 'vitest';
import { BACKGROUND_CONFIGS, BACKGROUND_CATEGORY_OPTIONS } from '@/lib/backgrounds';
import type { BackgroundCategory } from '@/types';

const ALL_CATEGORIES: BackgroundCategory[] = ['fantasy', 'scifi', 'horror'];

describe('BACKGROUND_CONFIGS', () => {
  it('BACKGROUND_CATEGORY_OPTIONS covers all BackgroundCategory values', () => {
    expect(BACKGROUND_CATEGORY_OPTIONS).toEqual(expect.arrayContaining(ALL_CATEGORIES));
    expect(BACKGROUND_CATEGORY_OPTIONS).toHaveLength(ALL_CATEGORIES.length);
  });

  it('BACKGROUND_CONFIGS keys cover all BackgroundCategory values', () => {
    expect(Object.keys(BACKGROUND_CONFIGS)).toEqual(expect.arrayContaining(ALL_CATEGORIES));
  });

  for (const category of ALL_CATEGORIES) {
    it(`${category} has non-empty cssBackground`, () => {
      expect(BACKGROUND_CONFIGS[category].cssBackground.trim()).not.toBe('');
    });

    it(`${category} has non-empty label`, () => {
      expect(BACKGROUND_CONFIGS[category].label.trim()).not.toBe('');
    });
  }
});
```

### Success Criteria

#### Automated Verification

- `npm test -- --project unit` passes with all new tests green

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests

- `__tests__/lib/backgrounds.test.ts` — `BACKGROUND_CONFIGS` completeness and non-empty field assertions

### Manual Testing Steps

1. Start dev server: `npm run dev`
2. Log in, open `/handouts/new`
3. Select each category → click Generate → confirm:
   - Fantasy: golden-amber gradient backdrop, card framed by parchment border, parchment texture fills card interior, Tisk font in dark sepia
   - Horror: pale newsprint gradient backdrop, card framed by newspaper border, newsprint texture fills card interior, Consul Typewriter in near-black
   - Scifi: deep green-black CRT gradient with scanlines, card framed by CRT bezel, dark phosphor texture fills interior, Metalick in neon green
4. Confirm sharp corners (no border-radius) on all three
5. Confirm text is readable on each card interior (font colours from S-07)
6. Create and publish one handout per category; open `/share/<token>` for each in a separate browser tab → confirm correct border, backdrop, and typography
7. Open a published link on a mobile viewport → confirm border texture renders without overflow
8. Return to dashboard → confirm HandoutCard top strips show updated gradients, no layout regression

## References

- Research: `context/changes/retheme-backgrounds/research.md`
- Roadmap: `context/foundation/roadmap.md` § S-09
- `src/lib/backgrounds.ts` — gradient values (Phase 1)
- `src/styles/global.css:260-267` — base `.handout-article` styles
- `src/styles/global.css:298-355` — S-07 per-category font/color blocks (Phase 3 appends after line 355)
- `src/components/molecules/BackgroundPicker.tsx:26` — swatch button style (Phase 4)
- `src/components/molecules/HandoutCard.astro:18` — top strip style (Phase 4)
- `__tests__/lib/fonts-css-sync.test.ts` — unit test pattern reference

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Updated gradient backdrops

#### Automated

- [x] 1.1 Type check + lint passes (`npm run lint`) — 95c39fe

#### Manual

- [x] 1.2 BackgroundPicker swatches show updated gradient colors — 95c39fe
- [x] 1.3 HandoutCard strips reflect updated gradients — 95c39fe
- [x] 1.4 Preview wrapper and share page background update — 95c39fe

### Phase 2: Border image assets

#### Automated

- [x] 2.1 Build passes with new files (`npm run build`) — 0f96fc0

#### Manual

- [x] 2.2 `/borders/fantasy-border.png` returns 200 in network tab — 0f96fc0
- [x] 2.3 `/borders/horror-border.png` returns 200 in network tab — 0f96fc0
- [x] 2.4 `/borders/scifi-border.png` returns 200 in network tab — 0f96fc0

### Phase 3: Per-category border-image CSS

#### Automated

- [x] 3.1 Lint passes (`npm run lint`) — 796ebe1

#### Manual

- [x] 3.2 Fantasy: parchment border + fill texture visible, sharp corners — 796ebe1
- [x] 3.3 Horror: newspaper border + fill texture visible, sharp corners — 796ebe1
- [x] 3.4 Scifi: CRT border + fill texture visible, sharp corners — 796ebe1
- [x] 3.5 Text readable on each themed card interior — 796ebe1
- [x] 3.6 Share view renders correctly for all three categories — 796ebe1
- [x] 3.7 BackgroundPicker and HandoutCard no visual regression — 796ebe1
- [x] 3.8 Mobile: border renders cleanly on narrow viewport — 796ebe1

### Phase 4: background-size on picker and card

#### Automated

- [x] 4.1 Lint passes (`npm run lint`) — a876574

#### Manual

- [x] 4.2 BackgroundPicker swatches identical to before — a876574
- [x] 4.3 HandoutCard strips identical to before — a876574

### Phase 5: Unit test

#### Automated

- [x] 5.1 `npm test -- --project unit` — all new tests green — 6c3b470
