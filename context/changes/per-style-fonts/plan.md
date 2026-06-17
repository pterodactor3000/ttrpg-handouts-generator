# Per-Style Fonts Implementation Plan

## Overview

Add per-category font families and text colors to the handout rendering pipeline. Each of the three `BackgroundCategory` values (`fantasy` / `scifi` / `horror`) gets a preset self-hosted font and text color applied consistently in both the GM preview and the shared player view. This also corrects the display labels for `scifi` and `horror`, which were swapped from their intended themes.

## Current State Analysis

- `HandoutArticle` (both `.tsx` and `.astro`) accept only `title` and `html` — no category awareness. All category-specific styling today lives in the parent wrappers.
- `backgrounds.ts` maps category → CSS gradient background. No font or color config exists.
- Three font files already committed to `public/fonts/`: `Glendora.otf`, `Metalick.ttf`, `Consul Typewriter.ttf`. No `@font-face` declarations yet.
- `global.css` owns all prose overrides (`.handout-article .prose-invert`). Per-category overrides must go here too.
- Display labels in `backgrounds.ts` are currently wrong: `horror` shows "Grimdark" and `scifi` shows "Post-Apocalyptic". The intended themes are the reverse.

### Key Discoveries

- `src/lib/backgrounds.ts:3-19` — `BACKGROUND_CONFIGS` is the only category-to-style map. Font config will live in a new parallel file `src/lib/fonts.ts`.
- `src/components/molecules/HandoutArticle.tsx:4-9` — Props: `{ title, html, className?, emptyPlaceholder? }`. No `category` prop yet.
- `src/components/molecules/HandoutArticle.astro:2-6` — Props: `{ title, html, class? }`. No `category` prop yet.
- `HandoutEditor.tsx:272-279` — Passes `HandoutArticle` inside preview wrapper. `backgroundCategory` state is available at `HandoutEditor.tsx:45`.
- `src/pages/share/[token].astro:63` — `<HandoutArticle title={handout.title} html={renderedHtml} />`. `handout.background_category` is available in scope.
- `global.css:242-278` — `.handout-article` base styles + `.handout-article .prose-invert` color overrides. Per-category selectors `.handout-article[data-category="X"]` will have higher specificity and correctly override these.
- `HandoutCard.astro:19,39` — Renders `backgroundConfig.label` as a tooltip and visible text. Label fix in `backgrounds.ts` flows here automatically, no change needed.
- `e2e/seed.spec.ts:6` — Clicks `'High Fantasy'` label. Unchanged (`fantasy` → 'High Fantasy' is kept). No E2E references to 'Grimdark' or 'Post-Apocalyptic' labels — no E2E fixes needed.
- No DB migration required — `BackgroundCategory` enum values (`fantasy`, `horror`, `scifi`) are unchanged. Only application-layer labels and styling change.

## Desired End State

1. Visiting `/handouts/new`, selecting a category and clicking Generate shows the handout article panel in the category's font and color.
2. Visiting `/share/<token>` for a handout renders the article in the correct font and color for that handout's saved category.
3. The category picker in the new-handout form shows the corrected labels: "Grimdark" (scifi), "Eldritch" (horror), "High Fantasy" (fantasy).
4. The dashboard card subtitle and swatch tooltip reflect the corrected labels.
5. All unit tests pass. No E2E regressions.

### Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Font loading | Self-hosted TTF/OTF from `public/fonts/` | Files already committed; no CDN dependency; meets < 5s NFR |
| CSS architecture | `data-category` attribute + CSS selectors | CSS-only theming, no inline styles, consistent with existing prose overrides in `global.css` |
| Font config location | New `src/lib/fonts.ts` | Keeps font config separate from background config; testable contract |
| Scope of font | Both `<h1>` title and prose body | Fully cohesive look; h1 is most visible element |
| Font fallbacks | Category-appropriate generics | Fantasy → serif, Grimdark → monospace, Eldritch → sans-serif |
| Label correction | Swap `scifi` ↔ `horror` labels | `scifi` = Grimdark theme, `horror` = Eldritch/newspaper theme — current labels were reversed |

## What We're NOT Doing

- No DB migration — enum values `fantasy`, `horror`, `scifi` are identifiers, not user-visible strings.
- No WOFF2 conversion — TTF/OTF served directly; conversion is a future optimization.
- No background gradient changes — that is S-09 (`retheme-backgrounds`).
- No per-category link or code-block color overrides — prose accent colors stay as the S-05 palette defaults.
- No font size changes — only font family and text color.
- No user font selection — fonts are preset per category.

