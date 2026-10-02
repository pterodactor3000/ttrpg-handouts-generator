# Theme switch Implementation Plan

## Overview

S-15 lets a signed-in GM switch between Tower of Light and Darkest of Mines. The browser remembers that choice until the GM changes it, and every view uses it. Until they choose, pages follow the system theme. The control is one toggle on Settings. Darkest of Mines is darker than the warm `#333333` chrome, and both themes keep the same corner radius. This covers FR-016, with FR-012 and FR-015 as the cited visual and landing requirements.

## Current State Analysis

`src/styles/global.css` lines 32-81 set the warm-dark palette on `:root`. `.moon-chrome` at lines 124-148 replaces those tokens with the Moon light palette and sets DM Sans. Later `.moon-chrome` rules set 8px controls, cards, inputs, chips, and the loader. Pages add `moon-chrome` on an inner shell, not on `<html>`:

- `src/pages/index.astro` line 6 wraps `Welcome`, which is `moon-chrome` at `src/components/organisms/Welcome.astro` line 5.
- `src/pages/auth/signin.astro` line 11, `src/pages/auth/signup.astro` line 10, and `src/pages/auth/confirm-email.astro` line 23.
- `src/pages/dashboard.astro` line 43. Its header actions are lines 85-109.
- `src/pages/settings.astro` line 11. Its header is lines 13-18.
- `src/components/organisms/HandoutEditor.tsx` line 171. The title is lines 174-176. `src/pages/handouts/new.astro` line 6 and `src/pages/handouts/[id]/edit.astro` line 24 both render that editor.
- `src/pages/account-closed.astro` line 9 also uses `moon-chrome`. This slice does not change that page.

`src/layouts/Layout.astro` lines 16-35 render `<html>` and `<head>` with no theme attribute and no boot script. Portaled dialogs copy `moon-chrome` onto `DialogContent` in `HandoutEditor.tsx`, `DeleteAccountDialog.tsx`, `RestoreHandoutButton.tsx`, `ShareDialog.tsx`, `HandoutTagRow.tsx`, `DeleteHandoutButton.tsx`, and `ArchiveButton.tsx`. `src/components/atoms/sonner.tsx` line 11 does the same for toasts.

The editor preview (`HandoutEditor.tsx` lines 291-300) paints `var(--palette-preview-fallback)` and the category background. `HandoutArticle.astro` line 14 is `.handout-article`. The comment at `global.css` lines 118-120 says `.moon-chrome` must not retune `--palette-*` or `.handout-article`. `src/pages/share/[token].astro` lines 60-79 do not use `moon-chrome`.

Nothing reads `prefers-color-scheme` or stores a theme. `next-themes` is only imported by the toaster and has no provider.

## Desired End State

A GM with no stored choice sees Tower of Light when the system theme is light and Darkest of Mines when it is dark. After they flip the toggle, every view uses that choice, including landing, auth, account-closed, and a later visit. The page paints the resolved theme before the first content paint. Darkest of Mines is near-black chrome, darker than `#333333`, and buttons, inputs, cards, and dialogs keep the same radius as Tower of Light. Handout category backgrounds, borders, and fonts do not change.

## What We're NOT Doing

- Changing High Fantasy, Eldritch, or Grimdark backgrounds, borders, or fonts.
- Adding a third theme.
- Putting the toggle on the dashboard, the new-handout page, the edit page, landing, auth, or account-closed.
- Storing the choice on the server or on the GM account.
- Following a live operating-system theme change without a new page load when no choice is stored. The next load reads the system theme.

## Implementation Approach

Keep `moon-chrome` on the existing shells and portaled dialogs. Tower of Light tokens sit on `html:not([data-chrome-theme="darkest-of-mines"])`. Darkest of Mines tokens sit on `html[data-chrome-theme="darkest-of-mines"]` and are darker than `#333333`. Corner radius, control size, and the other geometry rules stay on `.moon-chrome` in both themes. A blocking inline script in `Layout` always sets the attribute before the body is parsed. A stored id wins. Otherwise the script uses the system theme. The toggle writes `localStorage` and the same attribute, so the CSS updates without a navigation.

