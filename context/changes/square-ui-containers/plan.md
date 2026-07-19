# Squared UI Containers Implementation Plan

## Overview

Reduce border-radius to zero (fully square, angular aesthetic) consistently across every UI container in the app: cards, dialogs, buttons, inputs, textareas, tag chips, status badges, and decorative shapes. Purely presentational — no flow, data, or behavior changes.

## Current State Analysis

The design system is Tailwind 4 CSS-first with a single `--radius: 0.625rem` token in `src/styles/global.css:33`, derived into `--radius-sm/md/lg/xl` inside an `@theme inline` block (`src/styles/global.css:118-122`). shadcn/ui atoms live at `src/components/atoms/` (aliased via `components.json`'s `"ui": "@/components/atoms"`, not the default `components/ui/`). Only `button.tsx`, `dialog.tsx`, and `sonner.tsx` are installed; `card`, `input`, and `textarea` are not, so every card and form field in the app (dashboard, auth, share, handout editor) is hand-rolled Tailwind markup instead of shared atoms.

Rounding currently comes from three independent sources that a single token change cannot fully reach:

1. **Theme-linked utilities** (`rounded-sm/md/lg/xl`) — resolve through `--radius-*`, so they *would* respond to a `--radius` change, except:
2. **The `--radius-xl` formula is additive, not scaling**: `calc(var(--radius) + 4px)` (`src/styles/global.css:122`). Setting `--radius: 0rem` leaves `--radius-xl` at `4px`, not `0`. Every `rounded-xl` consumer (the new Card atom's default template, `HandoutCard.astro:18`, `Topbar.astro:6`, the editor's preview wrapper) would stay visibly rounded even after "zeroing" the token. `--radius-sm/md` have the opposite problem: `calc(var(--radius) - 4px)` and `calc(var(--radius) - 2px)` go **negative** at `--radius: 0rem`, and CSS treats a negative `border-radius` as an invalid declaration (dropped, not clamped) — an easy silent-failure trap.
3. **Non-theme-linked utilities and raw CSS** — `rounded-full` (chips, badges, decorative blurs), `rounded-2xl` (cards in dashboard/auth/share, not overridden by this project's `@theme` block), and `rounded-xs` (`dialog.tsx:60`, the dialog close button) all use Tailwind's fixed default scale and never respond to `--radius` at all.

### Key Discoveries:

- `--radius-xl`'s `+4px` and `--radius-sm/md`'s `-4px/-2px` formulas break at `--radius: 0` — this must be rewritten as a scaling formula (see Critical Implementation Details) before the value change means anything.
- `src/components/atoms/` is the real shadcn atoms directory in this repo (not `components/ui/`) — `components.json:16`.
- No `card`, `input`, or `textarea` atom exists yet; every card/input in the app is hand-rolled and must be migrated by hand (no codemod).
- `.handout-article` (`src/styles/global.css:262-263`, `border-radius: 1rem`) already has per-category `border-radius: 0` overrides from S-09 (`global.css:344-367`) — this is themed handout content, governed by S-09/S-07, and is explicitly out of scope here.
- `.loader` / `.loader-sm` (`global.css:211-260`) are circular by design (a spinner) — not a "container" in the roadmap's enumerated list (cards/modals/inputs/buttons/dropdowns/toasts) and squaring a spinner is a functional regression, not a style fix.
- `src/components/atoms/LibBadge.astro` has `rounded-lg`/`rounded-full` but is unused dead code (only referenced from docs, never imported by a page or component) — excluded, no live surface to change.
- `HandoutEditor.test.tsx` queries form fields via `getByLabelText`/`getByRole`, which survive the Input/Textarea atom swap unchanged as long as `id`/`htmlFor`/`aria-label` wiring is preserved.

## Desired End State

Every rendered UI container (cards, dialogs, buttons, toasts, inputs, textareas, tag chips, status badges) has zero border-radius across all four screens (dashboard, new-handout/edit editor, auth, shared read-only view) plus the landing page. The handout content article (`.handout-article`) and the loading spinner keep their existing radius treatment, untouched by this change. `card`, `input`, and `textarea` shadcn atoms exist in `src/components/atoms/` and are used everywhere a card or text field is rendered, replacing hand-rolled markup.

Verify by: running the app, visiting `/`, `/auth/signin`, `/auth/signup`, `/auth/confirm-email`, `/dashboard`, `/handouts/new`, `/handouts/[id]/edit`, and a `/share/[token]` link, and confirming no rounded corners remain except the loader spinner and the rendered handout article frame.

## What We're NOT Doing

- Not changing `.handout-article` radius or its S-09 per-category `border-image`/`border-radius` overrides — owned by S-07/S-09, explicitly excluded per scoping decision.
- Not changing `.loader`/`.loader-sm` circular spinner radius — not a "container" per the roadmap's own enumeration, and squaring it breaks the spin illusion.
- Not touching `src/components/atoms/LibBadge.astro` — dead code, not rendered anywhere.
- Not installing `dropdown-menu`, `alert-dialog`, `select`, `popover`, or `sheet` atoms — none are used in the app today; out of scope for a radius-only slice.
- Not adding automated visual-regression tooling (e.g. Playwright screenshot diffs) — disproportionate for a CSS-only change with no existing visual-regression infra in this repo; manual verification per screen is sufficient.
- Not adding dedicated cross-browser compatibility tests — `border-radius: 0` has zero meaningful cross-browser variance (universally supported since IE6); the roadmap's generic browser-compatibility risk note doesn't apply materially here.

## Implementation Approach

Fix the token math first so `--radius: 0rem` actually propagates to zero across every derived token, then install the three missing shadcn atoms (`card`, `input`, `textarea`), then migrate every hand-rolled card and text field across all screens to those atoms (so their radius is token-driven going forward, not hardcoded), then do a final sweep of the handful of classes that never were and never will be token-linked (`rounded-full` chips/badges, decorative blurs, the stock dialog close button's `rounded-xs`).

## Critical Implementation Details

### Radius token formula must scale, not offset

`src/styles/global.css:118-122` currently derives `--radius-sm/md/lg/xl` from `--radius` using fixed pixel offsets (`-4px`, `-2px`, `+0`, `+4px`). This only works because the original `--radius` (`0.625rem` = 10px) is comfortably larger than the offsets. At `--radius: 0rem`, the `-4px`/`-2px` offsets go negative (CSS drops negative `border-radius` as invalid rather than clamping to 0) and the `+4px` offset leaves `--radius-xl` visibly rounded. Rewrite the four tokens as multiplicative scale factors of `--radius` instead, chosen to reproduce the current values at the current default (so nothing shifts visually until `--radius` itself changes):

```css
--radius-sm: calc(var(--radius) * 0.6);  /* was -4px: 0.625rem*0.6 = 0.375rem, same as before */
--radius-md: calc(var(--radius) * 0.8);  /* was -2px: 0.625rem*0.8 = 0.5rem, same as before */
--radius-lg: var(--radius);              /* unchanged */
--radius-xl: calc(var(--radius) * 1.4);  /* was +4px: 0.625rem*1.4 = 0.875rem, same as before */
```

With this formula, setting `--radius: 0rem` makes all four tokens exactly `0` — no negative-value drops, no leftover `+4px`.

## Phase 1: Radius token foundation

### Overview

Fix the `@theme inline` derivation formulas so they scale to zero, set `--radius: 0rem`, and square the one stock-atom class that isn't token-linked (`dialog.tsx`'s close-button `rounded-xs`).

### Changes Required:

#### 1. Radius token derivation and value

**File**: `src/styles/global.css`

**Intent**: Replace the offset-based `--radius-sm/md/lg/xl` formulas with the scaling formulas from Critical Implementation Details, then change `--radius` itself from `0.625rem` to `0rem`.

**Contract**: `:root { --radius: 0rem; }` (line 33); `@theme inline` block's four radius lines (118-122) use the `calc(var(--radius) * <factor>)` form shown above.

#### 2. Dialog close button radius

**File**: `src/components/atoms/dialog.tsx`

**Intent**: The close button's `rounded-xs` (line 60) is Tailwind's fixed default scale, not wired to `--radius` in this project's theme — change it directly so the dialog's close affordance is square too.

**Contract**: Swap `rounded-xs` → `rounded-none` in the `DialogClose` className string.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Build succeeds: `npm run build`
- Existing unit tests still pass: `npm test -- --project unit`

#### Manual Verification:

- Open any dialog (e.g. Archive confirmation on a dashboard handout) and confirm the dialog panel corners and the close-button hit area are square
- Confirm buttons across the app (Save, Share, Sign in) have square corners
- Confirm the toast notification (trigger via Archive/Delete) has square corners

---

## Phase 2: Install shadcn card, input, and textarea atoms

### Overview

Install the three missing shadcn primitives needed for Phase 3/4's migration. Because `components.json` aliases `ui` to `@/components/atoms` and `cssVariables: true`, the generated files land directly in the atoms tier and consume the now-zeroed `--radius-md`/`--radius-xl` tokens with no manual radius edits needed.

### Changes Required:

#### 1. Install atoms

**File**: `src/components/atoms/card.tsx`, `src/components/atoms/input.tsx`, `src/components/atoms/textarea.tsx` (generated)

**Intent**: Add the standard shadcn Card (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`), Input, and Textarea components so every hand-rolled card/input/textarea in later phases has a shared, token-driven primitive to migrate onto.

**Contract**: Run `npx shadcn@latest add card input textarea`. Do not hand-edit the generated radius classes — they already resolve through `--radius-xl` (Card) and `--radius-md` (Input, Textarea), which Phase 1 made resolve to `0`.

### Success Criteria:

#### Automated Verification:

- Files exist: `card.tsx`, `input.tsx`, `textarea.tsx` under `src/components/atoms/`
- Build succeeds: `npm run build`
- Lint passes: `npm run lint`

#### Manual Verification:

- No visible change yet (atoms installed but not yet consumed anywhere)

---

## Phase 3: Migrate hand-rolled cards to the Card atom

### Overview

Replace every hand-rolled `rounded-2xl` card wrapper across dashboard, auth, share, and the dashboard handout tile with the new `Card`/`CardContent` atom, so their radius is token-driven (already zero after Phase 1) rather than hardcoded to a Tailwind scale step this theme never overrode.

### Changes Required:

#### 1. Dashboard state cards

**File**: `src/pages/dashboard.astro`

**Intent**: The "not configured" error card (line 43), "could not load" error card (line 48), the dashboard header (line 56), and the empty-state card (line 84) are each a hand-rolled `rounded-2xl border-surface bg-surface ... backdrop-blur-xl` div. Wrap each in `Card`/`CardContent`, preserving the existing `border-surface`/`bg-surface`/`backdrop-blur-xl` treatment via `className` on the `Card` (shadcn's `Card` is a plain styled `div`, so existing utility classes merge in via `cn()` without semantic loss).

**Contract**: Import `Card`, `CardContent` from `@/components/atoms/card` in the frontmatter; each card becomes `<Card className="...">`. `Card` is a non-interactive presentational component with no hooks, so it renders with zero client directive (no hydration JS shipped).

#### 2. Share page cards

**File**: `src/pages/share/[token].astro`, `src/pages/share/not-found.astro`

**Intent**: Both files render a `rounded-2xl` "not found"/"unavailable" card (`[token].astro:70`, `not-found.astro:11`). Migrate both to `Card`/`CardContent`.

**Contract**: Same import/usage pattern as dashboard.astro; no client directive needed.

#### 3. Auth page cards

**File**: `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, `src/pages/auth/confirm-email.astro`

**Intent**: Each page wraps its form/content in a `rounded-2xl border border-white/10 bg-white/10 ... backdrop-blur-xl` div (`signin.astro:10`, `signup.astro:10`, `confirm-email.astro:23-24`). Migrate each to `Card`/`CardContent`, preserving the existing (pre-S-05, cosmic-purple) visual treatment as `className` overrides — this slice only changes radius, not color scheme.

**Contract**: Same import/usage pattern; no client directive needed.

#### 4. Dashboard handout tile card

**File**: `src/components/molecules/HandoutCard.astro`

**Intent**: The tile's outer `<article class="border-surface bg-surface ... rounded-xl border ...">` (line 18) becomes a `Card`. Keep the element as a semantic `<article>` if `Card`'s root can be restyled via `asChild`-style composition, otherwise keep the existing `<article>` wrapper and apply only the `Card`-equivalent radius/border treatment via the same `className` merge pattern used elsewhere in this phase — the roadmap's later `S-11 dashboard-tile-style` slice will restyle this tile further, so keep the migration minimal and additive.

**Contract**: Import `Card` from `@/components/atoms/card`; preserve the existing `data-*` attributes and child structure exactly (edit/archive/delete action slots, tag chips, status badge) since `ArchiveButton`/`DeleteHandoutButton`'s DOM helpers (`src/lib/archive-handout-card-dom.ts`) locate this element via `.closest('article')` and query children via `[data-handout-*]` attribute selectors — those selectors must keep resolving after the markup change.

### Success Criteria:

#### Automated Verification:

- Build succeeds: `npm run build`
- Lint passes: `npm run lint`
- Existing unit tests pass: `npm test -- --project unit` (`ArchiveButton.test.tsx`, `CopyLinkButton.test.tsx`, `HandoutArticle.test.tsx` must still pass — they exercise DOM structure this phase touches indirectly)
- Existing integration tests pass: `npm test -- --project integration`

#### Manual Verification:

- Dashboard: verify header, empty-state card, and handout tiles render with square corners and the archive/delete/edit actions still work
- Auth: verify signin/signup/confirm-email cards render with square corners and forms still submit
- Share: verify a valid share link, an invalid token, and a misconfigured-Supabase state all render square cards

---

## Phase 4: Migrate hand-rolled text fields to Input/Textarea atoms

### Overview

Replace every raw `<input>`/`<textarea>` with hardcoded `rounded-md`/`rounded-lg` classes with the new `Input`/`Textarea` atoms, so form fields are token-driven going forward.

### Changes Required:

#### 1. Auth form field shell

**File**: `src/components/molecules/FormField.tsx`

**Intent**: The `inputBase` constant (line 5-6) hardcodes `rounded-lg` on a raw `<input>` (line 42). Replace the raw `<input>` with the `Input` atom, merging the existing icon-padding/error-state classes via `cn()` so the visual treatment (icon inset, error border color) is unchanged apart from radius.

**Contract**: Import `Input` from `@/components/atoms/input`; the existing `id`/`name`/`type`/`value`/`onChange`/`placeholder` props pass through unchanged so `SignInForm`/`SignUpForm`'s `getByLabelText` queries keep resolving.

#### 2. Handout editor title input and markdown textarea

**File**: `src/components/organisms/HandoutEditor.tsx`

**Intent**: The title `<input>` (line 192-202) and markdown `<textarea>` (line 214-224) both currently consume the shared `fieldInputClass` constant (line 38-39, `rounded-md`). Replace them with the `Input` and `Textarea` atoms respectively, merging `fieldInputClass`'s remaining non-radius styling (or a trimmed equivalent) plus the textarea's `resize-y font-mono text-sm` overrides via `cn()`.

**Contract**: Import `Input`, `Textarea` from `@/components/atoms/input` and `@/components/atoms/textarea`; preserve `id="handout-title"`/`id="handout-markdown"` and their `<label htmlFor>` pairing exactly, since `HandoutEditor.test.tsx` locates both fields via `getByLabelText(/title/i)`.

#### 3. Share dialog read-only URL field

**File**: `src/components/organisms/ShareDialog.tsx`

**Intent**: The read-only share-URL `<input>` (line 77-85, `rounded-md`) becomes an `Input` atom with `readOnly` passed through.

**Contract**: Import `Input` from `@/components/atoms/input`; preserve the `onFocus` select-all behavior and `readOnly` attribute.

#### 4. Tags input text field

**File**: `src/components/molecules/TagsInput.tsx`

**Intent**: The tag-entry `<input>` (line 53-63, `rounded-md`) becomes an `Input` atom. The tag chip `<span>`s themselves (lines 34-51) are not form fields and are handled in Phase 5, not here.

**Contract**: Import `Input` from `@/components/atoms/input`; preserve `onKeyDown`/`onBlur`/`placeholder` wiring exactly.

### Success Criteria:

#### Automated Verification:

- Build succeeds: `npm run build`
- Lint passes: `npm run lint`
- Existing unit tests pass: `npm test -- --project unit` (`HandoutEditor.test.tsx` must pass unchanged, including the back-button/dirty-state tests that type into the title field)

#### Manual Verification:

- New handout form: type a title, background, markdown content, and tags; confirm all fields render square and still capture input correctly
- Edit an existing handout: confirm pre-populated values still load into the migrated fields
- Sign in / sign up: confirm email/password fields render square, icon inset and error states still display correctly
- Publish a handout and confirm the Share dialog's read-only URL field renders square and is still selectable/copyable

---

## Phase 5: Square remaining non-token-linked classes

### Overview

Final sweep of every class that was never wired to `--radius` and never will be: `rounded-full` pills (tag chips, status badges, decorative landing-page blurs) and their JS-string duplicate in the archive DOM helper.

### Changes Required:

#### 1. Status badge

**File**: `src/components/atoms/StatusBadge.astro`

**Intent**: The badge's `rounded-full` (line 30) becomes a square chip.

**Contract**: Swap `rounded-full` → `rounded-none` in the `class:list` array.

#### 2. Archived-state DOM helper (must mirror StatusBadge exactly)

**File**: `src/lib/archive-handout-card-dom.ts`

**Intent**: `archivedStatusBadgeClassName` (line 1-2) is a hardcoded string duplicate of `StatusBadge.astro`'s archived-state class list, applied client-side when a handout is archived without a page reload. It must stay in sync with change #1 or the badge will flip back to a pill after an in-page archive action.

**Contract**: Update the `rounded-full` substring in `archivedStatusBadgeClassName` to `rounded-none`.

#### 3. Handout card tag chips

**File**: `src/components/molecules/HandoutCard.astro`

**Intent**: Tag chip `<span>`s (line 48) use `rounded-full`.

**Contract**: Swap `rounded-full` → `rounded-none`.

#### 4. Tags input chips

**File**: `src/components/molecules/TagsInput.tsx`

**Intent**: The tag chip `<span>` (line 36) and its inline remove `<button>` (line 45) both use `rounded-full`.

**Contract**: Swap both instances of `rounded-full` → `rounded-none`.

#### 5. Landing page decorative blurs

**File**: `src/components/organisms/Welcome.astro`

**Intent**: The three ambient background-glow divs (lines 8, 12, 16) use `rounded-full` to render soft circular blurs behind the hero section. Per scoping decision, these are in scope for total site-wide consistency.

**Contract**: Swap all three `rounded-full` → `rounded-none`. This changes the blurs from circular to square glows — a visual change to the landing page's ambient background, not to any interactive chrome.

### Success Criteria:

#### Automated Verification:

- Build succeeds: `npm run build`
- Lint passes: `npm run lint`
- Existing unit tests pass: `npm test -- --project unit`

#### Manual Verification:

- Dashboard: confirm tag chips and status badges (Draft/Published/Archived) render as square chips, including immediately after archiving a handout in-page (no reload)
- Landing page (`/`): confirm the background ambient glows are now square-edged blurs instead of circular

---

## Testing Strategy

### Unit Tests:

- No new unit tests are added — this phase changes markup/classes on components that either have no realistic logic to test (presentational atoms) or are already covered by existing tests (`HandoutEditor.test.tsx`) that must continue passing unchanged.
- Re-run the full existing suite after each phase to catch any accidental behavioral regression from the JSX swaps (e.g. a dropped `id`, `name`, or event handler during the Input/Textarea migration).

### Integration Tests:

- Existing Supabase integration tests (`__tests__/integration/handouts/*`, `__tests__/integration/share/*`) exercise the API routes these pages call — no route or query changes in this plan, so these should pass unchanged and serve as a regression backstop.

### Manual Testing Steps:

1. Run `npm run dev` and visit `/` — confirm decorative blurs and Sign In/Sign Up buttons are square.
2. Visit `/auth/signin` and `/auth/signup` — confirm card, inputs, and buttons are square; submit a form to confirm functionality is unchanged.
3. Visit `/auth/confirm-email` — confirm card is square.
4. Sign in, visit `/dashboard` — confirm header, empty-state (if any), handout tiles, tag chips, and status badges are square.
5. Create a new handout at `/handouts/new` — confirm title input, markdown textarea, background picker, and tags input are square; save and publish it.
6. Confirm the Share dialog's URL field and buttons are square; copy the link.
7. Open the share link in a new tab (or incognito) — confirm the shared read-only view's handout article frame is unchanged (still has its S-09 themed radius/border) while any surrounding chrome is square.
8. Visit an invalid `/share/<random-token>` — confirm the "not found" card is square.
9. Edit the handout, archive it from the dashboard, confirm the status badge flips to a square "Archived" chip in-page without a reload, then delete it.

## Performance Considerations

None — this is a CSS-only change (removing rounded corners); no additional JS ships except the three new atom component modules, which are small, dependency-free wrappers around existing Radix/native elements already bundled for `button`/`dialog`.

## Migration Notes

Not applicable — no data model, schema, or persisted-state changes.

## References

- Related roadmap entry: `context/foundation/roadmap.md` (S-10, `square-ui-containers`)
- Linear issue: TEC-19
- Prior restyle slice this builds on: `context/archive/2026-06-09-ui-restyle/`
- Token definitions: `src/styles/global.css:32-160`
- shadcn config: `components.json`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Radius token foundation

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — 1c8520b
- [x] 1.2 Build succeeds: `npm run build` — 1c8520b
- [x] 1.3 Existing unit tests still pass: `npm test -- --project unit` — 1c8520b

#### Manual

- [x] 1.4 Dialog panel corners and close button are square — 1c8520b
- [x] 1.5 Buttons across the app have square corners — 1c8520b
- [x] 1.6 Toast notification has square corners — 1c8520b

### Phase 2: Install shadcn card, input, and textarea atoms

#### Automated

- [x] 2.1 Files exist: `card.tsx`, `input.tsx`, `textarea.tsx` under `src/components/atoms/`
- [x] 2.2 Build succeeds: `npm run build`
- [x] 2.3 Lint passes: `npm run lint`

#### Manual

- [x] 2.4 No visible change yet (atoms installed but not yet consumed anywhere)

### Phase 3: Migrate hand-rolled cards to the Card atom

#### Automated

- [ ] 3.1 Build succeeds: `npm run build`
- [ ] 3.2 Lint passes: `npm run lint`
- [ ] 3.3 Existing unit tests pass: `npm test -- --project unit`
- [ ] 3.4 Existing integration tests pass: `npm test -- --project integration`

#### Manual

- [ ] 3.5 Dashboard header, empty-state card, and handout tiles render square; archive/delete/edit actions still work
- [ ] 3.6 Auth signin/signup/confirm-email cards render square; forms still submit
- [ ] 3.7 Share valid link, invalid token, and misconfigured state all render square cards

### Phase 4: Migrate hand-rolled text fields to Input/Textarea atoms

#### Automated

- [ ] 4.1 Build succeeds: `npm run build`
- [ ] 4.2 Lint passes: `npm run lint`
- [ ] 4.3 Existing unit tests pass: `npm test -- --project unit`

#### Manual

- [ ] 4.4 New handout form fields render square and capture input correctly
- [ ] 4.5 Edit form pre-populates migrated fields correctly
- [ ] 4.6 Sign in / sign up fields render square with correct icon inset and error states
- [ ] 4.7 Share dialog URL field renders square and is selectable/copyable

### Phase 5: Square remaining non-token-linked classes

#### Automated

- [ ] 5.1 Build succeeds: `npm run build`
- [ ] 5.2 Lint passes: `npm run lint`
- [ ] 5.3 Existing unit tests pass: `npm test -- --project unit`

#### Manual

- [ ] 5.4 Tag chips and status badges render square, including immediately after in-page archive action
- [ ] 5.5 Landing page ambient glows are square-edged
