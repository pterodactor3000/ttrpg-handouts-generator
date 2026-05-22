---
project: TTRPG Handouts Generator
context_type: greenfield
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  frs_drafted: 11
  quality_check_status: accepted
created: 2026-05-22
updated: 2026-05-22
timeline_budget:
  mvp_weeks: 3
  hard_deadline: 2026-06-30
  after_hours_only: true
product_type: web-app
target_scale:
  users: small
---

## Vision & Problem Statement

Physical TTRPG handouts get lost after distribution. Players rely on incomplete notes they took from the original handout; game masters lose access to handouts they created and distributed. The data is trapped — either lost entirely or fragmented across player notes. Existing tools (VTTs, note apps) are too complex for the single job of creating, managing, and sharing handouts.

This product provides a focused handout manager: GMs create handouts with markdown support against a background image, preview them, export to file (PNG/PDF) or shareable link, and manage them with tags for easy retrieval. Players access handouts via read-only links. The handout is the source of truth, not scattered notes.

## User & Persona

**Primary persona**: Game master (yourself)

The GM creates handouts during pre-session prep or mid-session. They need:
- Fast handout creation (markdown text over background image)
- Instant preview before sharing
- Export to file or shareable link for distribution
- Persistent access to handouts for future sessions or revisions
- Organization by tags / categories so handouts don't pile into an unsearchable list

Secondary persona (read-only consumer): Players who receive handout links and need to reference them later without losing them.

## Access Control

**Auth model**: Login (email + password or OAuth). Every logged-in user is a GM managing their own handouts.

**Role separation**: Flat model. No roles within logged-in users — each GM sees only their own handouts. Players access handouts via read-only shareable links (no login required for read-only consumers).

## Success Criteria

### Primary

GM logs in, clicks 'create handout', selects one of three pre-loaded category backgrounds (grimdark / high fantasy / postapo), types markdown text into textbox, adds tags, clicks generate, sees rendered handout preview (markdown composited over background with default font), clicks 'share' to receive a permanent read-only link. The link opens an HTML page showing the handout in read-only mode.

**MVP scope decisions** (scoped down from initial flow):
- No PDF export (shareable link only for v1)
- No font selection (single default font)
- No background upload (3 fixed pre-loaded images)
- No file export to PNG (link-only sharing)

### Secondary

GM can delete a handout from their list.

### Guardrails

- **Privacy**: Handouts are private to the creating GM until explicitly shared via link. No other GM can see another GM's handouts.
- **Markdown safety**: Markdown rendering is safe (no XSS or script injection via user-supplied markdown).

## Functional Requirements

### Authentication & Access
- FR-001: GM can log in with email/password or OAuth. Priority: must-have
  > Socrates: Counter-argument considered: "OAuth adds integration complexity; email/password alone would ship faster." Resolution: kept for v1, but OAuth may be deferred to v2 if it blocks the 3-week timeline.

- FR-002: GM can view a list of their created handouts. Priority: must-have
  > Socrates: Counter-argument considered: "If handouts are few, a list view is overhead; go straight to create." Resolution: kept; list is needed for multi-handout management even if initial count is low.

### Handout Creation & Editing
- FR-003: GM can create a new handout. Priority: must-have
  > Socrates: No counter-argument; it stands as written.

- FR-004: GM can enter markdown text into the handout editor. Priority: must-have
  > Socrates: Counter-argument considered: "Raw markdown is unfriendly; WYSIWYG editor would be easier for non-technical GMs." Resolution: kept; markdown is simpler to implement for MVP and target persona (yourself) is comfortable with it.

- FR-005: GM can select a category background (grimdark / high fantasy / postapo). Priority: must-have
  > Socrates: Counter-argument considered: "Three categories are too limiting; users will want more themes." Resolution: kept as MVP constraint; custom upload deferred to v2.

- FR-006: GM can add tags to categorize a handout. Priority: must-have
  > Socrates: Counter-argument considered: "Folders/campaigns would organize better than flat tags." Resolution: kept; tags are simpler for v1, folder hierarchy is a v2 consideration.

- FR-007: GM can edit an existing handout. Priority: must-have
  > Socrates: Counter-argument considered: "Edit without version history could destroy a good handout by accident." Resolution: kept; version history deferred to v2, GM is sole user so accidental overwrites are recoverable.