## Critical Implementation Details

The boot script has to be an inline classic script in `<head>`, not a bundled module. A module is deferred, and the body would paint before the attribute exists. With the script in the head, the attribute is already on `<html>` when the shell is parsed, so a dark choice does not flash the light chrome.

Every page that uses `Layout` runs the boot script, so a stored choice reaches landing, auth, account-closed, and share chrome. An absent attribute still matches `html:not([data-chrome-theme="darkest-of-mines"])`, which keeps Tower of Light until the script sets the attribute. Geometry rules are not inside that selector, so Darkest of Mines keeps the radius.

The inline script cannot import `resolveChromeTheme`. It repeats those branches. The storage key and both theme ids in `Layout.astro` must be the same strings the module exports. The unit test reads the layout source and fails if they drift.

Do not change `--palette-*` or `.handout-article` rules. Category art reads those, and both chrome themes must leave them alone.

## Phase 1: Theme resolution

### Overview

Every view resolves Tower of Light or Darkest of Mines before first paint. A stored choice overrides the system theme on all of them.

### Changes Required

#### 1. `src/lib/chrome-theme.ts`

**File:** `src/lib/chrome-theme.ts`

**Intent:** One pure resolver for the boot script, the switch, and the tests.

**Contract:** Export `CHROME_THEME_STORAGE_KEY` as `handouts-chrome-theme`. Export the theme ids `tower-of-light` and `darkest-of-mines`. `resolveChromeTheme({ mode, storedTheme, isSystemDark })` returns `darkest-of-mines` when `isSystemDark` is true and `tower-of-light` otherwise, for `mode: "system"`, ignoring `storedTheme`. For `mode: "choice"`, it returns `storedTheme` only when that value is one of the two ids. Otherwise it returns the system result. Export the function at the end of the file.

#### 2. `src/layouts/Layout.astro` and the pages that opt in

**File:** `src/layouts/Layout.astro`

**Intent:** Set the theme attribute before the shell paints, on every page that uses this layout.

**Contract:** Render a blocking `is:inline` script as the first head child. The script reads `localStorage` key `handouts-chrome-theme`, reads `matchMedia("(prefers-color-scheme: dark)")`, and sets `document.documentElement.dataset.chromeTheme`. A stored id wins. Otherwise the script uses the system result. A storage exception leaves the system result. Do not add a mode prop. Share and account-closed use this layout, so they receive the same script.

#### 3. `src/styles/global.css`

**File:** `src/styles/global.css`

**Intent:** Keep Tower of Light on the Moon tokens, make Darkest of Mines darker than `#333333`, and keep corner radius in both themes.

**Contract:** Tower of Light tokens stay on `html:not([data-chrome-theme="darkest-of-mines"])`. Add Darkest of Mines tokens on `html[data-chrome-theme="darkest-of-mines"]` with `--background` darker than `#333333`. Leave `.moon-chrome` geometry rules, including `border-radius`, active in both themes. Do not change `--palette-*` or `.handout-article`.

### Success Criteria

#### Automated Verification

- `resolveChromeTheme` returns `darkest-of-mines` for `mode: "system"` when `isSystemDark` is true, even if `storedTheme` is `tower-of-light`.
- `resolveChromeTheme` returns `tower-of-light` for `mode: "system"` when `isSystemDark` is false, even if `storedTheme` is `darkest-of-mines`.
- `resolveChromeTheme` returns the stored id for `mode: "choice"` when `storedTheme` is `tower-of-light` or `darkest-of-mines`.
- `resolveChromeTheme` returns the system theme for `mode: "choice"` when `storedTheme` is `null` or any other string.
- `npm test -- --project unit` passes `__tests__/lib/chrome-theme.test.ts`, and that file asserts `src/layouts/Layout.astro` contains `handouts-chrome-theme`, `tower-of-light`, and `darkest-of-mines`.
- The same test asserts `.moon-chrome` geometry rules are not gated by `html:not([data-chrome-theme="darkest-of-mines"])`, and that `html[data-chrome-theme="darkest-of-mines"]` sets `--background` darker than `#333333`.
- `npm run lint` passes.

