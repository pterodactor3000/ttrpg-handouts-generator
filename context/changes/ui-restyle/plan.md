# UI Restyle (S-05) Implementation Plan

## Overview

Apply a warm-dark visual identity across the four existing S-05 screens — dashboard, new-handout editor, in-editor preview, and shared read-only view — by first establishing a single palette/token foundation in `global.css`, then restyling each surface against it. The change is presentational only: no user flows change, no new screens are added, and the markdown rendering pipeline is untouched. A shared CSS-only loader replaces the existing ad-hoc loading affordances.

## Current State Analysis

The codebase runs two disconnected color systems:

- `src/styles/global.css:8–75` defines a full shadcn neutral **oklch** token set (`--primary`, `--accent`, `--destructive`, `--border`, …) for both `:root` and `.dark`. Only `button.tsx` and `dialog.tsx` consume it.
- The four screens hardcode a **"cosmic dark glass"** look — `bg-cosmic` (a hardcoded navy gradient at `global.css:115–117`), `bg-gray-950`/`bg-gray-900`, and `white/*` opacity glass + `purple-*`/`blue-*` accents. These bypass the token system entirely.

Key structural facts (from `research.md`):

- **Editor shell inconsistency**: `HandoutEditor.tsx` uses `bg-gray-950` while dashboard and the share error state use `bg-cosmic`.
- **No `src/components/ui/`**: shadcn primitives live in `src/components/atoms/` (`button.tsx`, `dialog.tsx`); `components.json` maps the shadcn alias to `@/components/atoms`.
- **Markdown rendering is shared but not componentized**: `renderHandoutHtml` (`src/lib/handout-renderer.ts`) feeds both the editor preview (`HandoutEditor.tsx:234–257`, `prose prose-invert prose-sm`) and the share page (`share/[token].astro:60–66`, `prose prose-invert`). The share page markup is fully inline; there is no shared component, and the preview/share `prose` scales differ (`prose-sm` vs full).
- **Loading states today**: `SubmitButton.tsx:20–24` has a Tailwind `animate-spin` spinner; `HandoutEditor.tsx` save/publish show text-only (`'Saving…'`/`'Publishing…'`); `CopyLinkButton.tsx` and `ShareDialog.tsx` do an async clipboard write with label-swap only. No `.loader` CSS exists yet — it's spec-only in `roadmap.md:147–168`.
- **`bg-cosmic` is used beyond the four screens**: also `share/not-found.astro` and the auth pages (`signin`/`signup`/`confirm-email`). Redefining the utility (rather than removing it) updates those backgrounds for free without markup edits.
- **Genre gradients in `src/lib/backgrounds.ts:3–19` are handout content**, not app chrome — out of scope, leave untouched.

### Key Discoveries:

- Single-source palette belongs in `global.css` `:root` + `@theme inline` (`src/styles/global.css:8–113`); aligning shadcn oklch tokens to the palette makes `button.tsx`/`dialog.tsx` inherit the restyle with no per-file edits.
- The roadmap loader CSS uses a `#c02942` accent (`roadmap.md:166`) that must be reconciled to the palette accent `#B2675E`.
- The loader's compatibility floor is `mask-composite: exclude` (Chrome 120+, Safari 15.4+); an `@supports` guard with a border-spinner fallback covers the rest (~97% coverage in 2026).
- Astro/React boundary: the editor preview is a React island; the share view is Astro SSR. A single component cannot serve both — parity must come from a shared CSS class layer.

## Desired End State

All four screens render in the warm-dark palette (`#5E5E5E` base, `#B2675E`/`#E3B5A4` accents, `#E3D5CA`/`#C6AC8F` neutrals, `#F7F7F7` text), driven by tokens defined once in `global.css`. The editor and dashboard share one app background. The editor preview and shared view are visually identical (same surface + prose styling) via a shared CSS class. A single `.loader` (with fallback) appears on all async states. `npm run lint`, type-check, and the existing unit/integration suites pass; no flow or content regressions.

Verify by: loading each screen in the browser, confirming palette consistency, triggering save/publish/copy to see the loader, and viewing a shared link on mobile width.

