---
date: 2026-06-09T13:01:00+02:00
researcher: Claude (Sonnet 4.6)
git_commit: bcf275e
branch: feature/S-05-ui-restyle
repository: ttrpg-handouts-generator
topic: "S-05 UI restyle — affected screens, color audit, loading states, browser compat"
tags: [research, ui-restyle, tailwind, components, colors, loading, browser-compat]
status: complete
last_updated: 2026-06-09
last_updated_by: Claude (Sonnet 4.6)
---

# Research: S-05 UI Restyle

**Date**: 2026-06-09T13:01:00+02:00
**Researcher**: Claude (Sonnet 4.6)
**Git Commit**: bcf275e
**Branch**: feature/S-05-ui-restyle
**Repository**: ttrpg-handouts-generator

## Research Question

Map the 4 screens in scope for S-05 (dashboard, new-handout editor, preview, shared view): their component trees, current color/Tailwind usage, all async loading states, and browser compatibility for the planned CSS-only loader.

## Summary

S-05 is a cross-cutting visual change touching ~12 component files plus `global.css`. The current aesthetic is "cosmic dark glass" (deep navy `bg-cosmic`, white/opacity glassmorphism, purple/blue gradients). The new palette swaps all of this for a warm neutral scheme (`#5E5E5E`/`#B2675E`/`#E3D5CA`). The highest-impact structural issue is that the editor shell uses `bg-gray-950` instead of `bg-cosmic`, creating an inconsistency that S-05 must unify. The CSS-only loader is safe to ship with a `@supports` fallback covering the ~3–4% of sessions on older browsers. Three React components have existing loading UX to replace; the roadmap's "dashboard fetch" loader requires a new client-side pattern that does not exist today.

---

## Detailed Findings

### 1. Screen map and component trees

#### Dashboard (`src/pages/dashboard.astro`)
- Layout: `src/layouts/Layout.astro`
- Page is pure Astro SSR with one React island: `CopyLinkButton` (`client:idle`) inside `HandoutCard.astro`
- Component tree:
  ```
  dashboard.astro
  └── HandoutList.astro (src/components/organisms/HandoutList.astro)
      └── HandoutCard.astro (src/components/molecules/HandoutCard.astro)
          ├── StatusBadge.astro (src/components/atoms/StatusBadge.astro)
          └── CopyLinkButton.tsx (src/components/atoms/CopyLinkButton.tsx) [client:idle]
              └── button.tsx (shadcn)
  ```
- Header, welcome text, CTA, error/empty states are all **inline** in `dashboard.astro:37–100` (no sub-component)

#### New-handout editor (`src/pages/handouts/new.astro`)
- Layout: `src/layouts/Layout.astro`
- Full React island: `HandoutEditor` (`client:load`)
- Component tree:
  ```
  handouts/new.astro
  └── HandoutEditor.tsx (src/components/organisms/HandoutEditor.tsx) [client:load]
      ├── BackgroundPicker.tsx (src/components/molecules/BackgroundPicker.tsx)
      ├── TagsInput.tsx (src/components/molecules/TagsInput.tsx)
      ├── ShareDialog.tsx (src/components/organisms/ShareDialog.tsx)
      │   ├── button.tsx (shadcn)
      │   └── dialog.tsx (shadcn)
      ├── button.tsx (shadcn) — variants: ghost, default, outline, destructive
      └── dialog.tsx (shadcn) — discard-changes confirm
  ```
- Native `<input>` / `<textarea>` styled with Tailwind (not shadcn inputs)

#### Preview (embedded — no dedicated route)
- Lives in `HandoutEditor.tsx:234–257` (right column of the editor)
- Rendering pipeline: `src/lib/handout-renderer.ts` (`renderHandoutHtml`) via `useMemo`
- Synchronous — no async loading state today
- Background from `src/lib/backgrounds.ts` (`BACKGROUND_CONFIGS`); fallback hex `#1a1a2e` (`HandoutEditor.tsx:240`)
- Markup: `prose prose-invert prose-sm` over a `bg-black/40 backdrop-blur-sm` overlay
- Parity target: shared view uses the same renderer with `prose prose-invert` (full size, no `prose-sm`)

