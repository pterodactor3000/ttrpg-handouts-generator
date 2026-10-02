# Theme switch Implementation Plan

## Overview

S-15 lets a signed-in GM switch the dashboard, the new-handout page, the edit page, and Settings between Tower of Light and Darkest of Mines. The browser remembers that choice until the GM changes it. Until they choose, those pages follow the system theme. Landing, sign-in, sign-up, and confirm-email follow the system theme and ignore the stored choice. This covers FR-016, with FR-012 and FR-015 as the cited visual and landing requirements.

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

A GM with no stored choice sees Tower of Light when the system theme is light and Darkest of Mines when it is dark, on the landing page, the auth pages, and the four signed-in screens. After they pick a theme on one of those four screens, the browser keeps it. The other three screens, a new tab, and a later visit show that choice. Landing and auth keep following the system theme. The page paints the resolved theme before the first content paint. The shared handout and the category preview art do not change. The account-closed page stays on the current light chrome.

## What We're NOT Doing

- Restyling `/share/<token>`, including the not-found state.
- Changing High Fantasy, Eldritch, or Grimdark backgrounds, borders, or fonts.
- Adding a third theme.
- Putting the control on the landing page, the auth pages, or the account-closed page.
- Storing the choice on the server or on the GM account.
- Following a live operating-system theme change without a new page load when no choice is stored. The next load reads the system theme.

## Implementation Approach

Keep `moon-chrome` on the existing shells and portaled dialogs. Scope those rules so they apply unless `<html data-chrome-theme="darkest-of-mines">` is set. Tower of Light is that Moon chrome. Darkest of Mines is the unscoped `:root` palette. A blocking inline script in `Layout` sets the attribute before the body is parsed. `choice` mode may use the stored value. `system` mode ignores it. The switch writes `localStorage` and the same attribute, so the CSS updates without a navigation.

## Critical Implementation Details

The boot script has to be an inline classic script in `<head>`, not a bundled module. A module is deferred, and the body would paint before the attribute exists. With the script in the head, the attribute is already on `<html>` when the shell is parsed, so a dark choice does not flash the light chrome.

Account-closed has `moon-chrome` and must stay light. It does not receive the boot script, so it has no `data-chrome-theme`. The Moon rules therefore use `html:not([data-chrome-theme="darkest-of-mines"]) .moon-chrome`, not a rule that requires `tower-of-light`. An absent attribute keeps today's light chrome.

The inline script cannot import `resolveChromeTheme`. It repeats those branches. The storage key and both theme ids in `Layout.astro` must be the same strings the module exports. The unit test reads the layout source and fails if they drift.

Do not change `--palette-*` or `.handout-article` rules. Category art reads those, and both chrome themes must leave them alone.

## Phase 1: Theme resolution

### Overview

Landing, auth, and the four signed-in screens resolve Tower of Light or Darkest of Mines before first paint. A stored choice overrides the system theme only when the layout is in `choice` mode.

### Changes Required

#### 1. `src/lib/chrome-theme.ts`

**File:** `src/lib/chrome-theme.ts`

**Intent:** One pure resolver for the boot script, the switch, and the tests.

**Contract:** Export `CHROME_THEME_STORAGE_KEY` as `handouts-chrome-theme`. Export the theme ids `tower-of-light` and `darkest-of-mines`. `resolveChromeTheme({ mode, storedTheme, isSystemDark })` returns `darkest-of-mines` when `isSystemDark` is true and `tower-of-light` otherwise, for `mode: "system"`, ignoring `storedTheme`. For `mode: "choice"`, it returns `storedTheme` only when that value is one of the two ids. Otherwise it returns the system result. Export the function at the end of the file.

#### 2. `src/layouts/Layout.astro` and the pages that opt in

**File:** `src/layouts/Layout.astro`

**Intent:** Set the theme attribute before the shell paints, and only on pages that asked for it.

**Contract:** Add optional prop `chromeThemeMode` with values `choice` or `system`. When it is set, render `<html data-chrome-theme-mode={chromeThemeMode}>` and a blocking `is:inline` script as the first head child. The script reads `localStorage` key `handouts-chrome-theme`, reads `matchMedia("(prefers-color-scheme: dark)")`, and sets `document.documentElement.dataset.chromeTheme` using the same branches as `resolveChromeTheme`. `system` ignores a stored value. `choice` uses a stored id and otherwise uses the system result. A storage exception leaves the system result. When the prop is omitted, do not render the script and do not set the mode attribute.