## Implementation Approach

1. Register fonts via `@font-face` in `global.css`.
2. Create `src/lib/fonts.ts` as the typed config mapping category → font name + color.
3. Correct the two swapped labels in `backgrounds.ts`.
4. Add CSS rules in `global.css` scoped to `.handout-article[data-category="X"]` overriding `font-family`, `color` (for h1 and base text), and `--tw-prose-body` / `--tw-prose-headings` / `--tw-prose-bold` (for prose body).
5. Add `category?: BackgroundCategory` prop to both `HandoutArticle` variants; render it as `data-category` on the `<article>` element.
6. Wire callers: `HandoutEditor.tsx` and `[token].astro`.
7. Unit-test `fonts.ts` config completeness and `HandoutArticle.tsx` attribute rendering.

## Critical Implementation Details

- **`HandoutEditor.tsx` `backgroundCategory` is `BackgroundCategory | null`** (null before user selects). Pass `backgroundCategory ?? undefined` to the `category` prop to avoid `data-category="null"` in the DOM.
- **CSS specificity:** `.handout-article[data-category="X"] .prose-invert` (attribute selector = 0,2,0) beats `.handout-article .prose-invert` (two classes = 0,2,0 — same specificity, source order wins). Place per-category rules **after** the base `.handout-article .prose-invert` block in `global.css` to ensure override via cascade order.
- **Dual-component parity:** Every prop and CSS change must land in both `HandoutArticle.tsx` and `HandoutArticle.astro`. The Astro variant uses `class:list` (not `cn()`); the React variant uses `cn()`. Both use the same `.handout-article` class and the same `data-category` attribute.

---

## Phase 1: Font registration and config

### Overview

Register the three self-hosted fonts via `@font-face` in `global.css`. Create `src/lib/fonts.ts` as the typed config for category → font family + color. Fix the swapped display labels in `backgrounds.ts`.

### Changes Required

#### 1. Font face declarations

**File:** `src/styles/global.css`

**Intent:** Register the three font families so CSS can reference them by name. Place declarations near the top of the file, after the existing `@import` statements.

**Contract:** Three `@font-face` blocks:
- `font-family: 'Glendora'` — `src: url('/fonts/Glendora.otf') format('opentype')`
- `font-family: 'Metalick'` — `src: url('/fonts/Metalick.ttf') format('truetype')`
- `font-family: 'Consul Typewriter'` — `src: url('/fonts/Consul Typewriter.ttf') format('truetype')`

Each with `font-display: swap` to prevent invisible text during load.

#### 2. Font config

**File:** `src/lib/fonts.ts` (new file)

**Intent:** Typed map of `BackgroundCategory` → `{ fontFamily, fontColor }`. Single source of truth that makes the font names and colors testable and discoverable without parsing CSS.

**Contract:**
```typescript
interface FontConfig {
  fontFamily: string; // full CSS font-family value including fallback
  fontColor: string;  // hex color for text
}

const FONT_CONFIGS: Record<BackgroundCategory, FontConfig> = {
  fantasy: { fontFamily: "'Glendora', serif",               fontColor: '#2c1810' },
  scifi:   { fontFamily: "'Metalick', monospace",            fontColor: '#39ff14' },
  horror:  { fontFamily: "'Consul Typewriter', sans-serif",  fontColor: '#1a1812' },
};
```

Export `FontConfig` type and `FONT_CONFIGS` constant. Follow the exports-at-end-of-file lesson.

#### 3. Label corrections

**File:** `src/lib/backgrounds.ts`

**Intent:** Fix the swapped display labels so `scifi` shows "Grimdark" and `horror` shows "Eldritch". The `fantasy` label "High Fantasy" is unchanged.

**Contract:** Update `BACKGROUND_CONFIGS`:
- `scifi.label`: `'Post-Apocalyptic'` → `'Grimdark'`
- `horror.label`: `'Grimdark'` → `'Eldritch'`

### Success Criteria

#### Automated Verification

- Type check passes: `npm run lint`
- Build passes: `npm run build` (fonts are served from `public/fonts/` as static assets)
- `FONT_CONFIGS` keys cover all 3 `BackgroundCategory` values (verified by unit test in Phase 3)

#### Manual Verification

