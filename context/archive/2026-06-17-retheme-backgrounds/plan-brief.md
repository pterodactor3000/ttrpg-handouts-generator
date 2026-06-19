# Retheme Backgrounds — Plan Brief

> Full plan: `context/changes/retheme-backgrounds/plan.md`
> Research: `context/changes/retheme-backgrounds/research.md`

## What & Why

Replace the current plain CSS gradient aesthetics with fully themed, artifact-like handout cards. Each category gets a `border-image` with `fill` so the HandoutArticle card renders as parchment scroll (fantasy), newspaper page (horror), or CRT monitor bezel (scifi) — not just a dark overlay. The outer background gradient is also updated to complement the border aesthetic.

## Starting Point

Three CSS gradient strings in `backgrounds.ts` drive all four callsites. The HandoutArticle card is a rounded, semi-transparent dark overlay (`border-radius: 1rem`, `background-color: var(--palette-overlay)`). S-07 wired per-category fonts and colors via `data-category`; border and background are untouched.

## Desired End State

A GM or player viewing any handout sees an immediately recognisable themed artifact: a parchment scroll for High Fantasy, a newspaper clipping for Eldritch, a glowing CRT screen for Grimdark. The border image frames the card and its `fill` covers the card interior with the textured surface. Text (S-07 fonts and colors) sits directly on the texture.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Background approach | CSS gradients updated + `border-image` added | Borders do the thematic heavy lifting; gradients set atmospheric context | Plan |
| Border rendering | `border-image` with `fill` keyword | Covers entire card (edges + interior) with themed texture; no dark overlay interruption | Plan |
| Border radius | Drop (`border-radius: 0`) for all three categories | Sharp corners suit parchment, newspaper, and CRT aesthetics | Plan |
| Overlay removal | `background-color: transparent` per category | `border-image fill` covers the interior; dark overlay would show through if kept | Plan |
| Asset sourcing | Stock/free images (Wikimedia Commons, OpenClipart) | No bespoke asset creation needed; plan specifies placement and requirements | Plan |
| `backgrounds.ts` shape | Unchanged (`{ label, cssBackground }`) | All 4 callsites already consume `cssBackground` as a plain CSS string; no callers need updating | Research |
| background-size on picker + card | Add `cover/center` to `BackgroundPicker` + `HandoutCard` | These two callsites lack it; future-proofs for any `url()` value in `cssBackground` | Research |
| Unit test | `backgrounds.ts` completeness test | Same pattern as `fonts-css-sync.test.ts`; guards against missing category entries | Plan |

## Scope

**In scope:**
- `backgrounds.ts` — update 3 `cssBackground` gradient values
- `global.css` — append 3 `border-image` blocks (one per category) after S-07 per-category rules
- `public/borders/` — 3 border image assets (fantasy, horror, scifi)
- `BackgroundPicker.tsx` and `HandoutCard.astro` — add `background-size: cover; background-position: center`
- `__tests__/lib/backgrounds.test.ts` — new unit test

**Out of scope:**
- Font or text color changes (S-07 output preserved exactly)
- `HandoutArticle` component prop or wiring changes
- DB or API changes
- E2E test changes
- Border on the no-category fallback (base card stays rounded and dark)

## Architecture / Approach

`backgrounds.ts` remains the single source of truth for the outer gradient backdrop. The themed card aesthetic is delivered entirely in `global.css` via per-category `border-image` rules appended after the S-07 font/color blocks. `border-image` with `fill` makes the card background a seamless extension of the border — one unified textured surface. The 4 existing callers of `backgrounds.ts` require no structural changes.

```
outer wrapper  →  updated CSS gradient (backgrounds.ts)
HandoutArticle →  border-image fill = themed texture (global.css)
               →  S-07 font + color via data-category (unchanged)
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Updated gradients | New backdrop colors in `backgrounds.ts` | Visually subtle — swatches and card strips should be spot-checked |
| 2. Border image assets | 3 PNG files in `public/borders/` | Asset quality varies by source; centre must be readable under S-07 text colors |
| 3. Border-image CSS | Themed card borders + fill in `global.css` | `border-image` slice/width values are image-specific — tuning required after assets are in place |
| 4. background-size fixes | Picker + card future-proofed | Cosmetically invisible for CSS gradients; purely defensive |
| 5. Unit test | `backgrounds.ts` completeness | None — straightforward |

**Prerequisites:** S-07 (`per-style-fonts`) archived ✓ — `data-category` prop on `HandoutArticle` and per-category CSS blocks already in place.

**Estimated effort:** ~2–3 sessions; Phase 2 (asset sourcing) is the human-gated step.

## Open Risks & Assumptions

- Asset centre readability: the `fill` centre slice must be light enough (fantasy/horror) or dark enough (scifi) for S-07 text colors to remain readable. Verify during Phase 3 manual QA.
- `border-image` slice tuning: starting values (`80 fill / 60px`) may need significant adjustment depending on the actual image's edge proportions. This is expected — plan accounts for it.
- `backdrop-filter: blur(12px)` from the base rule: with an opaque `border-image fill`, the blur has no visible effect on the card interior. If transparent edge regions in the asset cause unexpected blur artifacts, add `backdrop-filter: none` per category as a follow-up.

## Success Criteria (Summary)

- Each category's handout preview and share view renders as a distinct themed artifact (parchment / newspaper / CRT) recognisable without reading the label
- Text remains readable on all three card textures (S-07 font colors verified over new backgrounds)
- Mobile shared view renders correctly without overflow or layout break