Pass `chromeThemeMode="choice"` from `src/pages/dashboard.astro`, `src/pages/settings.astro`, `src/pages/handouts/new.astro`, and `src/pages/handouts/[id]/edit.astro`. Pass `chromeThemeMode="system"` from `src/pages/index.astro`, `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, and `src/pages/auth/confirm-email.astro`. Leave `src/pages/share/[token].astro` and `src/pages/account-closed.astro` unchanged.

#### 3. `src/styles/global.css`

**File:** `src/styles/global.css`

**Intent:** Make Darkest of Mines the warm-dark `:root` palette, and keep Tower of Light on the Moon rules.

**Contract:** Prefix every `.moon-chrome` selector, including the token block at line 124 and the control, card, input, chip, and loader rules that follow, with `html:not([data-chrome-theme="darkest-of-mines"]) `. Do not change the declarations inside those rules. Do not change `:root`, `.dark`, `--palette-*`, or `.handout-article`.

### Success Criteria

#### Automated Verification

- `resolveChromeTheme` returns `darkest-of-mines` for `mode: "system"` when `isSystemDark` is true, even if `storedTheme` is `tower-of-light`.
- `resolveChromeTheme` returns `tower-of-light` for `mode: "system"` when `isSystemDark` is false, even if `storedTheme` is `darkest-of-mines`.
- `resolveChromeTheme` returns the stored id for `mode: "choice"` when `storedTheme` is `tower-of-light` or `darkest-of-mines`.
- `resolveChromeTheme` returns the system theme for `mode: "choice"` when `storedTheme` is `null` or any other string.
- `npm test -- --project unit` passes `__tests__/lib/chrome-theme.test.ts`, and that file asserts `src/layouts/Layout.astro` contains `handouts-chrome-theme`, `tower-of-light`, and `darkest-of-mines`.
- The same test asserts every `.moon-chrome` rule in `src/styles/global.css` is prefixed with `html:not([data-chrome-theme="darkest-of-mines"])`.
- `npm run lint` passes.

#### Manual Verification

- With `localStorage` cleared, a light system theme shows Tower of Light on `/dashboard` and `/auth/signin`. A dark system theme shows Darkest of Mines on those two pages.
- After `handouts-chrome-theme` is `darkest-of-mines`, `/dashboard` is Darkest of Mines while `/` still follows the system theme.
- An existing shared handout at `/share/<token>` matches its look from before this phase, including category background and font.

---

## Phase 2: Theme switch

### Overview

The four signed-in headers get one control. Choosing a theme stores it, updates the current page, and leaves that choice for a later visit.

### Changes Required

#### 1. `src/lib/chrome-theme.ts`

**File:** `src/lib/chrome-theme.ts`

**Intent:** One writer for the stored choice and the live attribute.

**Contract:** `selectChromeTheme(theme)` writes `theme` to `localStorage` under `CHROME_THEME_STORAGE_KEY` and sets `document.documentElement.dataset.chromeTheme` to that id. It accepts only `tower-of-light` or `darkest-of-mines`. Export it at the end of the file.

#### 2. `src/components/molecules/ThemeSwitch.tsx`

**File:** `src/components/molecules/ThemeSwitch.tsx`

**Intent:** The named control for the four headers.

**Contract:** A named export `ThemeSwitch`, exported at the end of the file. It renders two buttons labeled `Tower of Light` and `Darkest of Mines`. Do not read `document` during render. Read `data-chrome-theme` in `useEffect` after mount. Server HTML renders both buttons with `aria-pressed="false"`. After mount, the button for `document.documentElement.dataset.chromeTheme` has `aria-pressed="true"` and the other has `aria-pressed="false"`. Activating a theme calls `selectChromeTheme`. Activating the already active theme does not write again. Use `cn()` for class names. Import the lib through `@/lib/chrome-theme`.

#### 3. The four headers

**File:** `src/pages/dashboard.astro`, `src/components/organisms/HandoutEditor.tsx`, `src/pages/settings.astro`

**Intent:** Put that control in the header the GM already sees.

**Contract:** Mount `<ThemeSwitch client:load />` in the dashboard action row at `dashboard.astro` lines 85-109, before the New handout link. Mount it beside the title in `HandoutEditor.tsx` lines 174-176, which covers new and edit. Mount it beside the Settings title at `settings.astro` lines 13-18. Do not mount it on landing, auth, share, or account-closed.

### Success Criteria

#### Automated Verification

- `selectChromeTheme("darkest-of-mines")` sets `localStorage` `handouts-chrome-theme` to `darkest-of-mines` and sets `document.documentElement.dataset.chromeTheme` to that id. `selectChromeTheme("tower-of-light")` does the same for Tower of Light.
- `npm test -- --project unit` passes `__tests__/lib/chrome-theme.test.ts`, and `npm run lint` passes.

#### Manual Verification

- On `/dashboard`, `/handouts/new`, an edit URL, and `/settings`, both theme names are visible and the active theme's button is pressed.
- Choosing the other theme updates the chrome without a navigation. A new tab and a later visit open `/dashboard` on that same theme.
- After a stored choice exists, `/`, `/auth/signin`, and `/auth/signup` still follow the system theme.
- The editor preview keeps the selected category background and font. A shared handout is unchanged.

---

## Testing Strategy

### Unit Tests

- `__tests__/lib/chrome-theme.test.ts` covers `resolveChromeTheme` for system mode, a valid stored choice, and an invalid stored value.
- The same file reads `src/layouts/Layout.astro` and `src/styles/global.css` and asserts the storage key, both theme ids, and the `html:not([data-chrome-theme="darkest-of-mines"])` prefix. Follow the source-read style in `__tests__/lib/fonts-css-sync.test.ts`.
- The same file covers `selectChromeTheme` against `localStorage` and `document.documentElement` in jsdom.

### Integration Tests

- None. The choice never reaches the database or an API route.

### Manual Testing Steps

1. Clear `localStorage` key `handouts-chrome-theme`. Set the operating system to light. Open `/dashboard` and `/auth/signin`. Both are Tower of Light.
2. Set the operating system to dark and reload both pages. Both are Darkest of Mines.
3. On `/dashboard`, choose Tower of Light while the system theme is dark. The dashboard becomes light. Reload `/dashboard`. It stays light. Open `/` . It stays dark.
4. Open `/settings`, `/handouts/new`, and an edit page. Each shows Tower of Light pressed. Choose Darkest of Mines on Settings. Open a new tab to `/dashboard`. It is dark, and Darkest of Mines is pressed.
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
- [x] 1.6 The same test asserts every `.moon-chrome` rule in `src/styles/global.css` is prefixed with `html:not([data-chrome-theme="darkest-of-mines"])`. 860614b
- [x] 1.7 `npm run lint` passes. 860614b

#### Manual

- [ ] 1.8 With `localStorage` cleared, a light system theme shows Tower of Light on `/dashboard` and `/auth/signin`. A dark system theme shows Darkest of Mines on those two pages.
- [ ] 1.9 After `handouts-chrome-theme` is `darkest-of-mines`, `/dashboard` is Darkest of Mines while `/` still follows the system theme.
- [ ] 1.10 An existing shared handout at `/share/<token>` matches its look from before this phase, including category background and font.

### Phase 2: Theme switch

#### Automated

- [x] 2.1 `selectChromeTheme("darkest-of-mines")` sets `localStorage` `handouts-chrome-theme` to `darkest-of-mines` and sets `document.documentElement.dataset.chromeTheme` to that id. `selectChromeTheme("tower-of-light")` does the same for Tower of Light. 259878a
- [x] 2.2 `npm test -- --project unit` passes `__tests__/lib/chrome-theme.test.ts`, and `npm run lint` passes. 259878a

#### Manual

- [ ] 2.3 On `/dashboard`, `/handouts/new`, an edit URL, and `/settings`, both theme names are visible and the active theme's button is pressed.
- [ ] 2.4 Choosing the other theme updates the chrome without a navigation. A new tab and a later visit open `/dashboard` on that same theme.
- [ ] 2.5 After a stored choice exists, `/`, `/auth/signin`, and `/auth/signup` still follow the system theme.
- [ ] 2.6 The editor preview keeps the selected category background and font. A shared handout is unchanged.