- Opening `/handouts/new` and inspecting network tab: `GET /fonts/Glendora.otf` (and the other two) returns 200
- Category picker in new-handout form shows "High Fantasy", "Grimdark", "Eldritch" labels (corrected)
- Dashboard card subtitle shows corrected labels for existing handouts

**Implementation Note:** After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Per-category CSS rules

### Overview

Add CSS selectors in `global.css` that apply font family and text color based on the `data-category` attribute on `.handout-article`. These selectors override the base `.handout-article` color and the prose `--tw-prose-*` variables set by S-05.

### Changes Required

#### 1. Per-category CSS blocks

**File:** `src/styles/global.css`

**Intent:** Three CSS blocks, one per category, each scoped to `.handout-article[data-category="X"]`. They must appear in the file **after** the existing `.handout-article .prose-invert` block (around line 253) so source order ensures they win when specificity ties.

**Contract:** Each block sets:
- `font-family` on the article element (inherited by `<h1>` and prose body)
- `color` on the article element (overrides the base `--palette-font-light` for the `<h1>`)
- On the nested `.prose-invert`: override `--tw-prose-body`, `--tw-prose-headings`, `--tw-prose-bold`, `--tw-prose-lead`, `--tw-prose-quotes` with the category color

Values from `FONT_CONFIGS`:

| Selector | `font-family` | `color` / prose vars |
|---|---|---|
| `[data-category="fantasy"]` | `'Glendora', serif` | `#2c1810` |
| `[data-category="scifi"]` | `'Metalick', monospace` | `#39ff14` |
| `[data-category="horror"]` | `'Consul Typewriter', sans-serif` | `#1a1812` |

### Success Criteria

#### Automated Verification

- Lint passes: `npm run lint`

#### Manual Verification

- Selecting "High Fantasy" in the new-handout editor and clicking Generate: article panel text renders in Glendora font, dark sepia color
- Selecting "Grimdark" and generating: article renders in Metalick, neon green
- Selecting "Eldritch" and generating: article renders in Consul Typewriter, cream color
- H1 title and prose body both use the category font and color

**Implementation Note:** After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: HandoutArticle props and caller wiring

### Overview

Add `category?: BackgroundCategory` to both `HandoutArticle` variants. Render it as `data-category` on the `<article>` element. Update `HandoutEditor.tsx` and `[token].astro` to pass the category down.

### Changes Required

#### 1. HandoutArticle React variant

**File:** `src/components/molecules/HandoutArticle.tsx`

**Intent:** Accept `category` and forward it as a `data-category` DOM attribute so the CSS selectors from Phase 2 activate.

**Contract:** Add `category?: BackgroundCategory` to `HandoutArticleProps`. Spread it as `data-category={category}` on the `<article>` element. Import `BackgroundCategory` from `@/types`. When `category` is `undefined`, the attribute is omitted — correct fallback behaviour.

#### 2. HandoutArticle Astro variant

**File:** `src/components/molecules/HandoutArticle.astro`

**Intent:** Mirror the React variant — accept `category` and render `data-category` on `<article>`.

**Contract:** Add `category?: BackgroundCategory` to the `Props` interface. Render `data-category={category}` on the `<article>` element. Import `BackgroundCategory` from `@/types`. Use `class:list` (not `cn()`) per the Astro atoms lesson.

#### 3. Wire caller — HandoutEditor

**File:** `src/components/organisms/HandoutEditor.tsx`

**Intent:** Pass the currently-selected background category into `HandoutArticle` so the preview reflects the category font.

**Contract:** On the `<HandoutArticle>` at line 272, add `category={backgroundCategory ?? undefined}`. `backgroundCategory` is typed `BackgroundCategory | null` — the `?? undefined` coercion prevents `data-category="null"` in the DOM.

#### 4. Wire caller — share view

**File:** `src/pages/share/[token].astro`

**Intent:** Pass the handout's saved category into `HandoutArticle` so the player view renders with the correct font.

**Contract:** On the `<HandoutArticle>` at line 63, add `category={handout.background_category}`.

### Success Criteria

#### Automated Verification

- Type check + lint: `npm run lint`
- Unit tests pass (Phase 4): `npm test -- --project unit`

#### Manual Verification

- GM preview: selecting a category in the new-handout form immediately reflects font change in the article panel upon Generate
- Share view: opening a published handout via `/share/<token>` in a browser shows the correct font for that handout's category
- No category selected (editor initial state): article panel shows no `data-category` attribute, falls back to default palette font

