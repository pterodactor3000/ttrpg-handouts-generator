# New-Handout Back Button Implementation Plan

## Overview

Add an explicit "Back to dashboard" control to the new-handout editor (`/handouts/new`) so a GM can return to `/dashboard` without using the browser back button or submitting the form. To avoid silently discarding in-progress markdown, the control navigates immediately when the form is clean but shows a confirmation dialog when there are unsaved edits.

This is roadmap slice **S-06** (`new-handout-back-button`), satisfying FR-013, supporting FR-002 (return to the handout list) and FR-003 (handout creation flow). It is a post-MVP polish slice over the shipped S-01 surface; no flows, data model, or API change.

## Current State Analysis

- `src/pages/handouts/new.astro` is a thin shell that wraps `<HandoutEditor client:load />` in `Layout` and renders **no** navigation affordance (`src/pages/handouts/new.astro:6-8`).
- `src/components/organisms/HandoutEditor.tsx` is a React island holding all form state — `title`, `markdownContent`, `backgroundCategory`, `tags`, plus persistence flags `handoutId`, `shareToken` (`HandoutEditor.tsx:14-25`). Because all editable values live in React state, "unsaved edits" is fully knowable inside this component without prop plumbing.
- The editor renders an `<h1>New Handout</h1>` heading as the top element of its layout (`HandoutEditor.tsx:101`) — the natural anchor for a back control.
- The dashboard navigates *into* the editor with a plain `<a href="/handouts/new">` (`dashboard.astro:18-23`); `/dashboard` is the destination for "back".
- An existing Radix dialog atom (`src/components/atoms/dialog.tsx`) is already used by `ShareDialog.tsx` via the controlled `open` / `onOpenChange` pattern (`ShareDialog.tsx:44-80`) — the same primitive fits the unsaved-edits confirmation.
- The `Button` atom (`src/components/atoms/button.tsx`) provides `ghost` / `link` / `outline` variants and merges classes through `cn()`.
- Tests: only `src/lib/__tests__/handout-renderer.test.ts` exists; vitest runs in a **`node`** environment (`vitest.config.ts:10-12`) and there is **no** React Testing Library, jsdom, or Playwright in `package.json`.

## Desired End State

On `/handouts/new`, a clearly labeled "← Back to dashboard" control sits above the editor's title field. Clicking it:

- navigates to `/dashboard` immediately when the form has no unsaved edits;
- opens a confirmation dialog ("Discard unsaved changes?") when the form is dirty, where **Cancel** keeps the GM on the page with state intact and **Discard** navigates to `/dashboard`.

A handout is considered dirty when the current form fields differ from the last persisted state (a fresh, untouched form is clean; a successfully saved form with no further edits is clean again). The dirty/clean/cancel/confirm interactions are covered by automated unit tests running under a jsdom environment, leaving the existing node-env test untouched.

### Key Discoveries:

- All editable state is local to `HandoutEditor.tsx:14-25`, so the back control + dirty check live in one component (no cross-component wiring) — confirmed by reading the island.
- The controlled-dialog pattern to reuse is `ShareDialog.tsx:44-80` (`Dialog` + `DialogContent` + `DialogFooter` from `@/components/atoms/dialog`).
- Switching the global vitest `environment` from `node` (`vitest.config.ts:11`) would affect the existing renderer test; a per-file `// @vitest-environment jsdom` docblock isolates the jsdom requirement to the new component test.
- `lucide-react` is already a dependency (`package.json:30`), so an `ArrowLeft` icon is available without adding a package.

## What We're NOT Doing

- Not adding a Playwright / browser e2e harness in this change — that is split into its own change (see Backlog Handoff) so the harness decision serves all slices, not just this button.
- Not adding the unused `Topbar.astro` to the new-handout page, and not building a global navigation bar.
- Not guarding the native browser back/refresh/close (`beforeunload`) — scope is the in-page control only.
- Not changing the editor's save/publish/share behavior, the data model, or any API route.
- Not restyling the editor (that is S-05, `ui-restyle`).

## Implementation Approach