## What We're NOT Doing

- **No flow, routing, or markup-structure changes** beyond extracting the shared article wrapper (structure-preserving).
- **Not restyling `backgrounds.ts` genre gradients** — they are user-selected handout content.
- **Not changing the markdown pipeline** (`handout-renderer.ts`, sanitization, unified processor).
- **Not redesigning typography from scratch** — `prose-invert` stays; only its accent colors are tuned.
- **Not swapping the `github-dark` syntax-highlight theme.**
- **Not explicitly restyling `share/not-found.astro` or auth pages** — they inherit the redefined `bg-cosmic` automatically; no per-file edits.
- **Not adding new loading patterns** for dashboard fetch (SSR) or preview generation (synchronous `useMemo`) — these have no async state to attach a loader to.
- **Not touching `Welcome.astro`/`Topbar.astro`** (landing — outside S-05).

## Implementation Approach

Foundation-first. Phase 1 establishes the palette as the single source of truth in `global.css` (CSS vars, `@theme inline` mapping, aligned oklch tokens, redefined `bg-cosmic`, `.loader` CSS + fallback, and a shared article class layer). Phases 2–4 restyle each surface by swapping hardcoded classes to the new tokens/utilities — mostly class-string edits following existing patterns. Phase 5 wires the shared loader into every async state and does a cross-screen QA + browser-compat pass. Each phase is independently viewable in the browser, so regressions surface incrementally.

## Critical Implementation Details

- **Astro/React boundary for the shared article**: the editor preview lives inside the `HandoutEditor.tsx` React island and the share view is an Astro page. A single shared component is not possible across the boundary. The single source of truth is a CSS class layer (e.g. a `@utility`/component class for the article surface + a prose-accent rule) defined once in `global.css`; thin per-framework wrappers (`HandoutArticle.astro` for share, a small React block/`HandoutArticle.tsx` for the preview) apply the same class. Keep the preview at the same prose scale as share (drop the `prose-sm`/full-size divergence) for true parity.
- **Loader accent reconciliation**: the roadmap loader CSS uses `#c02942`; replace with the palette accent `#B2675E` when porting it into `global.css`.
- **`bg-cosmic` is shared chrome**: redefine its gradient to warm-dark palette values in place (keep the utility name) so `not-found` and auth pages update without markup edits. Do not delete the utility.
- **shadcn token alignment**: editor/dashboard dialogs currently *override* shadcn `bg-background` with `bg-gray-900`. Once `--primary`/`--background`/`--accent` are aligned to the palette, prefer removing those hard overrides so primitives theme centrally; verify dialogs still read correctly afterward.

## Phase 1: Token & palette foundation

### Overview

Establish the warm-dark palette as the single source of truth in `global.css`, add the shared loader, and define the shared article class layer. No screen markup changes yet — this phase is the substrate everything else consumes.

### Changes Required:

#### 1. Palette variables & token alignment

**File**: `src/styles/global.css`

