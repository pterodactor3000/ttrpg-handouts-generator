# Unarchive Handout: Plan Brief

> Full plan: `context/changes/unarchive-handout/plan.md`

## What & Why

A GM can restore an archived handout to draft or published from the Archived list. Published reopens the existing player link. Draft keeps that token stored, and the public page stops serving the handout until it is published again. The current update policy blocks every write to an archived row, so this slice adds a restore path instead of reusing publish.

## Starting Point

Archive sets `status` and `archived_at`. Publish always mints a new `share_token`. Archived cards show Delete and hide Edit. The share page serves published and archived handouts only.

## Desired End State

The GM opens Restore, chooses a target, and the card leaves Archived. Draft shows Edit and Archive, with no copy control. Published shows the same player link when one already existed. A failed publish check stays in the dialog and leaves the handout archived.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Choice UI | One Restore dialog | It matches Archive and Delete, and it can explain the share link. |
| Draft link | Keep the token, stop serving it | The next publish can reuse the token, and drafts are not public today. |
| `archived_at` | Clear it | The column means the handout is currently archived. |
| Publish checks | Same checks as publish, no write on failure | Restore cannot publish a handout the publish button would reject. |
| After success | Move the card into Drafts or Published | The GM stays on the dashboard, and the card leaves the Archived list. |
| Copy control | Hidden while status is draft | The public page is not serving that handout. |
| Failed publish | Dialog stays open | The GM can switch to draft without starting over. |
| Proof | Integration tests plus a manual pass | The policy and the screen both have to hold. |
| Missing token | Mint one only on published restore | A published handout with no token has no player link. |

## Scope

**In scope:**

- Update policy for archived rows the GM owns
- `POST /api/handouts/[id]/unarchive`
- Restore dialog on archived cards
- In-place card move, including a title link and copy button when a token is minted

**Out of scope:**

- Editing title, body, or tags from the Archived list
- Replacing an existing share token
- Clearing `published_at` or `scheduled_deletion_at`
- Showing drafts on the share page

## Architecture / Approach

The route reads the archived row, applies the publish checks when the target is published, then updates `status` and `archived_at` under the new policy. A BEFORE UPDATE trigger rejects an update that leaves an archived row archived. The dialog calls that route. The card mover updates the badge and the actions. When a token is minted onto a card that has no copy control, the mover adds the title link and a copy button.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Restore record | Policy, route, and integration tests | A policy that still cannot update an archived row, or a write that replaces the token |
| 2. Restore control | Dialog, card move, and the manual pass | The card shows a copy control for a draft, or a new token never appears |

**Prerequisites:** S-04 and S-12 are already in the product. Branch `feature/S-14-unarchive-handout` starts from current `main`.

**Estimated effort:** one session across 2 phases.

## Open Risks & Assumptions

- The new policy allows any column change in the same update as the status change. The route must send only the restore fields. The trigger blocks an update that keeps `status` as `archived`.
- A minted token is drawn by the mover as a title link and a copy button. The next full load renders `CopyLinkButton`.

## Success Criteria (Summary)

- An archived handout can become a draft or a published handout, and `archived_at` is cleared.
- An existing player link survives published restore and goes quiet for draft restore.
- A publish check failure stays in the dialog, and the handout stays archived.
