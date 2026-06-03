---
project: TTRPG Handouts Generator
version: 1
status: draft
created: 2026-05-26
updated: 2026-05-31
# 2026-05-31: surgically added S-05 ui-restyle, S-06 new-handout-back-button, S-07 per-style-fonts (post-MVP polish stream)
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
| S-01 | `first-handout-creation-and-sharing` | create a new handout (markdown + background + tags), see a rendered preview, and share it via a permanent link that players can open in read-only mode | F-01 | US-01, FR-003, FR-004, FR-005, FR-006, FR-009, FR-010, FR-011 | done |
| S-02 | `handout-dashboard` | view a list of their handouts (draft and published) with titles and tags | S-01 | FR-002 | proposed |
| S-03 | `edit-handout` | open an existing handout, modify content, regenerate the preview, and save (edits on published handouts propagate immediately to the live shared link) | S-02 | FR-007 | proposed |
| S-04 | `delete-handout` | delete a handout from the dashboard (soft-delete to archived state; shared link remains active for players) | S-02 | FR-008 | proposed |
| S-05 | `ui-restyle` | see a refreshed, visually consistent UI across existing screens (dashboard, new-handout, preview, shared view) — improved typography, spacing, and color theming, no flow changes | S-01 | FR-012 | ready |
| S-06 | `new-handout-back-button` | return to the dashboard from the new-handout view via a clear back control, without submitting the form | S-01 | FR-013, FR-002 | ready |
| S-07 | `per-style-fonts` | see each handout style category (grimdark / high fantasy / postapo) rendered with its own preset font and font color, in both the preview and the shared read-only view | S-01 | FR-014, FR-005 | ready |
| S-08 | `landing-page` | see the app name on the landing page and a clear call-to-action to start the login flow (no auth required to view the page) | — | FR-015, FR-001 | ready |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Core value proof | `F-01` → `S-01` | Schema unlocks the north star; shipping S-01 validates the full create → share pipeline. |
| B | Handout management | `S-02` → `S-03` / `S-04` | Follows after S-01 (joins Stream A at S-01). S-03 and S-04 are parallel; either can be planned independently. |
| C | Polish & theming | `S-05` / `S-06` / `S-07` | Post-MVP enhancements over the shipped S-01 surface (joins Stream A at S-01). All three are independent and parallel; each can be planned on its own. |
| D | Entry & discovery | `S-08` | Standalone; no foundation or slice prerequisite. Gives unauthenticated visitors a meaningful first impression and entry into the auth flow. |

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
- **Status:** done

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

### S-05: UI restyle

- **Outcome:** GM (and players, on the shared read-only page) see a refreshed, visually consistent UI across the existing screens — dashboard, new-handout editor, preview, and shared view. Improvements are limited to typography, spacing, and color theming; no user flows change and no new screens are added.
- **Change ID:** `ui-restyle`
- **PRD refs:** FR-012, NFR mobile-responsive, NFR browser-compatibility
- **Prerequisites:** S-01
- **Parallel with:** S-06, S-07
- **Color scheme:** Apply this palette consistently across all restyled screens.
  - `#5E5E5E` — primary
  - `#B2675E` — accent
  - `#E3B5A4` — accent (light)
  - `#E3D5CA` — neutral (light)
  - `#C6AC8F` — neutral (warm)
  - `#F7F7F7` — light font
  - `#333333` — dark font
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Cross-cutting visual change touching every existing screen; the risk is regression of the already-shipped S-01 flows and the mobile-responsive shared page. Scope is deliberately capped to styling (no markup/flow changes) so the blast radius stays presentational.
- **Status:** ready

### S-06: Back navigation in new-handout view

- **Outcome:** GM can return from the new-handout creation view to the dashboard via a clear back control, without having to submit or discard through the browser back button.
- **Change ID:** `new-handout-back-button`
- **PRD refs:** FR-013, FR-002, FR-003
- **Prerequisites:** S-01
- **Parallel with:** S-05, S-07
- **Blockers:** —
- **Unknowns:**
  - Should leaving with unsaved edits warn the user, or navigate away silently? — Owner: user. Block: no.
- **Risk:** Smallest slice — a single navigation affordance. Main correctness is not silently losing in-progress markdown; the unsaved-edits prompt is the only open decision and does not block planning.
- **Status:** ready

### S-07: Per-style fonts & colors

- **Outcome:** Each handout style/background category (grimdark / high fantasy / postapo) renders with its own preset font family and font color, applied consistently in both the GM preview and the shared read-only view.
- **Change ID:** `per-style-fonts`
- **PRD refs:** FR-014, FR-005, FR-009, FR-011
- **Prerequisites:** S-01
- **Parallel with:** S-05, S-06, S-08
- **Blockers:** —
- **Unknowns:**
  - Which font families pair with each category, and are they self-hosted or loaded from a web-font CDN? — Owner: user. Block: no.
- **Risk:** Supersedes the original MVP "single default font" decision (PRD §Success Criteria). The load-bearing risk is web-font loading staying within the < 5 s generation NFR and the mobile-responsive shared page; self-hosting the fonts mitigates both. Fonts are preset per category, so this does not reopen the parked "user font selection" scope.
- **Status:** ready

### S-08: Landing page

- **Outcome:** Visitor (unauthenticated) sees the app name on the landing page and a clear call-to-action that starts the login flow; no login is required to view the page itself.
- **Change ID:** `landing-page`
- **PRD refs:** FR-015, FR-001
- **Prerequisites:** —
- **Parallel with:** S-05, S-06, S-07
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Standalone and independent; no data layer or auth flow change required — the CTA links to the existing sign-in page. Only risk is replacing the current placeholder `Welcome` component without breaking the Layout wrapper or the middleware redirect (authenticated users hitting `/` should still land on the dashboard).
- **Status:** ready

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | `handout-schema` | Add handouts table with state-machine schema and RLS | yes | Run `/10x-plan handout-schema` |
| S-01 | `first-handout-creation-and-sharing` | First handout creation, preview, and link sharing | no | Depends on F-01; run `/10x-plan first-handout-creation-and-sharing` after F-01 is done |
| S-02 | `handout-dashboard` | Handout dashboard list view | no | Depends on S-01 |
| S-03 | `edit-handout` | Edit existing handout | no | Depends on S-02; parallel with S-04 |
| S-04 | `delete-handout` | Delete (soft-archive) handout | no | Depends on S-02; parallel with S-03 |
| S-05 | `ui-restyle` | Visual UI restyle across existing screens | yes | S-01 done; run `/10x-plan ui-restyle` |
| S-06 | `new-handout-back-button` | Add back button to new-handout view | yes | S-01 done; run `/10x-plan new-handout-back-button` |
| S-07 | `per-style-fonts` | Per-style fonts and font colors for handouts | yes | S-01 done; run `/10x-plan per-style-fonts` |
| S-08 | `landing-page` | Landing page with app name and login entry point | yes | No prerequisites; run `/10x-plan landing-page` |

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
- **S-01: GM can create a new handout (markdown text + background category + tags), see a rendered preview composited over the chosen background image, and share it via a permanent link that players can open on any device in read-only mode without logging in.** — Archived 2026-05-31 → `context/archive/2026-05-30-first-handout-creation-and-sharing/`. Lesson: —.
