# Dashboard Drawer Navigation Plan Brief

> Full plan: `context/changes/dashboard-drawer-nav/plan.md`
> Roadmap item: `context/foundation/roadmap.md` (S-12)

## What and Why

The dashboard shows drafts and published handouts in one list and archived handouts in a second list. S-12 replaces that with one status at a time, chosen from a left drawer, so Archived is a filter instead of a second section on the same page.

## Starting Point

`/dashboard` already loads every handout and splits them with `partitionHandouts` into active and archived. Archive updates the DOM by moving a card into the archived grid and stripping the `hidden` class. There is no drawer.

## Desired End State

A GM lands on Drafts, opens Filters, and can switch to Published or Archived. Pin holds the drawer open beside the grid on a wide window until refresh. Narrow windows keep an overlay. Archived cards stay read-only.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Complexity | Medium | Drawer, one visible status, and the existing archive mover | Plan |
| First filter | Drafts | Outcome lists Drafts first | Plan |
| Pin storage | Session memory | Roadmap risk calls in-memory the v1 path. Refresh returns to Drafts | Roadmap, plan |
| Pin layout | Sidebar at 768px and up, overlay below | A sidebar on a phone squeezes the tile grid | Plan |
| Archived actions | Read-only, no unarchive | S-14 owns restore | Roadmap |
| Data | Filter the rows already loaded | Status column already exists. No schema change | Roadmap, code |
| Unpinned drawer | Closes after a choice | Overlay should not stay on top of the list | Plan |

## Scope

**In scope:**

- Three status lists, default Drafts
- Left overlay with Drafts, Published, Archived
- Session pin that becomes a sidebar at 768px and up
- Archive and permanent delete still move or remove the card without changing the selected filter

**Out of scope:**

- S-11 tile styling
- S-14 unarchive
- S-13 account deletion
- `localStorage` or a URL filter
- Schema or API changes

## Approach

Group the SSR rows by status and hide the other lists with the `hidden` attribute. A header React island writes the selected status onto the dashboard root and portals the panel into a slot. It does not wrap the Astro lists. Pin is React state plus a pure presentation function.

## Phases at a Glance

| Phase | Deliverable | Key risk |
| --- | --- | --- |
| 1. Three status lists | Only Drafts visible, empty copy per status, archive does not reveal Archived | The archive mover strips the `hidden` class |
| 2. Drawer filters | Overlay chooses one status and closes | Island must not wrap the Astro lists |
| 3. Session pin | Sidebar on wide screens, overlay on narrow, gone after refresh | Pin must not write `localStorage` |

## Risks and Assumptions

- Filter visibility uses the `hidden` attribute so the existing class removal in `archive-handout-card-dom.ts` cannot reveal the wrong list.
- 768px matches the dashboard's `md` padding breakpoint.
- A full document load is what "refresh" means. Client-side memory does not survive it.

## Success Criteria

- First paint shows only drafts.
- Each drawer choice shows only that status.
- Pin holds a sidebar at 768px and up until refresh, and stays an overlay below that width.
- Archiving a draft does not open the Archived list.
