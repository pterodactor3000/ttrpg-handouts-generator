---
project: TTRPG Handouts Generator
version: 1
status: draft
created: 2026-05-26
updated: 2026-05-30
prd_version: 1
main_goal: speed
top_blocker: time
---

# Roadmap: TTRPG Handouts Generator

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Physical TTRPG handouts get lost after distribution — players rely on incomplete notes, GMs lose access to what they created. This product solves that with a focused handout manager: GMs write markdown content over a themed background image, preview it, and share it via a permanent link. The link becomes the source of truth; players open it on any device without logging in.

## North star

**S-01: First handout creation and sharing** — validates the core hypothesis: the foundational belief that GMs will find value in composing themed handouts and sharing permanent links with players. Sequenced first under `main_goal: speed` so rendering-pipeline complexity surfaces in week 1, not week 3.

> "North star" as used here: the smallest end-to-end slice whose successful delivery proves the product's core hypothesis — placed before all other slices in the dependency order because everything else only matters if this pipeline works. "Core hypothesis" means the single belief the product depends on that, if wrong, makes the rest pointless; here: that a GM can compose a themed handout and players can reliably open it via a permanent link on any device.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-01 | `handout-schema` | (foundation) `handouts` table with state-machine columns and RLS policies in place; share tokens are unguessable UUIDs | — | FR-001, FR-003, FR-005, FR-006, FR-008, FR-010, Business Logic | done |
| S-01 | `first-handout-creation-and-sharing` | create a new handout (markdown + background + tags), see a rendered preview, and share it via a permanent link that players can open in read-only mode | F-01 | US-01, FR-003, FR-004, FR-005, FR-006, FR-009, FR-010, FR-011 | proposed |
| S-02 | `handout-dashboard` | view a list of their handouts (draft and published) with titles and tags | S-01 | FR-002 | proposed |
| S-03 | `edit-handout` | open an existing handout, modify content, regenerate the preview, and save (edits on published handouts propagate immediately to the live shared link) | S-02 | FR-007 | proposed |
| S-04 | `delete-handout` | delete a handout from the dashboard (soft-delete to archived state; shared link remains active for players) | S-02 | FR-008 | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Core value proof | `F-01` → `S-01` | Schema unlocks the north star; shipping S-01 validates the full create → share pipeline. |
| B | Handout management | `S-02` → `S-03` / `S-04` | Follows after S-01 (joins Stream A at S-01). S-03 and S-04 are parallel; either can be planned independently. |

## Baseline

What's already in place in the codebase as of `2026-05-26` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro+React+Tailwind wired; 1 shadcn/ui component; landing + dashboard stub only; no handout UI (`src/pages/index.astro`, `src/pages/dashboard.astro`)
- **Backend / API:** partial — 3 auth API routes (signin/signup/signout) + auth middleware present; no handout-specific routes (`src/pages/api/auth/`, `src/middleware.ts`)
- **Data:** partial — Supabase client + SSR auth wired; zero migrations; no handout schema (`src/lib/supabase.ts`, `supabase/config.toml`)
- **Auth:** present — Supabase SSR client, API routes, middleware with protected `/dashboard`, signin/signup/confirm-email UI (`src/lib/supabase.ts`, `src/middleware.ts`, `src/pages/api/auth/`)
- **Deploy / infra:** partial — `wrangler.jsonc` configured for Cloudflare Workers; no GitHub Actions workflow on disk (manual `npx wrangler deploy` works for MVP)
- **Observability:** partial — Cloudflare Workers observability flag in `wrangler.jsonc` only; no in-app logging or error tracking

## Foundations

### F-01: Handout schema & migrations

- **Outcome:** (foundation) Supabase `handouts` table with full state-machine columns (id, gm_id → auth.users, title, markdown_content, background_category, tags, status, share_token/UUID, created_at, published_at) and row-level security policies — GMs see only their own rows; unauthenticated reads are allowed only via share token — is in place and migrated.
- **Change ID:** `handout-schema`
- **PRD refs:** Business Logic (draft→published→archived state machine), FR-001 (gm_id foreign key to auth.users), FR-003, FR-005, FR-006, FR-008, FR-010, NFR link-permanence (soft-delete never destroys a published share token)
- **Unlocks:** S-01, S-02, S-03, S-04
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sequenced first because every vertical slice depends on the handout table. The RLS policy must cover two access patterns — GM-owned rows (email/password session) and share-token reads (anonymous) — and must correctly prevent archived rows from blocking player access. A mismatch here would violate the link-permanence NFR.
- **Status:** done

## Slices

### S-01: First handout creation and sharing

