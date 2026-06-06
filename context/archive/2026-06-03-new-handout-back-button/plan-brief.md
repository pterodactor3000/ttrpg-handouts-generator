# New-Handout Back Button — Plan Brief

> Full plan: `context/changes/new-handout-back-button/plan.md`

## What & Why

Add a clear "Back to dashboard" control to the new-handout editor (`/handouts/new`) so a GM can return to `/dashboard` without relying on the browser back button or submitting the form (roadmap S-06, FR-013). Today there is no in-page navigation on this screen at all.

## Starting Point

`/handouts/new` mounts the `HandoutEditor` React island inside a bare `Layout` with no navigation affordance. All editable state (`title`, `markdownContent`, `backgroundCategory`, `tags`, plus `handoutId` / `shareToken`) already lives inside the island, so unsaved-edit detection needs no new wiring.

## Desired End State

A "← Back to dashboard" control sits above the title field. It navigates to `/dashboard` immediately when the form is clean, and opens a "Discard unsaved changes?" confirmation when there are unsaved edits — Cancel keeps the GM in place with state intact, Discard leaves. The dirty/clean/cancel/confirm logic is covered by automated unit tests.

## Key Decisions Made

| Decision               | Choice                                                  | Why (1 sentence)                                                                 | Source |
| ---------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- | ------ |
| Unsaved-edits behavior | Confirm only when dirty                                 | Protects in-progress markdown without nagging on an empty or already-saved form. | Plan   |
| Placement              | Inside `HandoutEditor`, near the title heading          | The island owns the dirty state, so the flow stays in one component.             | Plan   |
| Dirty definition       | Current fields differ from last persisted state         | Matches user intuition — warns only when real work would be lost.                | Plan   |
| Affordance             | Ghost button: arrow + "Back to dashboard"               | Reuses the `Button` atom and `lucide-react`; clearly labeled, not a bare icon.   | Plan   |
| Testing                | RTL unit tests now; e2e harness split to its own change | Keeps this a LOW slice; e2e infra is cross-cutting and serves all slices.        | Plan   |

## Scope

**In scope:** in-page back control on `/handouts/new`; confirm-on-dirty dialog (reusing the existing Radix `dialog` atom); dirty-state tracking; jsdom + React Testing Library unit tests.

**Out of scope:** Playwright/e2e harness (separate change); global `Topbar`/nav bar; native `beforeunload` guard; any save/publish/data/API change; editor restyle (S-05).

## Architecture / Approach

Everything stays inside the `HandoutEditor` island. A `savedSnapshot` baseline of the four editable fields is initialized to the empty form and refreshed on each successful save; `isDirty` is derived by comparing current values to that baseline. The back control's click handler navigates (`window.location.href = '/dashboard'`) when clean, or opens a controlled confirmation `Dialog` (same pattern as `ShareDialog`) when dirty. Phase 1 ships behavior; Phase 2 adds unit tests, isolating jsdom to the new test file via a `// @vitest-environment jsdom` docblock so the existing node-env renderer test is untouched.

## Phases at a Glance

| Phase                              | What it delivers                                      | Key risk                                                         |
| ---------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| 1. Back control + confirm-on-dirty | The labeled control + dirty-gated confirmation dialog | Saved-then-untouched form must read as clean (baseline refresh). |
| 2. Unit tests (jsdom + RTL)        | Automated clean/dirty/cancel/confirm coverage         | Introducing jsdom without breaking the existing node-env test.   |

**Prerequisites:** S-01 (`first-handout-creation-and-sharing`) is done; no other dependency.
**Estimated effort:** ~1 session across 2 phases.

## Open Risks & Assumptions

- Confirm-on-dirty relies on correctly refreshing the saved baseline; if missed, a saved form would falsely warn.
- jsdom + React Testing Library are new to the repo; the global vitest environment stays `node` and jsdom is opted into per-file.
- Navigation in tests is asserted via a `window.location` stub since jsdom does not perform real navigation.

## Success Criteria (Summary)

- A GM can return to the dashboard from the new-handout view via a clear, labeled in-page control.
- Unsaved markdown is never lost silently — a confirmation appears only when there are real unsaved edits.
- The interaction logic is guarded by passing automated unit tests, with the existing test suite still green.
