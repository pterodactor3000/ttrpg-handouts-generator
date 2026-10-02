---
change_id: unarchive-handout
title: Restore an archived handout to draft or published
status: archived
created: 2026-10-01
updated: 2026-10-02
archived_at: 2026-10-02T07:50:35Z
roadmap_id: S-14
---

## Notes

Roadmap S-14. Planned on 2026-10-01. Linear TEC-23.

- Complexity: Medium.
- One Restore control on an archived card opens a choice dialog.
- Draft keeps the existing share token. The public page stops serving that handout until it is published again.
- Published runs the same title, content, and background checks as publish. An existing token stays. A missing token is minted.
- `archived_at` is cleared. `published_at` is set only when a published restore finds it null.
- A failed publish check leaves the handout archived and keeps the dialog open.
- A success moves the card into the Drafts or Published list and stays on the page. A minted token gets a title link and a copy button from the mover.
- A BEFORE UPDATE trigger rejects an update that leaves the row archived. Archived cards render the Edit link hidden so the mover can show it.