#### Shared read-only view (`src/pages/share/[token].astro`)
- Layout: `src/layouts/Layout.astro`
- Pure Astro SSR (`export const prerender = false`)
- **No component imports** — all markup is inline (lines 56–94)
- Public route (outside `PROTECTED_ROUTES` in `middleware.ts:7`)
- Article card: `border-white/10 bg-black/55 text-white backdrop-blur-md`
- Error branch reuses `bg-cosmic` glass-card pattern

#### `src/components/` structure (Atomic Design)
| Tier | Files | S-05 relevant |
|------|-------|---------------|
| `atoms/` | `Banner.astro`, `button.tsx`, `dialog.tsx`, `CopyLinkButton.tsx`, `LibBadge.astro`, `PasswordToggle.tsx`, `ServerError.tsx`, `StatusBadge.astro`, `SubmitButton.tsx` | `button.tsx`, `dialog.tsx`, `CopyLinkButton.tsx`, `StatusBadge.astro` |
| `molecules/` | `BackgroundPicker.tsx`, `FormField.tsx`, `HandoutCard.astro`, `TagsInput.tsx`, `Topbar.astro` | `BackgroundPicker.tsx`, `HandoutCard.astro`, `TagsInput.tsx` |
| `organisms/` | `HandoutEditor.tsx`, `HandoutList.astro`, `ShareDialog.tsx`, `SignInForm.tsx`, `SignUpForm.tsx`, `Welcome.astro` | `HandoutEditor.tsx`, `HandoutList.astro`, `ShareDialog.tsx` |

**shadcn note:** No `src/components/ui/` directory. `components.json` maps the shadcn alias to `@/components/atoms`. Installed primitives: `button.tsx`, `dialog.tsx` only.

---

### 2. Color audit

#### Current aesthetic: "cosmic dark glass"
The four screens share a deep navy + white/opacity glassmorphism + purple/blue accent palette that largely **bypasses** the shadcn oklch token system defined in `global.css:8–75`. That token system exists but only `button.tsx` and `dialog.tsx` actually consume it.

#### Hardcoded hex values to replace

| File | Line(s) | Value(s) | Context |
|------|---------|----------|---------|
| `src/styles/global.css` | 116 | `#0a0e1a`, `#0f1529` | `bg-cosmic` gradient (dashboard, share error) |
| `src/components/organisms/HandoutEditor.tsx` | 240 | `#1a1a2e` | Preview fallback `backgroundColor` |
| `src/lib/backgrounds.ts` | 7 | `#1a3a1a`, `#0d1f0d`, `#2d4a0e` | Fantasy genre gradient — **content theme, leave as-is** |
| `src/lib/backgrounds.ts` | 12 | `#1a0000`, `#0a0a0a`, `#3a0000` | Horror genre gradient — **content theme, leave as-is** |
| `src/lib/backgrounds.ts` | 17 | `#001a3a`, `#000d1a`, `#002244` | Sci-fi genre gradient — **content theme, leave as-is** |

Genre gradients in `backgrounds.ts` are handout content themes, not UI chrome — they should be preserved.

#### Key Tailwind color patterns to replace

| Current class(es) | Role | Replace with |
|-------------------|------|-------------|
| `bg-cosmic` | Page shell background | New `bg-app` utility using `#5E5E5E` tones |
| `bg-gray-950` | Editor shell (inconsistent!) | Same as above — unify with dashboard |
| `from-blue-200 to-purple-200` / `text-purple-200` | Gradient headings, links | `#B2675E` / `#E3B5A4` accent tones |
| `border-purple-400/30 bg-purple-500/20` | CTA panels | Accent palette equivalents |
| `bg-white/10 border-white/10` | Glass cards / inputs | `#E3D5CA`/`#C6AC8F` with opacity |
| `text-white`, `text-white/80` | Body copy | `#F7F7F7` |
| `bg-gray-900` | Dialog backgrounds | Warm dark tone from new palette |
| `bg-black/40`, `bg-black/55` | Preview + share overlay | Warm dark overlay |

