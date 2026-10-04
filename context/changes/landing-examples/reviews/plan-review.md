<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Landing page examples implementation plan

- **Plan**: context/changes/landing-examples/plan.md
- **Mode**: Deep
- **Date**: 2026-10-04
- **Verdict**: SOUND
- **Findings**: 0 critical 2 warnings 0 observations

## Verdicts

| Dimension             | Verdict |
| --------------------- | ------- |
| End-State Alignment   | PASS    |
| Lean Execution        | PASS    |
| Architectural Fitness | PASS    |
| Blind Spots           | PASS    |
| Plan Completeness     | PASS    |

## Grounding

Grounding: 10/10 existing paths ✓ (`index.astro`, `Welcome.astro`, `share/[token].astro`, `backgrounds.ts`, `handout-renderer.ts`, `HandoutArticle.astro`, `global.css`, `middleware.ts`, `DashboardDrawer.tsx`, `app-version.test.ts`). Planned create paths `src/lib/landing-examples.ts` and `src/components/molecules/LandingExample.astro` are absent, as expected. Symbols: `BACKGROUND_CATEGORY_OPTIONS` order, `pathname === '/'`, `.moon-chrome article:not(.handout-article)`, `motion-reduce:animate-none`, `HandoutArticle` `class` prop ✓. brief↔plan ✓.

## Findings

### F1 — `max-w-none` does not override `max-w-2xl` on the Astro article

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Phase 1 LandingExample contract
- **Detail**: The plan tells LandingExample to pass `class="max-w-none"` into `HandoutArticle.astro`. That file uses `class:list` with a hard-coded `max-w-2xl`. `class:list` concatenates. It does not run `cn()`. Both width classes land in the DOM, and Tailwind source order decides the winner. In a three-column card the 60px category borders then eat most of the preview.
- **Fix A ⭐ Recommended**: Change `HandoutArticle.astro` so `max-w-2xl` is the fallback only when `class` is omitted. Landing passes `max-w-none`. Share page stays on the default.
  - Strength: Cards fill the column. Share page call sites stay unchanged.
  - Tradeoff: One shared molecule gains a default-vs-override rule.
  - Confidence: HIGH — the share page does not pass `class` today.
  - Blind spot: `HandoutArticle.tsx` is the editor twin and is out of this landing mount.
- **Fix B**: Leave the article at `max-w-2xl` and clip with overflow.
  - Strength: No shared-file edit.
  - Tradeoff: A 300px card would show mostly border.
  - Confidence: HIGH — 60px left plus 60px right is 120px of frame.
  - Blind spot: Phone border width is 24px, so mobile would look less broken than desktop.
- **Decision**: FIXED via Fix A

### F2 — Examples can nest inside the hero `max-w-4xl`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 Welcome mount
- **Detail**: Welcome wraps the hero in `mx-auto flex max-w-4xl flex-col`. The plan says to render the section after the CTA row inside the moon-chrome padding. An implementer can leave the grid inside that 56rem column. Three 60px-framed handouts then stay cramped.
- **Fix**: Place `data-landing-examples` as a sibling after the hero column, still inside the padded moon-chrome shell, with `max-w-6xl`.
- **Decision**: FIXED

## Triage

- F1: Fixed in plan via Fix A. `HandoutArticle.astro` keeps `max-w-2xl` only when `class` is omitted.
- F2: Fixed in plan. `data-landing-examples` is a sibling after the hero column with `max-w-6xl`.

Verdict after fixes: SOUND