#### Manual Verification

- With `localStorage` cleared, a light system theme shows Tower of Light on `/dashboard` and `/auth/signin`. A dark system theme shows Darkest of Mines on those two pages.
- After `handouts-chrome-theme` is `darkest-of-mines`, `/dashboard` and `/` are both Darkest of Mines, and controls keep their corner radius.
- An existing shared handout at `/share/<token>` matches its look from before this phase, including category background and font.

---

## Phase 2: Theme switch

### Overview

Settings gets the toggle. Choosing a theme stores it, updates the current page, and leaves that choice for every other view.

### Changes Required

#### 1. `src/lib/chrome-theme.ts`

**File:** `src/lib/chrome-theme.ts`

**Intent:** One writer for the stored choice and the live attribute.

**Contract:** `selectChromeTheme(theme)` writes `theme` to `localStorage` under `CHROME_THEME_STORAGE_KEY` and sets `document.documentElement.dataset.chromeTheme` to that id. It accepts only `tower-of-light` or `darkest-of-mines`. Export it at the end of the file.

#### 2. `src/components/molecules/ThemeSwitch.tsx`

**File:** `src/components/molecules/ThemeSwitch.tsx`

**Intent:** The named control for Settings.

**Contract:** A named export `ThemeSwitch`, exported at the end of the file. It renders one `role="switch"` control. The visible label and `aria-label` are the active theme name, `Tower of Light` or `Darkest of Mines`. `aria-checked` is true for Darkest of Mines. Do not read `document` during server render. Read the theme with `useSyncExternalStore`. Activating the switch calls `selectChromeTheme` with the other theme. Use `cn()` for class names. Import the lib through `@/lib/chrome-theme`.

#### 3. Settings

**File:** `src/pages/settings.astro`

**Intent:** Put that control on Settings only.

**Contract:** Mount `<ThemeSwitch client:load />` in a Theme section on `src/pages/settings.astro`. Do not mount it on the dashboard, the new-handout page, the edit page, landing, auth, share, or account-closed.

### Success Criteria

#### Automated Verification

- `selectChromeTheme("darkest-of-mines")` sets `localStorage` `handouts-chrome-theme` to `darkest-of-mines` and sets `document.documentElement.dataset.chromeTheme` to that id. `selectChromeTheme("tower-of-light")` does the same for Tower of Light.
- `npm test -- --project unit` passes `__tests__/lib/chrome-theme.test.ts`, and `npm run lint` passes.

#### Manual Verification

- On `/settings`, the toggle shows the active theme name. `/dashboard`, `/handouts/new`, and an edit URL do not show it.
- Choosing the other theme updates the chrome without a navigation. A new tab and a later visit open `/dashboard` on that same theme.
- After a stored choice exists, `/`, `/auth/signin`, and `/auth/signup` use that same theme.
- The editor preview keeps the selected category background and font. A shared handout is unchanged.

---

## Testing Strategy

### Unit Tests

- `__tests__/lib/chrome-theme.test.ts` covers `resolveChromeTheme` for system mode, a valid stored choice, and an invalid stored value.
- The same file reads `src/layouts/Layout.astro` and `src/styles/global.css` and asserts the storage key, both theme ids, ungated `.moon-chrome` geometry, and a Darkest of Mines `--background` darker than `#333333`. Follow the source-read style in `__tests__/lib/fonts-css-sync.test.ts`.
- The same file covers `selectChromeTheme` against `localStorage` and `document.documentElement` in jsdom.

### Integration Tests

- None. The choice never reaches the database or an API route.

### Manual Testing Steps