Keep everything inside the `HandoutEditor` island. Track the last-persisted form values as a baseline snapshot (initialized to the empty form, refreshed on each successful save). Derive `isDirty` by comparing the current field values to that baseline. The back control is a ghost `Button` with an `ArrowLeft` icon and the label "Back to dashboard"; its click handler navigates to `/dashboard` when clean, or opens a controlled confirmation `Dialog` when dirty. Confirming in the dialog performs the navigation; cancelling closes the dialog and leaves all state untouched.

Phase 1 ships the behavior. Phase 2 adds the automated unit coverage, which requires introducing jsdom + React Testing Library and isolating the jsdom environment to the new test file.

## Critical Implementation Details

- **State sequencing** — the baseline snapshot must be refreshed inside the successful-save branch of `handleSave` (after `setHandoutId`, on the same success path at `HandoutEditor.tsx:59-61`). If the baseline is only initialized once, a saved-then-untouched form would still read as dirty.
- **Debug & observability** — the existing renderer test relies on the `node` environment (`vitest.config.ts:11`). The new component test MUST opt into jsdom per-file (docblock `// @vitest-environment jsdom`) rather than flipping the global `environment`, or the renderer test's environment assumptions change unintentionally.

## Phase 1: Back control + confirm-on-dirty

### Overview

Add the back-to-dashboard control and the unsaved-edits confirmation flow inside `HandoutEditor`.

### Changes Required:

#### 1. Dirty-state tracking

**File**: `src/components/organisms/HandoutEditor.tsx`

**Intent**: Track the last-persisted form values so the component can tell whether the GM has unsaved edits. A fresh untouched form and a just-saved form both read as clean; any edit relative to the persisted values reads as dirty.

**Contract**: A `savedSnapshot` baseline (the four editable fields: `title`, `markdownContent`, `backgroundCategory`, `tags`) initialized to the empty form values, refreshed to the current values inside the successful-save branch of `handleSave` (`HandoutEditor.tsx:59-61`). A derived `isDirty` boolean compares current field values to the baseline (order-independent for `tags`).

#### 2. Back control + confirmation dialog

**File**: `src/components/organisms/HandoutEditor.tsx`

**Intent**: Render a ghost "← Back to dashboard" button above the title field. Clicking navigates to `/dashboard` when clean; when dirty, it opens a confirmation dialog whose Discard action navigates and whose Cancel action closes the dialog leaving state intact.

**Contract**: A `Button` (`variant="ghost"`) with an `ArrowLeft` icon (from `lucide-react`, already a dependency) placed before `HandoutEditor.tsx:101`. Navigation uses `window.location.href = '/dashboard'`. A controlled confirmation `Dialog` reusing `@/components/atoms/dialog` following the `ShareDialog.tsx:44-80` pattern, gated by a new `confirmBackOpen` state; the confirm button performs navigation, the cancel button sets `confirmBackOpen` to false. Exports remain at end of file per repo convention.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx astro check`
- Linting passes: `npm run lint`
- Production build succeeds: `npm run build`

#### Manual Verification:

- On a fresh `/handouts/new`, clicking "Back to dashboard" navigates straight to `/dashboard` with no prompt.
- After typing a title and/or markdown, clicking back opens the confirmation dialog; Cancel keeps the page with all entered text intact; Discard lands on `/dashboard`.
- After clicking "Save draft" and making no further edits, clicking back navigates with no prompt.
- The control is keyboard-focusable, clearly labeled, and visible above the title field.

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation that the manual testing succeeded before proceeding to Phase 2.

---

## Phase 2: Unit tests (jsdom + React Testing Library)

### Overview

Add automated coverage for the back control's clean/dirty/cancel/confirm interactions, introducing the React component testing tooling the repo currently lacks without disturbing the existing node-env test.

### Changes Required:

#### 1. Test tooling

**File**: `package.json`

**Intent**: Add the dev dependencies needed to render and interact with a React island in tests.

**Contract**: Add `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, and `jsdom` to `devDependencies`. No change to the `test` script (`package.json:13`).

#### 2. jsdom environment isolation

**File**: `src/components/organisms/__tests__/HandoutEditor.test.tsx` (new)

**Intent**: Run the component test under jsdom while leaving the global vitest environment as `node` so the existing renderer test is unaffected.

**Contract**: New colocated test file opening with the docblock `// @vitest-environment jsdom`. The `@/` alias already resolves in `vitest.config.ts:5-8`, so no config change is required.

#### 3. Interaction tests

