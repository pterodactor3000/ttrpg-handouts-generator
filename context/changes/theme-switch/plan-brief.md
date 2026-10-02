# Theme switch Plan Brief

> Full plan: `context/changes/theme-switch/plan.md`
> Roadmap item: `context/foundation/roadmap.md` (S-15)

## What and Why

A signed-in GM can switch the app chrome between Tower of Light and Darkest of Mines. The browser keeps that choice, and every view uses it. The control is one toggle. Darkest of Mines is darker than `#333333` and keeps the same corner radius. Handout category art stays as it is. This is FR-016.

## Starting Point

Moon light chrome is hardcoded with `moon-chrome` on landing, auth, the dashboard, the editor, Settings, and account-closed. `:root` is already the warm-dark palette, and nothing reads the system theme or stores a choice.

## Desired End State

Settings shows one toggle. The active theme name is on the control. A later visit, a new tab, and every other view keep the choice. With no choice stored, pages follow light or dark from the system. Darkest of Mines is near-black and keeps the light theme's corner radius. Handout category art does not change.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Who switches | Signed-in GM, on dashboard, new, edit, and Settings | Landing and the shared page are outside that control | Roadmap, FR-016 |
| Default | System theme until a choice exists | A light system is Tower of Light. A dark system is Darkest of Mines | Roadmap |
| Landing and auth | Follow the stored choice. With no choice, follow the system theme | The toggle changes the whole app | User, 2026-10-02 |
| Memory | `localStorage` until the GM changes it | A new tab and a later visit keep the choice | Plan |
| Control | One toggle on Settings. The label is the active theme | The other pages only show the chosen theme | User, 2026-10-02 |
| Themes | Tower of Light is Moon chrome. Darkest of Mines is darker than `#333333` and keeps the same radius | The warm gray was not dark enough, and dark mode was dropping the radius | User, 2026-10-02 |

## Scope

**In scope:**

- Resolve the theme before first paint on landing, sign-in, sign-up, confirm-email, dashboard, new, edit, and Settings.
- Store the GM's choice in this browser and apply it on every view.
- Add one toggle on Settings.
- Darken Darkest of Mines past `#333333` and keep corner radius in both themes.

**Out of scope:**

- Handout category backgrounds, borders, and fonts.
- A third theme.
- Saving the choice on the server.

## Approach

Tower of Light tokens apply unless `<html data-chrome-theme="darkest-of-mines">` is set. That attribute sets a darker chrome. `.moon-chrome` geometry, including radius, stays on in both themes. A blocking head script sets the attribute from `localStorage` or the system theme. The toggle writes the same key and attribute.

## Phases at a Glance

| Phase | Deliverable | Key risk |
| --- | --- | --- |
| 1. Theme resolution | Pages paint the resolved theme before first paint | A late script flashes the wrong theme |
| 2. Theme switch | Settings can change and remember the choice | The preview or share page picks up chrome tokens |

## Risks and Assumptions

- The boot script must run in the head, before the body is parsed.
- Account-closed and confirm-email use the same stored choice as the rest of the app.
- Confirm-email follows that choice with the other auth pages.

## Success Criteria

- A signed-in GM can switch every view between Tower of Light and Darkest of Mines, and a later visit keeps that choice.
- With no stored choice, pages follow the system theme.
- Darkest of Mines is darker than `#333333` and keeps the same corner radius.
- The category preview does not change.