- FR-008: GM can delete a handout. Priority: must-have
  > Socrates: Counter-argument considered: "Delete is must-have, not nice-to-have — without it handouts pile up forever." Resolution: promoted from nice-to-have to must-have.

### Preview & Sharing
- FR-009: GM can generate a rendered preview of the handout. Priority: must-have
  > Socrates: Counter-argument considered: "If generation is expensive (backend render), preview-on-every-keystroke kills performance." Resolution: kept; preview is on-demand (generate button), not live/realtime, to manage cost.

- FR-010: GM can share a handout via a permanent read-only link. Priority: must-have
  > Socrates: Counter-argument considered: "Permanent public links are a security risk; need expiration or access codes." Resolution: kept as permanent for v1; links are unguessable UUIDs. Expiration/access codes deferred to v2 if abuse occurs.

- FR-011: Player can view a shared handout via read-only link (no login required). Priority: must-have
  > Socrates: Counter-argument considered: "Read-only HTML page might render poorly on mobile (where players actually use it)." Resolution: kept; mobile-responsive HTML is a must for player experience — this becomes a design constraint.

## User Stories

### US-01: Share handout via link

**Given** the GM has created a handout with markdown text, category background, and tags  
**When** the preview is visible and handout is readable  
**Then** the GM can click 'share' to generate a permanent link to share with players

## Business Logic

**Core workflow rule**: The app moves handouts through draft → published → archived states, transitioning to published when a share link is generated and to archived when the handout ages past 365 days or is manually soft-deleted.

**How the user encounters it**:

When a GM creates a handout, it starts as **draft** (visible only to them in their handout list). The handout exists but has no shareable link yet. The GM can edit, preview, and refine it.

Once the GM generates a share link, the handout transitions to **published**. The link becomes active and can be distributed to players. The handout remains in the GM's active list and can still be edited (edits propagate to the shared link immediately).

After 365 days from publication, or when the GM clicks "delete", the handout moves to **archived**. The shared link remains active (players can still view it), but the handout is hidden from the GM's active list and appears instead in a separate "Archived" list. Archived handouts are read-only for the GM — no further edits allowed.

## Non-Functional Requirements

- **Response time**: Handout generation completes in < 5 seconds as perceived by the user (from clicking "generate" to seeing the preview).
- **Mobile responsive**: Read-only handout pages (accessed via shared link) render correctly on mobile devices (phones, tablets) where players typically consume them.
- **Link permanence**: Shared links remain active for a minimum of 365 days from publication. Links do not break when handouts are archived.
- **Browser compatibility**: The app works in modern browsers (Chrome, Firefox, Safari, Edge — last 2 major versions).

## Non-Goals

- **Custom background upload**: GMs are restricted to 3 pre-loaded category themes (grimdark, high fantasy, postapo) for v1. Custom background upload adds file storage, validation, and UI complexity that would push beyond the 3-week timeline.
- **Collaborative editing**: No multi-GM co-authoring of a single handout. Each handout is owned and edited by one GM only. Collaboration features (shared ownership, edit permissions) are deferred to v2+.
- **Analytics/tracking**: No visibility into which players viewed which handouts, when, or how often. Read-only links are anonymous. Analytics would require player identification (login or tracking cookies) and analytics infrastructure.
- **PDF/PNG file export**: No download-to-file capability for v1. Sharing is link-only. File export requires backend rendering (headless browser / image generation) which adds complexity and cost.
- **WYSIWYG editor**: Markdown-only for v1. WYSIWYG editors (rich text) require more complex state management and increase implementation time.
- **Version history**: Edits overwrite the previous version immediately. No rollback, no audit trail, no version comparison. Version history requires storage of all past states and a UI to browse/restore them.

## Scale Insight

At 100x scale (hundreds of GMs instead of a handful):
- Hosting infrastructure would need to support high traffic (concurrent handout generation, link views)
- Security posture would need hardening (password storage, rate limiting, protection against credential leaks)
- Default 365-day link life might need to be configurable or shorter to manage storage costs

For the handful-of-users MVP, these constraints are manageable with simple hosting and basic security practices.