1. Clear `localStorage` key `handouts-chrome-theme`. Set the operating system to light. Open `/dashboard` and `/auth/signin`. Both are Tower of Light.
2. Set the operating system to dark and reload both pages. Both are Darkest of Mines.
3. On `/dashboard`, choose Tower of Light while the system theme is dark. The dashboard becomes light. Reload `/dashboard`. It stays light. Open `/`. It stays light.
4. Open `/settings`. The toggle shows Tower of Light. `/dashboard` and `/handouts/new` have no toggle. Choose Darkest of Mines on Settings. Open a new tab to `/dashboard`. It is dark, buttons and cards stay rounded, and the dark background is darker than `#333333`.
5. Open a shared handout and compare the category frame and font with the editor preview. They match each other and do not pick up the chrome theme.

## References

- Roadmap: `context/foundation/roadmap.md` (S-15)
- PRD: `context/foundation/prd.md` (FR-012, FR-015, FR-016)
- `src/styles/global.css` lines 32-81 and 118-148
- `src/layouts/Layout.astro` lines 16-35
- `src/pages/dashboard.astro` lines 43 and 85-109
- `src/pages/settings.astro` lines 11-18
- `src/components/organisms/HandoutEditor.tsx` lines 171-176 and 291-300
- `src/components/molecules/HandoutArticle.astro` line 14
- `src/pages/share/[token].astro` lines 60-79
- `__tests__/lib/fonts-css-sync.test.ts`

## Progress

> `- [ ]` is pending and `- [x]` is complete. Append a commit SHA when a step lands.

### Phase 1: Theme resolution

#### Automated

- [x] 1.1 `resolveChromeTheme` returns `darkest-of-mines` for `mode: "system"` when `isSystemDark` is true, even if `storedTheme` is `tower-of-light`. 860614b
- [x] 1.2 `resolveChromeTheme` returns `tower-of-light` for `mode: "system"` when `isSystemDark` is false, even if `storedTheme` is `darkest-of-mines`. 860614b
- [x] 1.3 `resolveChromeTheme` returns the stored id for `mode: "choice"` when `storedTheme` is `tower-of-light` or `darkest-of-mines`. 860614b
- [x] 1.4 `resolveChromeTheme` returns the system theme for `mode: "choice"` when `storedTheme` is `null` or any other string. 860614b
- [x] 1.5 `npm test -- --project unit` passes `__tests__/lib/chrome-theme.test.ts`, and that file asserts `src/layouts/Layout.astro` contains `handouts-chrome-theme`, `tower-of-light`, and `darkest-of-mines`. 860614b
- [x] 1.6 The same test asserts `.moon-chrome` geometry rules are not gated by `html:not([data-chrome-theme="darkest-of-mines"])`, and that `html[data-chrome-theme="darkest-of-mines"]` sets `--background` darker than `#333333`. 860614b
- [x] 1.7 `npm run lint` passes. 860614b

#### Manual

- [x] 1.8 With `localStorage` cleared, a light system theme shows Tower of Light on `/dashboard` and `/auth/signin`. A dark system theme shows Darkest of Mines on those two pages.
- [x] 1.9 After `handouts-chrome-theme` is `darkest-of-mines`, `/dashboard` and `/` are both Darkest of Mines, and controls keep their corner radius.
- [x] 1.10 An existing shared handout at `/share/<token>` matches its look from before this phase, including category background and font.

### Phase 2: Theme switch

#### Automated

- [x] 2.1 `selectChromeTheme("darkest-of-mines")` sets `localStorage` `handouts-chrome-theme` to `darkest-of-mines` and sets `document.documentElement.dataset.chromeTheme` to that id. `selectChromeTheme("tower-of-light")` does the same for Tower of Light. 259878a
- [x] 2.2 `npm test -- --project unit` passes `__tests__/lib/chrome-theme.test.ts`, and `npm run lint` passes. 259878a

#### Manual

- [ ] 2.3 On `/settings`, the toggle shows the active theme name. `/dashboard`, `/handouts/new`, and an edit URL do not show it.
- [ ] 2.4 Choosing the other theme updates the chrome without a navigation. A new tab and a later visit open `/dashboard` on that same theme.
- [ ] 2.5 After a stored choice exists, `/`, `/auth/signin`, and `/auth/signup` use that same theme.
- [ ] 2.6 The editor preview keeps the selected category background and font. A shared handout is unchanged.