**Implementation Note:** After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 4: Unit tests

### Overview

Two unit test files: one for the `FONT_CONFIGS` contract, one for `HandoutArticle.tsx` attribute rendering.

### Changes Required

#### 1. Font config tests

**File:** `src/lib/__tests__/fonts.test.ts` (new file)

**Intent:** Verify `FONT_CONFIGS` covers all three categories, each entry has a non-empty `fontFamily` and `fontColor`, and `fontFamily` strings reference the correct font names registered in `@font-face`.

**Contract:** Tests assert:
- `Object.keys(FONT_CONFIGS)` equals `['fantasy', 'scifi', 'horror']`
- Each entry's `fontFamily` is a non-empty string containing the expected font name (`'Glendora'`, `'Metalick'`, `'Consul Typewriter'`)
- Each entry's `fontColor` matches the expected hex value

#### 2. HandoutArticle rendering tests

**File:** `src/components/molecules/__tests__/HandoutArticle.test.tsx` (new file)

**Intent:** Verify the `category` prop renders as `data-category` on the `<article>` element for all three categories and is absent when `category` is `undefined`.

**Contract:**
- 3 tests: render with `category="fantasy"`, `"scifi"`, `"horror"` → expect `article` element to have matching `data-category` attribute
- 1 test: render without `category` prop → expect `article` to have no `data-category` attribute

Follows the TSX test lesson: add `@vitejs/plugin-react` to `vitest.config.ts` if not already present.

### Success Criteria

#### Automated Verification

- `npm test -- --project unit` passes with all new tests green

#### Manual Verification

- (none — fully automated)

**Implementation Note:** After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests

- `src/lib/__tests__/fonts.test.ts` — `FONT_CONFIGS` completeness and correctness
- `src/components/molecules/__tests__/HandoutArticle.test.tsx` — `data-category` attribute rendering, all 3 categories + undefined case

### Manual Testing Steps

1. Start dev server: `npm run dev`
2. Log in, open `/handouts/new`
3. Type any markdown, select "High Fantasy" → click Generate → confirm Glendora font and dark sepia text
4. Select "Grimdark" → Generate → confirm Metalick font and neon green text
5. Select "Eldritch" → Generate → confirm Consul Typewriter font and cream text
6. Create and publish a handout for each category; open `/share/<token>` for each → confirm fonts match
7. Dashboard: confirm category labels show "High Fantasy", "Grimdark", "Eldritch" under each card

## References

- Linear issue: [TEC-15](https://linear.app/tech-heresy/issue/TEC-15)
- Roadmap: `context/foundation/roadmap.md` § S-07
- Background config: `src/lib/backgrounds.ts`
- Global CSS: `src/styles/global.css:242-278` (existing prose overrides — per-category rules go after this block)
- Both HandoutArticle variants: `src/components/molecules/HandoutArticle.tsx`, `src/components/molecules/HandoutArticle.astro`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Font registration and config

#### Automated

- [x] 1.1 Type check + build passes (`npm run lint && npm run build`) — 84d18ee

#### Manual

- [x] 1.2 Font files return 200 in network tab — 84d18ee
- [x] 1.3 Category picker shows corrected labels (High Fantasy / Grimdark / Eldritch) — 84d18ee
- [x] 1.4 Dashboard cards show corrected labels — 84d18ee

### Phase 2: Per-category CSS rules

#### Automated

- [x] 2.1 Lint passes (`npm run lint`) — 5636e7d

#### Manual

- [x] 2.2 High Fantasy → Glendora font + dark sepia in preview — 5636e7d
- [x] 2.3 Grimdark → Metalick font + neon green in preview — 5636e7d
- [x] 2.4 Eldritch → Consul Typewriter font + cream in preview — 5636e7d
- [x] 2.5 H1 title and prose body both use category font + color — 5636e7d

### Phase 3: HandoutArticle props and caller wiring

#### Automated

- [x] 3.1 Lint + type check pass (`npm run lint`)
- [ ] 3.2 Unit tests pass (`npm test -- --project unit`)

#### Manual

- [x] 3.3 GM preview reflects font on Generate with correct category
- [x] 3.4 Share view shows correct font for each published category
- [x] 3.5 No category selected → no `data-category` attribute, default font applied

### Phase 4: Unit tests

#### Automated

- [ ] 4.1 `npm test -- --project unit` — all new tests green
