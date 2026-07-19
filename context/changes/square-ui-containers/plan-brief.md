# Squared UI Containers — Plan Brief

> Full plan: `context/changes/square-ui-containers/plan.md`

## What & Why

Reduce border-radius to zero across every UI container in the app (cards, dialogs, buttons, inputs, textareas, tag chips, status badges, decorative shapes) for a consistent, angular aesthetic site-wide. Pure presentation change, no flow or data changes. Roadmap S-10, Linear TEC-19.

## Starting Point

A single `--radius: 0.625rem` token drives `rounded-sm/md/lg/xl` via Tailwind's `@theme inline` block, but two of its four derived formulas break at zero: `--radius-xl` adds `+4px` (stays visibly rounded) and `--radius-sm/md` subtract `4px/2px` (goes negative, which CSS drops as invalid rather than clamping). Separately, `rounded-full` (pills/badges/decorative blurs) and `rounded-2xl` (most cards) were never wired to this token at all — they're on Tailwind's untouched default scale. shadcn atoms live at `src/components/atoms/` (only `button`, `dialog`, `sonner` installed); every card and text input across dashboard, auth, share, and the handout editor is hand-rolled markup, not a shared atom.

## Desired End State

Every screen (landing, auth, dashboard, handout editor, shared read-only view) renders every container with square corners. `card`, `input`, and `textarea` shadcn atoms exist and are used everywhere a card or text field appears. The handout content article frame (owned by S-07/S-09 theming) and the circular loading spinner are explicitly untouched.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Target radius | `0` (fully square) | Matches roadmap's "squared, angular aesthetic" wording with zero ambiguity | Plan |
| Tag chips / status badges | Square them too | Roadmap says "all UI containers ... consistently site-wide" | Plan |
| Landing page decorative blurs | Square them too | User chose total consistency over preserving the circular ambient glow | Plan |
| Handout article frame (`.handout-article`) | Excluded | Owned by S-07/S-09 theming, not app UI chrome; reopening risks scope creep into an already-shipped slice | Plan |
| Missing card/input/textarea atoms | Install shadcn atoms, migrate all hand-rolled cards/inputs onto them | One radius source of truth going forward, closes the exact gap where `rounded-2xl`/hardcoded classes never followed the theme token | Plan |
| Browser-compat testing | Skip dedicated cross-browser verification | `border-radius: 0` has no real cross-browser variance; roadmap's generic risk note doesn't apply materially | Plan |
| Automated testing | Manual verification only, no new visual-regression tooling | No existing screenshot-diff infra in repo; disproportionate for a CSS-only change | Plan |

## Scope

**In scope:**

- `--radius` token + derivation formula fix (`global.css`)
- Installing `card`, `input`, `textarea` shadcn atoms
- Migrating dashboard/auth/share cards and HandoutCard tile to the Card atom
- Migrating FormField/HandoutEditor/ShareDialog/TagsInput text fields to Input/Textarea atoms
- Squaring `rounded-full` on tag chips, status badges (+ its JS-string DOM-helper duplicate), and landing-page decorative blurs
- Squaring the stock `dialog.tsx` close button's `rounded-xs`

**Out of scope:**

- `.handout-article` radius and its S-09 per-category border-image overrides
- `.loader`/`.loader-sm` circular spinner
- `LibBadge.astro` (dead code, unused)
- New shadcn atoms not currently used (`dropdown-menu`, `alert-dialog`, `select`, `popover`, `sheet`)
- Automated visual-regression tooling

## Architecture / Approach

Fix the token math first (Phase 1) so a single `--radius: 0rem` change actually reaches zero everywhere it should, then install the missing atoms (Phase 2), then migrate every hand-rolled card and text field onto them across all four screens plus landing/auth (Phases 3-4), then do a final sweep of the handful of classes that were never token-linked and never will be — pills, badges, decorative blurs (Phase 5).

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Radius token foundation | Fixed `--radius-*` formulas + `--radius: 0rem` + square dialog close button | Getting the scaling formula wrong could silently leave `--radius-xl` non-zero again |
| 2. Install card/input/textarea atoms | Three new atoms in `src/components/atoms/` | None — additive, unused until Phase 3/4 |
| 3. Migrate cards | Dashboard, auth, share, HandoutCard tile on the Card atom | HandoutCard's `data-*` selectors (used by archive/delete DOM helpers) must survive the markup swap |
| 4. Migrate text fields | FormField, HandoutEditor, ShareDialog, TagsInput on Input/Textarea atoms | `HandoutEditor.test.tsx`'s label-based queries must keep resolving |
| 5. Square remaining pills | Tag chips, status badges (+ DOM-helper duplicate), landing decorative blurs, dialog close button | Archive DOM helper's hardcoded class string must stay in sync with `StatusBadge.astro` |

**Prerequisites:** S-05 (`ui-restyle`) — done.
**Estimated effort:** ~1 session across 5 phases; purely presentational, no architecture/data risk.

## Open Risks & Assumptions

- Assumes shadcn's default Card/Input/Textarea templates use `rounded-xl`/`rounded-md` (token-linked) at generation time — if the installed CLI version changes defaults, verify the generated files still resolve through `--radius-xl`/`--radius-md` rather than a hardcoded value.
- Assumes squaring the landing page's decorative blurs (circular → square glow) is visually acceptable; this is the one place where "square everything" trades off against an existing ambient design choice, and it was a close call in scoping.

## Success Criteria (Summary)

- No rounded corners remain anywhere except `.handout-article` and the loading spinner
- All existing unit/integration tests pass unchanged after the atom migrations
- Manual walkthrough of all screens (landing, auth, dashboard, editor, share) confirms square containers with no functional regressions