#### `global.css` structure
- **`:root` / `.dark`**: Full shadcn neutral oklch token set (lines 8–75) — currently disconnected from actual screen colors
- **`@theme inline`**: Maps CSS vars to Tailwind color names (lines 77–113)
- **`@utility bg-cosmic`**: Only custom utility; hardcoded hex gradient (lines 115–117)
- **Recommendation**: Wire new palette into `:root` + `@theme inline` so shadcn tokens and custom utilities use the same values

#### Out-of-scope color files
- `src/assets/` — empty; no color variable files
- No `tailwind.config.*` — Tailwind 4 config is purely in `global.css`
- `highlight.js/styles/github-dark.css` — syntax highlight colors; imported in `global.css:3`; consider replacement for warm palette (e.g. `github.css` or a custom theme)

---

### 3. Loading states

#### Existing loading indicators (replace with `.loader`)

**`src/components/atoms/SubmitButton.tsx:20–24`** — Auth form spinner
- `useFormStatus()` → `pending` boolean
- Current: `animate-spin` border-spinner + pending text
- Used by: `SignInForm.tsx:82–84`, `SignUpForm.tsx:129–131`
- **→ Replace `animate-spin` span with `<div className="loader" />`** (auth forms are outside S-05 but may benefit)

**`src/components/organisms/HandoutEditor.tsx:42–44, 205–214`** — Save & publish
- State: `isSaving`, `isPublishing` via `useState`
- Current: text-only (`'Saving…'` / `'Publishing…'`) + `disabled` on button
- **→ Add `.loader` alongside the disabled button state**

#### No loader today (candidates for new loading UX)

**`src/components/atoms/CopyLinkButton.tsx:10–27`** — Clipboard copy (dashboard card)
- Async `navigator.clipboard.writeText` → label swap only
- Low priority; clipboard writes are near-instant

**`src/components/organisms/ShareDialog.tsx:20–35`** — Clipboard copy (share dialog)
- Same pattern; same low priority

#### Roadmap aspirational — patterns that don't exist yet

The roadmap (`roadmap.md:147`) mentions "dashboard fetch" and "preview generation" as loader use cases:
- **Dashboard fetch**: Supabase query is SSR; there is no client fetch spinner to replace. Adding one would require converting the dashboard to a client-side fetch pattern — out of scope for S-05 (visual-only).
- **Preview generation**: `renderHandoutHtml` in `HandoutEditor.tsx:68` is a synchronous `useMemo` — no async state. The loader is not applicable unless rendering is moved async.

**Practical S-05 scope**: Replace the `animate-spin` in `SubmitButton` and add a loader for `isSaving`/`isPublishing` in `HandoutEditor`.

#### No Suspense boundaries or skeleton loaders anywhere in `src/`

---

### 4. Browser compatibility — CSS-only loader

The loader uses: `mask` with `conic-gradient` + `exclude` compositing, `filter: blur`, `repeating-conic-gradient`, standalone `rotate` property.

| Feature | Bottleneck versions | Notes |
|---------|--------------------|----|
| `mask-composite: exclude` | Chrome 120+ (Dec 2023), Safari 15.4+ (Mar 2022) | Primary limiting factor |
| `repeating-conic-gradient` | Firefox 83+ (Nov 2020) | Well-supported in 2026 |
| `rotate` (standalone) | Chrome 104+, Firefox 72+, Safari 14.1+ | Less restrictive than `mask-composite` |
| Combined floor | Chrome/Edge 120+, Firefox 83+, Safari 15.4+ | |

**2026 estimated coverage: ~96–97%.**

**Recommended fallback** — wrap with `@supports`:
```css
@supports (mask-composite: exclude) and (background: repeating-conic-gradient(red 0 5%, transparent 5% 50%)) {
  /* full .loader styles */
}
/* fallback: classic border spinner */
.loader {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 6px solid #C6AC8F33;
  border-top-color: #B2675E;
  animation: loader-spin 1s linear infinite;
}
@keyframes loader-spin { to { transform: rotate(1turn); } }
```

---

## Code References

