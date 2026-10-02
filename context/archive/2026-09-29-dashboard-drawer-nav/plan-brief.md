# Dashboard Drawer Navigation Plan Brief

> Full plan: `context/changes/dashboard-drawer-nav/plan.md`
> Roadmap item: `context/foundation/roadmap.md` (S-12)

## What and Why

The dashboard shows drafts and published handouts in one list and archived handouts in a second list. S-12 replaces that with one status at a time, chosen from a left drawer, so Archived is a filter instead of a second section on the same page.

## Starting Point

`/dashboard` already loads every handout and splits them with `partitionHandouts` into active and archived. Archive updates the DOM by moving a card into the archived grid and stripping the `hidden` class. There is no drawer.

## Desired End State

A GM lands on Drafts. At 768px and up the drawer stays open as a sidebar, with no pin control. On a narrower window an icon opens an overlay, and choosing a status closes it. Archived cards stay read-only.

## Key Decisions Made

| Decision         | Choice                                             | Why                                                                            | Source        |
| ---------------- | -------------------------------------------------- | ------------------------------------------------------------------------------ | ------------- |
| Complexity       | Medium                                             | Drawer, one visible status, and the existing archive mover                     | Plan          |
| First filter     | Drafts                                             | Outcome lists Drafts first                                                     | Plan          |
| Wide layout      | Sidebar at 768px and up, no pin                    | A sidebar on a phone squeezes the tile grid. Wide screens keep the drawer open | change.md     |
| Narrow layout    | Icon opens an overlay. Choosing a status closes it | The overlay should not stay on top of the list                                 | change.md     |
| Archived actions | Read-only, no unarchive                            | S-14 owns restore                                                              | Roadmap       |
| Data             | Filter the rows already loaded                     | Status column already exists. No schema change                                 | Roadmap, code |

## Scope

**In scope:**

- Three status lists, default Drafts
- Left overlay with Drafts, Published, Archived
- Wide sidebar at 768px and up, with no pin control
- Narrow overlay opened by an icon
- Archive and permanent delete still move or remove the card without changing the selected filter

**Out of scope:**

- S-11 tile styling
- S-14 unarchive
- S-13 account deletion
- `localStorage` or a URL filter
- Schema or API changes

## Approach

Group the SSR rows by status and hide the other lists with the `hidden` attribute. A header React island writes the selected status onto the dashboard root. The wide sidebar portals into a slot. The narrow overlay portals onto the dashboard root. It does not wrap the Astro lists. Width decides presentation. A wide viewport is a sidebar. A narrow viewport is an overlay. Empty copy hides when the grid contains an `article`, so leftover whitespace does not hide it.

## Phases at a Glance

| Phase                 | Deliverable                                                                  | Key risk                                    |
| --------------------- | ---------------------------------------------------------------------------- | ------------------------------------------- |
| 1. Three status lists | Only Drafts visible, empty copy per status, archive does not reveal Archived | The archive mover strips the `hidden` class |
| 2. Drawer filters     | Overlay chooses one status and closes                                        | Island must not wrap the Astro lists        |
| 3. Wide sidebar       | Sidebar on wide screens, overlay on narrow                                   | No pin and no `localStorage`                |

## Risks and Assumptions

- Filter visibility uses the `hidden` attribute so the existing class removal in `archive-handout-card-dom.ts` cannot reveal the wrong list.
- 768px matches the dashboard's `md` padding breakpoint.
- A full document load is what "refresh" means. Client-side memory does not survive it.

## Success Criteria

- First paint shows only drafts.
- Each drawer choice shows only that status.
- At 768px and up the drawer stays open as a sidebar. Below that width it is an overlay opened by an icon.
- Archiving a draft does not open the Archived list.