**Intent**: Introduce the S-05 palette as named CSS variables and align the existing shadcn oklch tokens (`--primary`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`, `--background`, `--foreground`, `--muted*`, `--card*`, `--popover*`) for the dark theme to the warm-dark palette so `button.tsx`/`dialog.tsx` inherit the restyle. Body stays dark.

**Contract**: Add palette vars to `:root` (e.g. `--palette-primary: #5E5E5E; --palette-accent: #B2675E; --palette-accent-light: #E3B5A4; --palette-neutral-light: #E3D5CA; --palette-neutral-warm: #C6AC8F; --palette-font-light: #F7F7F7; --palette-font-dark: #333333;`). Map the dark-theme shadcn tokens (`.dark` block, and/or the base `:root` if the app renders dark by default) onto these values. Preserve the `@theme inline` var→Tailwind-name bridge (`src/styles/global.css:77–113`) so `bg-primary`, `text-accent`, etc. resolve to the palette.

#### 2. Semantic chrome utilities

**File**: `src/styles/global.css`

**Intent**: Add semantic utilities for the recurring chrome surfaces so screens reference intent, not raw colors — replacing the scattered `bg-white/10`, `border-white/10`, `bg-gray-950` usages.

**Contract**: Add `@utility` definitions (or `@theme` color tokens) for at least: app background (`bg-app`), card/surface (`bg-surface`, `border-surface`), and accent text/border helpers, all referencing the palette vars. Redefine the existing `@utility bg-cosmic` (`src/styles/global.css:115–117`) to a warm-dark gradient built from palette vars (do not remove it; `not-found` + auth pages depend on it).

#### 3. Shared loader

**File**: `src/styles/global.css`

**Intent**: Port the roadmap's CSS-only loader into a global `.loader` class, reconcile its accent to `#B2675E`, and guard it with an `@supports` fallback border-spinner for browsers lacking `mask-composite: exclude`.

**Contract**: Define `.loader` + `.loader:before` + `@keyframes` per `roadmap.md:149–174` with `#c02942` → `var(--palette-accent)`. Wrap the mask-based styles in `@supports (mask-composite: exclude) and (background: repeating-conic-gradient(red 0 5%, transparent 5% 50%))`; provide a border-spinner fallback (palette-colored) outside the guard. Snippet (non-obvious — feature-query + fallback contract):

```css
.loader {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 6px solid color-mix(in srgb, var(--palette-neutral-warm) 30%, transparent);
  border-top-color: var(--palette-accent);
  animation: loader-spin 1s linear infinite;
}
@keyframes loader-spin { to { transform: rotate(1turn); } }

@supports (mask-composite: exclude) and (background: repeating-conic-gradient(red 0 5%, transparent 5% 50%)) {
  .loader {
    /* full roadmap mask/blur loader; accent = var(--palette-accent) */
  }
}
```

#### 4. Shared article class layer

**File**: `src/styles/global.css`

**Intent**: Define one source of truth for the handout article surface and the warm prose-accent overrides, so the editor preview and share view can match via a shared class (the cross-framework parity mechanism).

**Contract**: Add a component/utility class (e.g. `.handout-article` for the dark glass surface) and a prose-accent rule scoping `prose-invert` link/heading/blockquote/`hr` colors to `var(--palette-accent)`/`var(--palette-accent-light)`. Keep `prose-invert` body text on the palette light font.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type checking passes (part of lint pipeline): `npm run lint`
- Unit tests pass: `npm test -- --project unit`
- Build succeeds: `npm run build`

#### Manual Verification:

- `bg-cosmic`-based pages (dashboard error, `not-found`, auth) now render warm-dark, not navy.
- A standalone `<div class="loader"></div>` renders the masked loader in a modern browser and the border-spinner fallback when `mask-composite` is force-disabled.
- shadcn `Button`/`Dialog` default variants visibly pick up the new palette.

---

## Phase 2: Shared content component & prose parity

### Overview

Extract the handout article surface into thin per-framework wrappers backed by the Phase 1 shared class, and apply the tuned warm prose accents. Aligns the editor preview and shared view to identical styling.

### Changes Required:

#### 1. Astro article wrapper (share view)

**File**: `src/components/molecules/HandoutArticle.astro` (new)

**Intent**: Encapsulate the shared-view article surface (container + `prose` wrapper around the rendered HTML) so the share page no longer carries inline surface classes.

**Contract**: Accepts `title: string` and pre-rendered `html: string` (rendering stays in the page/`handout-renderer.ts`; the component does not render markdown). Applies the Phase 1 `.handout-article` class + `prose prose-invert max-w-none`. Renders the sanitized HTML via `<Fragment set:html={...}>` preserving the existing `eslint-disable astro/no-set-html-directive` boundary comment from `share/[token].astro:63–65`. Per `src/AGENTS.md`, use a named export and `class:list` for conditional classes.

#### 2. Wire share page to the wrapper

**File**: `src/pages/share/[token].astro`

**Intent**: Replace the inline `<article>`/`prose` block (lines 60–67) with `<HandoutArticle title={...} html={renderedHtml} />`; leave the full-page background `style` and footer as-is.

**Contract**: Import from `@/components/molecules/HandoutArticle.astro`. The success-branch markup delegates the article surface to the component; data fetching and `pageBackground` unchanged.

#### 3. Editor preview parity

**File**: `src/components/organisms/HandoutEditor.tsx`

**Intent**: Apply the same `.handout-article` surface + prose classes to the preview column so it matches the share view; drop the `prose-sm` divergence in favor of the shared scale.

**Contract**: Preview column (`HandoutEditor.tsx:234–257`) uses the shared class layer (and `cn()` per repo rule for any conditional classes). Replace the hardcoded `#1a1a2e` fallback (`:240`) with a palette var. Keep `dangerouslySetInnerHTML` + `renderedPreview` wiring intact. Optionally factor the preview block into a small `HandoutArticle.tsx` if it reduces duplication — not required for parity (the shared CSS class is the source of truth).

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Unit tests pass: `npm test -- --project unit`
- Build succeeds: `npm run build`

#### Manual Verification:

- A shared link renders identically (surface, spacing, link/heading colors) to the editor preview for the same content.
- Markdown links, headings, blockquotes, lists, and code blocks render with warm accents and remain legible over each genre background.
- No XSS regression — rendered HTML is still sanitized (existing `handout-renderer` tests cover this).

---

## Phase 3: Dashboard restyle

### Overview

Restyle the dashboard surface and its components to the new tokens, with a typography/spacing pass. Pure class-string edits.

### Changes Required:

#### 1. Dashboard page

**File**: `src/pages/dashboard.astro`

**Intent**: Swap `bg-cosmic`/`white-*`/`purple-*`/`blue-*` classes (header, welcome text, CTAs, error/empty states at lines 37–100) to the Phase 1 app background + surface/accent tokens; tighten typography and spacing.

**Contract**: Replace gradient-clip heading (`from-blue-200 to-purple-200`) with the palette accent treatment; CTA panels use accent tokens; cards/panels use `bg-surface`/`border-surface`. Sign-out form and links keep their structure.

#### 2. Handout list & card

**File**: `src/components/organisms/HandoutList.astro`, `src/components/molecules/HandoutCard.astro`

**Intent**: Move card glass surfaces, title hover accent, and tag styling onto the palette tokens.

**Contract**: `HandoutCard.astro` title-link hover uses `var(--palette-accent-light)` equivalents; card surface uses `bg-surface`/`border-surface`. Genre gradient strip (from `backgrounds.ts`) unchanged.

#### 3. Status badge & copy button atoms

**File**: `src/components/atoms/StatusBadge.astro`, `src/components/atoms/CopyLinkButton.tsx`

**Intent**: Re-tone the draft/published/archived pills and the copy-link button to the palette while keeping semantic differentiation (draft vs published still visually distinct).

**Contract**: `StatusBadge.astro` keeps three distinct states but re-toned within the palette (use `class:list`); `CopyLinkButton.tsx` uses `cn()` and palette classes. Copy-button success state (`'Copied!'`) stays clearly affirmative.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Unit tests pass: `npm test -- --project unit`
- Build succeeds: `npm run build`

#### Manual Verification:

- Dashboard (populated, empty, and error states) renders fully on-palette with no leftover navy/purple.
- Status badges remain distinguishable at a glance.
- Layout/spacing holds at mobile and desktop widths.

---

## Phase 4: Editor restyle

### Overview

Restyle the editor organism and its molecules, unifying the editor shell with the app background and re-toning form controls and dialogs.

### Changes Required:

#### 1. Editor shell & form controls

**File**: `src/components/organisms/HandoutEditor.tsx`

**Intent**: Replace `bg-gray-950` shell with the shared app background; re-tone inputs/textarea (`border-white/20 bg-white/5`), labels, and error text (`text-red-400`) to palette tokens; spacing pass.

**Contract**: Shell uses `bg-app`; inputs use `bg-surface`/`border-surface` with palette focus ring; error text uses `text-destructive` (now palette-aligned). Use `cn()` for conditional classes. Save/publish button structure unchanged (loader wiring is Phase 5).

#### 2. Editor molecules

**File**: `src/components/molecules/BackgroundPicker.tsx`, `src/components/molecules/TagsInput.tsx`

**Intent**: Re-tone the background swatch selected-state ring and the tag chips/input to the palette.

**Contract**: `BackgroundPicker.tsx` selected ring (`ring-white` / `ring-offset-gray-950`) → palette accent ring + app-bg offset. `TagsInput.tsx` chips and placeholder use palette surface/text tokens. Swatch background previews (from `backgrounds.ts`) unchanged.

#### 3. Share dialog & dialog overrides

**File**: `src/components/organisms/ShareDialog.tsx`

**Intent**: Remove the hard `bg-gray-900 text-white` dialog overrides so the dialog themes from the Phase 1 tokens; re-tone the copy/success states to the palette.

**Contract**: Drop `border-white/10 bg-gray-900 text-white` overrides where the aligned shadcn `Dialog` tokens now suffice; copy-success styling re-toned within palette. Verify the discard-changes `Dialog` in `HandoutEditor.tsx` reads correctly after override removal.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Unit tests pass: `npm test -- --project unit`
- Build succeeds: `npm run build`

#### Manual Verification:

- Editor shell matches the dashboard background (no more `bg-gray-950` mismatch).
- Background picker selection, tag chips, inputs, and both dialogs (discard + share) render on-palette and remain legible.
- Inputs show a visible palette focus ring.

---

## Phase 5: Loader wiring & cross-screen QA

### Overview

Wire the shared `.loader` into every async state and run a full cross-screen visual + responsive + browser-compat pass.

### Changes Required:

#### 1. Editor save/publish loader

**File**: `src/components/organisms/HandoutEditor.tsx`

**Intent**: Show the `.loader` during `isSaving`/`isPublishing` instead of (or alongside) the text-only `'Saving…'`/`'Publishing…'`.

**Contract**: Render `<span className="loader" />` (sized down for inline button use) gated on `isSaving`/`isPublishing` (`HandoutEditor.tsx:42–44, 205–214`); keep `disabled` behavior. The loader may need a small-size modifier class from Phase 1.

#### 2. Auth submit loader

**File**: `src/components/atoms/SubmitButton.tsx`

**Intent**: Replace the `animate-spin` border spinner (`:20–24`) with the shared `.loader` so the whole app uses one loader.

**Contract**: Swap the spinner span for the `.loader` (small variant); keep `useFormStatus().pending` gating and `pendingText`. `SignInForm`/`SignUpForm` inherit automatically.

#### 3. Clipboard copy loaders (minimal)

**File**: `src/components/atoms/CopyLinkButton.tsx`, `src/components/organisms/ShareDialog.tsx`

**Intent**: Show a brief, non-flickering loader during the async clipboard write.

**Contract**: Gate a small `.loader` on the in-flight clipboard promise; because writes are near-instant, keep it minimal (e.g. only the label area swaps) to avoid flicker. Existing `'Copied!'`/`'Copy failed'` label logic unchanged.

#### 4. Cross-screen QA pass

**File**: (no new file — verification across all restyled files)

**Intent**: Confirm palette consistency, responsiveness, and loader compatibility across all four screens.

**Contract**: Manual sweep; no code unless a regression is found.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Unit tests pass: `npm test -- --project unit`
- Integration tests pass: `npm test -- --project integration`
- Build succeeds: `npm run build`

#### Manual Verification:

- The same loader appears on editor save/publish, sign-in/sign-up submit, and clipboard copy.
- Loader renders via the masked version in a current browser and the fallback when `mask-composite` is unsupported.
- All four screens are visually consistent and on-palette at mobile and desktop widths.
- No regression in the shipped S-01 create→preview→share flow.

---

## Testing Strategy

### Unit Tests:

- Existing component tests (e.g. `StatusBadge`, `CopyLinkButton`, `HandoutEditor`, `handout-renderer`) must continue to pass; update only assertions that pin specific legacy color classes.
- If `HandoutArticle.astro` carries logic worth testing, add a focused test; pure-presentational wrappers may be omitted per `src/AGENTS.md` (note the reason).

### Integration Tests:

- Existing middleware/auth and handout API/integration suites must remain green — this change is presentational and should not affect them.

### Manual Testing Steps:

1. Sign in; confirm dashboard (populated + empty) is on-palette and responsive.
2. Create a handout; confirm editor shell matches dashboard, controls/dialogs are on-palette, save/publish shows the loader.
3. Confirm the editor preview matches the shared link view for identical content.
4. Open a shared link on mobile width; confirm article surface, prose accents, and footer.
5. Hit an unknown share token; confirm `not-found` renders warm-dark (inherited `bg-cosmic`).
6. Force-disable `mask-composite` (or test an older browser) and confirm the fallback loader.

## Performance Considerations

Pure CSS/markup restyle — no runtime cost beyond an additional always-present `@import` (already present) and the loader animation (GPU-friendly). The loader's `filter: blur` + `mask` are cheap at this size and only mount during async states.

## Migration Notes

No data or schema changes. `bg-cosmic` is redefined in place (not removed), so all existing references migrate transparently. No rollback steps beyond reverting the commits.

## References

- Related research: `context/changes/ui-restyle/research.md`
- Roadmap spec (palette + loader): `context/foundation/roadmap.md:132–178`
- Token foundation: `src/styles/global.css:8–117`
- Share view to refactor: `src/pages/share/[token].astro:53–96`
- Editor preview: `src/components/organisms/HandoutEditor.tsx:234–257`
- Existing loader to replace: `src/components/atoms/SubmitButton.tsx:20–24`
- Atomic design + class rules: `src/AGENTS.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Token & palette foundation

#### Automated

- [x] 1.1 Linting passes: `npm run lint` — 8204595
- [x] 1.2 Unit tests pass: `npm test -- --project unit` — 8204595
- [x] 1.3 Build succeeds: `npm run build` — 8204595

#### Manual

- [x] 1.4 `bg-cosmic` pages render warm-dark, not navy — 8204595
- [x] 1.5 Standalone `.loader` renders masked version + fallback when mask disabled — 8204595
- [x] 1.6 shadcn Button/Dialog defaults pick up the new palette — 8204595

### Phase 2: Shared content component & prose parity

#### Automated

- [x] 2.1 Linting passes: `npm run lint` — 5831a32
- [x] 2.2 Unit tests pass: `npm test -- --project unit` — 5831a32
- [x] 2.3 Build succeeds: `npm run build` — 5831a32

#### Manual

- [x] 2.4 Shared link renders identically to editor preview for same content — 5831a32
- [x] 2.5 Markdown elements render with warm accents, legible over each background — 5831a32
- [x] 2.6 No XSS regression — rendered HTML still sanitized — 5831a32

### Phase 3: Dashboard restyle

#### Automated

- [x] 3.1 Linting passes: `npm run lint` — 409b398
- [x] 3.2 Unit tests pass: `npm test -- --project unit` — 409b398
- [x] 3.3 Build succeeds: `npm run build` — 409b398

#### Manual

- [x] 3.4 Dashboard (populated/empty/error) fully on-palette — 409b398
- [x] 3.5 Status badges remain distinguishable — 409b398
- [x] 3.6 Layout holds at mobile and desktop widths — 409b398

### Phase 4: Editor restyle

#### Automated

- [x] 4.1 Linting passes: `npm run lint`
- [x] 4.2 Unit tests pass: `npm test -- --project unit`
- [x] 4.3 Build succeeds: `npm run build`

#### Manual

- [x] 4.4 Editor shell matches dashboard background
- [x] 4.5 Picker, chips, inputs, and both dialogs on-palette and legible
- [x] 4.6 Inputs show a visible palette focus ring

### Phase 5: Loader wiring & cross-screen QA

#### Automated

- [ ] 5.1 Linting passes: `npm run lint`
- [ ] 5.2 Unit tests pass: `npm test -- --project unit`
- [ ] 5.3 Integration tests pass: `npm test -- --project integration`
- [ ] 5.4 Build succeeds: `npm run build`

#### Manual

- [ ] 5.5 Same loader on editor save/publish, auth submit, and clipboard copy
- [ ] 5.6 Loader masked version + fallback both verified
- [ ] 5.7 All four screens consistent and on-palette at mobile and desktop
- [ ] 5.8 No regression in S-01 create→preview→share flow