- `src/pages/dashboard.astro:37–100` — inline header, CTAs, error/empty states
- `src/pages/handouts/new.astro:7` — `<HandoutEditor client:load />`
- `src/pages/share/[token].astro:56–94` — inline shared view markup
- `src/components/organisms/HandoutEditor.tsx:234–257` — preview column
- `src/components/organisms/HandoutEditor.tsx:42–44` — `isSaving`, `isPublishing` state
- `src/components/organisms/HandoutEditor.tsx:205–214` — save/publish buttons with text-only loading
- `src/components/organisms/HandoutEditor.tsx:240` — hardcoded `#1a1a2e` preview fallback
- `src/components/atoms/SubmitButton.tsx:20–24` — existing `animate-spin` spinner
- `src/components/atoms/StatusBadge.astro` — amber/green/white status pills
- `src/styles/global.css:8–75` — shadcn oklch token set (currently underused)
- `src/styles/global.css:77–113` — `@theme inline` Tailwind token mapping
- `src/styles/global.css:115–117` — `bg-cosmic` custom utility (hardcoded hex)
- `src/lib/backgrounds.ts:3–19` — genre-specific gradient definitions (preserve as-is)

## Architecture Insights

1. **Two disconnected color systems**: The shadcn oklch token system in `global.css` exists but actual screens use hardcoded Tailwind classes (`bg-cosmic`, `bg-gray-950`, `purple-*`). S-05 is the right moment to close this gap by mapping the new palette into `--primary`, `--accent`, etc. so `button.tsx`/`dialog.tsx` and the screen chrome pull from the same source.

2. **Editor shell inconsistency**: `bg-gray-950` (editor) vs `bg-cosmic` (dashboard/share). Must be unified to a single app background token.

3. **Inline markup in `share/[token].astro`**: No component abstraction — all markup is inline. Restyling requires direct edits to the page file. Consider extracting a `HandoutArticle.astro` atom for parity with the editor preview (a S-05 candidate).

4. **Preview ↔ shared view parity gap**: Editor uses `prose-sm`; shared view uses full `prose`. Both should align on the same typography scale post-restyle.

5. **Atomic Design is in place**: The existing atom/molecule/organism structure means color changes can be centralized in atoms (`button.tsx`, `StatusBadge.astro`) and organisms (`HandoutEditor.tsx`) without touching every screen.

6. **`backgrounds.ts` genre gradients are content, not chrome**: They should be left untouched. The new palette applies to the app chrome and typography layer; the handout backgrounds are user-selected content.

## Historical Context (from prior changes)

- `context/archive/2026-05-30-first-handout-creation-and-sharing/` — Established the `prose prose-invert` + `backgrounds.ts` gradient rendering pattern that S-05 must style around (not replace).
- `context/archive/2026-06-07-handout-dashboard/` — Dashboard was the last major screen shipped; its `bg-cosmic` + glass-card pattern is the current visual baseline.
- `context/foundation/roadmap.md:132–178` — S-05 spec: color palette, loader CSS, scope definition, and note to reconcile `#C02942` loader accent with `#B2675E` during planning.
- `context/foundation/lessons.md` — "Follow Atomic Design Methodology": confirms the atom/molecule/organism structure is intentional and should guide where color overrides are placed. "Astro Atoms May Use class:list Instead of cn()": relevant for `.astro` atom restyling.

## Open Questions

1. **`prose-invert` replacement**: Should S-05 override `prose-invert` with a custom warm-palette prose theme, or leave markdown rendering colors as-is (defaulting to white-on-dark)? The new palette's `#F7F7F7` light font should map naturally to `prose-invert`, but headings/links may need explicit overrides.

2. **`highlight.js` theme**: The `github-dark.css` syntax highlight theme clashes with a warm palette. Replace with `github.css` (light) or a custom theme? Depends on whether S-05 keeps a dark background for the preview/shared view.

3. **`share/not-found.astro`**: Currently uses `bg-cosmic` and is styled separately from the main shared view error branch. Out of stated S-05 scope, but if `bg-cosmic` is removed, it must be updated too.

4. **Loader scope — auth forms**: `SubmitButton.tsx` is used by `SignInForm`/`SignUpForm` which are outside S-05. Should the loader replacement extend there or only to the S-05 screens?

5. **`HandoutArticle` extraction**: Is it worth extracting shared view inline markup into a component for preview/share parity, or keep it as a direct edit? Adds scope but reduces duplication.
