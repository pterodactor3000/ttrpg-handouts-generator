# Theme switch Plan Brief

> Full plan: `context/changes/theme-switch/plan.md`
> Roadmap item: `context/foundation/roadmap.md` (S-15)

## What and Why

A signed-in GM can switch the app chrome between Tower of Light and Darkest of Mines. The browser keeps that choice. Landing and auth keep following the system theme, and the shared handout stays as it is. This is FR-016.

## Starting Point

Moon light chrome is hardcoded with `moon-chrome` on landing, auth, the dashboard, the editor, Settings, and account-closed. `:root` is already the warm-dark palette, and nothing reads the system theme or stores a choice.

## Desired End State

The four signed-in screens show a two-name control in the existing header. The active theme is marked. A later visit and a new tab keep the choice. With no choice stored, those screens and the landing and auth pages follow light or dark from the system. The shared handout and category art do not change.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Who switches | Signed-in GM, on dashboard, new, edit, and Settings | Landing and the shared page are outside that control | Roadmap, FR-016 |
| Default | System theme until a choice exists | A light system is Tower of Light. A dark system is Darkest of Mines | Roadmap |
| Landing and auth | Follow the system theme and ignore the stored choice | Those pages have no switch | Roadmap |
| Memory | `localStorage` until the GM changes it | A new tab and a later visit keep the choice | Plan |
| Control | Same control in each existing header, both names visible | The four pages do not share a header | Plan |
| Themes | Tower of Light is Moon chrome. Darkest of Mines is `:root` | Both palettes already exist | Plan |

## Scope

**In scope:**

- Resolve the theme before first paint on landing, sign-in, sign-up, confirm-email, dashboard, new, edit, and Settings.
- Store the GM's choice in this browser and apply it on the four signed-in screens.
- Add the named switch to those four headers.

**Out of scope:**

- The shared handout.
- Handout category backgrounds, borders, and fonts.
- A third theme.
- The account-closed page.
- Saving the choice on the server.

## Approach

Scope the existing `.moon-chrome` rules so they turn off when `<html data-chrome-theme="darkest-of-mines">` is set. A blocking head script sets that attribute from the system theme or from `localStorage`. The switch writes the same key and attribute.

## Phases at a Glance

| Phase | Deliverable | Key risk |
| --- | --- | --- |
| 1. Theme resolution | Pages paint the resolved theme before first paint | A late script flashes the wrong theme |
| 2. Theme switch | The four headers can change and remember the choice | The preview or share page picks up chrome tokens |

## Risks and Assumptions

- The boot script must run in the head, before the body is parsed.
- Account-closed keeps today's light chrome because it never sets the theme attribute.
- Confirm-email follows the system theme with the other auth pages.

## Success Criteria

- A signed-in GM can switch the four screens between Tower of Light and Darkest of Mines, and a later visit keeps that choice.
- With no stored choice, those screens and landing and auth follow the system theme.
- The shared handout and the category preview do not change.