**File**: `src/components/organisms/__tests__/HandoutEditor.test.tsx` (new)

**Intent**: Verify the data-loss-prevention behavior that is the slice's core risk.

**Contract**: Tests covering — (a) clicking back on a clean form triggers navigation to `/dashboard`; (b) typing content then clicking back opens the confirmation dialog instead of navigating; (c) Cancel in the dialog closes it and leaves typed content present; (d) Discard in the dialog triggers navigation to `/dashboard`. Navigation is asserted by stubbing `window.location` (or an injected navigate seam) since jsdom does not perform real navigation — this stub is the one non-obvious test mechanic.

### Success Criteria:

#### Automated Verification:

- New and existing tests pass: `npm run test`
- The existing `handout-renderer.test.ts` still passes under the node environment (no global env regression).
- Linting passes: `npm run lint`
- Type checking passes: `npx astro check`

#### Manual Verification:

- Test names clearly describe the clean / dirty / cancel / confirm scenarios.

**Implementation Note**: After this phase and all automated verification passes, pause for manual confirmation before considering the slice complete.

---

## Testing Strategy

### Unit Tests:

- Back control renders above the title field.
- Clean form → back navigates without a dialog.
- Dirty form (typed title or markdown) → back opens the confirmation dialog.
- Dialog Cancel → dialog closes, entered content preserved.
- Dialog Discard → navigation to `/dashboard`.

### Integration Tests:

- Deferred to the separate Playwright e2e harness change (see Backlog Handoff): full `dashboard → new → back` round-trip in a real browser.

### Manual Testing Steps:

1. From `/dashboard`, click "+ New handout", then immediately click "Back to dashboard" — expect to land on `/dashboard` with no prompt.
2. Click "+ New handout", type a title and some markdown, click back — expect the confirmation dialog; click Cancel and verify text is intact; click back again and Discard, verify you land on `/dashboard`.
3. Click "+ New handout", type content, click "Save draft", then click back — expect no prompt (form is clean relative to the saved state).
4. Tab to the back control with the keyboard and activate it with Enter/Space.

## Performance Considerations

None. The dirty check is a shallow comparison of four small fields on click (or per render); no network, storage, or heavy computation is involved.

## Migration Notes

None — no data, schema, or API changes.

## References

- Roadmap slice S-06: `context/foundation/roadmap.md:143-154`
- PRD FR-013: `context/foundation/prd.md:111`
- Editor island to modify: `src/components/organisms/HandoutEditor.tsx:14-25, 101`
- Controlled-dialog pattern to reuse: `src/components/organisms/ShareDialog.tsx:44-80`
- Button atom variants: `src/components/atoms/button.tsx:11-19`
- Vitest config (node env): `vitest.config.ts:10-12`

## Backlog Handoff

- **New change — e2e test harness**: introduce Playwright (or equivalent) and an end-to-end test for the `dashboard → new → back` round-trip. Scoped as its own change because the harness is cross-cutting infrastructure that benefits all slices, not just this button. Run `/10x-new e2e-test-harness` to open it.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Back control + confirm-on-dirty

#### Automated

- [x] 1.1 Type checking passes: `npx astro check` — 95c6df2
- [x] 1.2 Linting passes: `npm run lint` — 95c6df2
- [x] 1.3 Production build succeeds: `npm run build` — 95c6df2

#### Manual

- [x] 1.4 Clean form: back navigates to `/dashboard` with no prompt — 95c6df2
- [x] 1.5 Dirty form: back opens dialog; Cancel preserves content; Discard navigates — 95c6df2
- [x] 1.6 Saved-then-untouched form: back navigates with no prompt — 95c6df2
- [x] 1.7 Control is keyboard-focusable, labeled, and visible above the title — 95c6df2

### Phase 2: Unit tests (jsdom + React Testing Library)

#### Automated

- [x] 2.1 New and existing tests pass: `npm run test` — ed08450
- [x] 2.2 Existing `handout-renderer.test.ts` still passes under node env — ed08450
- [x] 2.3 Linting passes: `npm run lint` — ed08450
- [x] 2.4 Type checking passes: `npx astro check` — ed08450

#### Manual

- [x] 2.5 Test names clearly describe clean / dirty / cancel / confirm scenarios — ed08450