- **Outcome:** GM can create a new handout (markdown text + background category + tags), see a rendered preview composited over the chosen background image, and share it via a permanent link that players can open on any device in read-only mode without logging in.
- **Change ID:** `first-handout-creation-and-sharing`
- **PRD refs:** US-01, FR-003, FR-004, FR-005, FR-006, FR-009, FR-010, FR-011, NFR response-time (generation < 5 s), NFR mobile-responsive (player read-only page), NFR link-permanence (UUID share token, active even after archive), NFR browser-compatibility
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The rendering approach (markdown + CSS overlay vs. server-side HTML generation) will determine whether the < 5 s generation NFR is easy or hard to meet. A client-side CSS solution is lower-risk than a server-side image pipeline. This is `/10x-plan`'s call, but sequenced first because if the rendering path is harder than expected it must surface in week 1, not week 3.
- **Status:** proposed

### S-02: Handout dashboard

- **Outcome:** GM can view a list of all their handouts (draft and published) with titles and tags, and navigate to create a new handout or open an existing one.
- **Change ID:** `handout-dashboard`
- **PRD refs:** FR-002
- **Prerequisites:** S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Straightforward list view; the main sequencing reason is that S-03 (edit) and S-04 (delete) both need a navigation surface into existing handouts.
- **Status:** proposed

### S-03: Edit handout

- **Outcome:** GM can open an existing handout from the dashboard, modify markdown text, background category, or tags, regenerate the preview, and save (edits on published handouts propagate immediately to the live shared link per Business Logic).
- **Change ID:** `edit-handout`
- **PRD refs:** FR-007
- **Prerequisites:** S-02
- **Parallel with:** S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Edit re-opens the same editor built in S-01 with pre-populated values; the main risk is that draft/published status display stays consistent after save. The Business Logic rule that "edits on published handouts propagate immediately" means there is no versioning or staging step — simplifies implementation but requires the RLS policy from F-01 to allow GM writes on published rows.
- **Status:** proposed

### S-04: Delete handout

- **Outcome:** GM can delete a handout from the dashboard; the handout moves to archived state, disappears from the GM's active list, and the shared link remains accessible to players.
- **Change ID:** `delete-handout`
- **PRD refs:** FR-008
- **Prerequisites:** S-02
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Simplest slice; the critical correctness is in F-01 — the RLS policy must allow share-token reads on archived rows, not just published ones. If F-01 gets that right, this slice is a UI confirmation dialog + a status-update API call.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | `handout-schema` | Add handouts table with state-machine schema and RLS | yes | Run `/10x-plan handout-schema` |
| S-01 | `first-handout-creation-and-sharing` | First handout creation, preview, and link sharing | no | Depends on F-01; run `/10x-plan first-handout-creation-and-sharing` after F-01 is done |
| S-02 | `handout-dashboard` | Handout dashboard list view | no | Depends on S-01 |
| S-03 | `edit-handout` | Edit existing handout | no | Depends on S-02; parallel with S-04 |
| S-04 | `delete-handout` | Delete (soft-archive) handout | no | Depends on S-02; parallel with S-03 |

## Open Roadmap Questions

None — all PRD open questions were resolved during shaping (`prd.md` states: "All critical decisions were resolved during shaping. Quality check status: accepted."). No new cross-cutting questions surfaced during roadmap decomposition.

## Parked

- **Custom background upload** — Why parked: PRD §Non-Goals. Three pre-loaded themes (fantasy / horror / scifi) are the MVP constraint.
- **Collaborative editing** — Why parked: PRD §Non-Goals. Single-GM ownership for v1.
- **Analytics / tracking** — Why parked: PRD §Non-Goals. Read-only links are anonymous; no analytics infrastructure for MVP.
- **PDF / PNG file export** — Why parked: PRD §Non-Goals. Link-only sharing for v1.
- **WYSIWYG editor** — Why parked: PRD §Non-Goals. Markdown-only for v1.
- **Version history** — Why parked: PRD §Non-Goals. Edits overwrite immediately; rollback is deferred.
- **OAuth login** — Why parked: FR-001 is satisfied by email/password (already present in codebase); OAuth is an optional enhancement deferred to v2 per the PRD Socrates note on FR-001.
- **GitHub Actions CI/CD** — Why parked: `main_goal: speed`. `npx wrangler deploy` works for MVP; Cloudflare Pages native CI is the intended v1 deploy path (`context/deployment/deploy-plan.md`). A workflow file can be added after the MVP ships.

## Done

(Empty on first generation. `/10x-archive` appends an entry here — and flips that item's `Status` to `done` — when a change whose `Change ID` matches the item is archived.)

- **F-01: (foundation) Supabase `handouts` table with full state-machine columns (id, gm_id → auth.users, title, markdown_content, background_category, tags, status, share_token/UUID, created_at, published_at) and row-level security policies — GMs see only their own rows; unauthenticated reads are allowed only via share token — is in place and migrated.** — Archived 2026-05-30 → `context/archive/2026-05-28-handout-schema/`. Lesson: —.
