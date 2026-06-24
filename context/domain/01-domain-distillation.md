---
title: Domain Distillation — TTRPG Handouts Generator
created: 2026-06-24
type: domain-distillation
---

# Domain Distillation — TTRPG Handouts Generator

## Step 0 — Project Context

### Source documents

| Document | Path | Role |
| -------- | ---- | ---- |
| PRD | `context/foundation/prd.md` | Vision, functional requirements, business logic, non-goals |
| Roadmap | `context/foundation/roadmap.md` | Vertical slices, state-machine extensions (S-14 unarchive, S-13 account purge) |
| Shape notes | `context/foundation/shape-notes.md` | Original shaping narrative (superseded by PRD for most decisions) |
| README | `README.md` | Product summary, MVP scope |
| Tech stack | `context/foundation/tech-stack.md` | Astro 6 SSR, Supabase, Cloudflare Workers |
| Change history | `context/archive/*`, `context/changes/*` | Implementation narratives for shipped slices |

Requirements documents exist and are authoritative. This distillation treats `prd.md` as the primary domain source and uses code as the implementation truth.

### Stack and repository structure

| Layer | Location | Business relevance |
| ----- | -------- | ------------------ |
| API / persistence | `src/pages/api/handouts/`, Supabase migrations | Handout CRUD, publish, archive; state transitions |
| Read models / pages | `src/pages/dashboard.astro`, `src/pages/share/[token].astro`, `src/pages/handouts/` | GM library view, player read-only view |
| Presentation logic | `src/lib/handout-renderer.ts`, `src/lib/backgrounds.ts`, `src/lib/fonts.ts` | Markdown → HTML, themed rendering |
| UI orchestration | `src/components/organisms/HandoutEditor.tsx` | Create/edit/preview/share workflow |
| Auth gate | `src/middleware.ts`, `src/pages/api/auth/` | GM session; players bypass auth via share route |
| Types (DTOs) | `src/types.ts` | Handout entity shape; no domain layer |

**Observation:** There is no `src/lib/domain/` or service layer. Business rules live in API route handlers, SQL RLS policies, and React UI guards. The database schema is the strongest expression of domain invariants.

---

## Step 1 — Ubiquitous Language

| Term | Definition | Source quote | Code location |
| ---- | ---------- | ------------ | ------------- |
| **Handout** | A themed markdown document owned by one GM; the central entity of the product. | "The handout is the source of truth, not scattered notes." — `context/foundation/prd.md:20` | `src/types.ts:5-17`, `supabase/migrations/20260528200000_create_handouts_table.sql:9-21` |
| **GM (Game Master)** | Primary persona; authenticated user who creates, edits, publishes, and archives handouts. | "Every logged-in user is a GM managing their own handouts." — `context/foundation/prd.md:147` | `supabase/migrations/...sql:11` (`gm_id`), `src/middleware.ts:8` (`PROTECTED_ROUTES`) |
| **Player** | Secondary persona; consumes a handout via read-only share link without logging in. | "Players access handouts via read-only shareable links (no login required)." — `context/foundation/prd.md:34` | `src/pages/share/[token].astro:28-33` |
| **Draft** | Initial handout state: visible only to owning GM, no share link yet, fully editable. | "When a GM creates a handout, it starts as **draft** … no shareable link yet." — `context/foundation/prd.md:139` | `handout_status` enum — `...sql:5,16`; default `'draft'` — `...sql:16` |
| **Published** | Handout has an active share link; still editable by GM; edits propagate to shared view immediately. | "Once the GM generates a share link, the handout transitions to **published**." — `context/foundation/prd.md:141` | `src/pages/api/handouts/[id]/publish.ts:85-87` |
| **Archived** | Soft-deleted state: hidden from GM active list, read-only for GM, share link still works for players. | "the handout moves to **archived** … shared link remains active" — `context/foundation/prd.md:143` | `src/pages/api/handouts/[id]/archive.ts:38-40`; RLS — `...sql:52-54` |
| **Share token** | Unguessable UUID granting anonymous read access to a published/archived handout. | "links are unguessable UUIDs" — `context/foundation/prd.md:110` | `share_token uuid unique` — `...sql:17`; generated — `publish.ts:79` |
| **Share link / permanent link** | URL `/share/{share_token}`; read-only HTML view for players. | "clicks 'share' to receive a permanent read-only link" — `context/foundation/prd.md:40` | `HandoutEditor.tsx:163-167` builds URL; `share/[token].astro` serves it |
| **Background category / style category** | One of three preset visual themes applied to a handout. DB enum: `fantasy`, `horror`, `scifi`. UI labels: High Fantasy, Eldritch, Grimdark. | "selects one of three pre-loaded category backgrounds (grimdark / high fantasy / postapo)" — `prd.md:40` (legacy prose); canonical enum in migration | `src/types.ts:3`, `src/lib/backgrounds.ts:3-19`, `src/lib/fonts.ts:8-12` |
| **Markdown content** | GM-authored text rendered to safe HTML over the themed background. | "Write markdown text over themed background images" — `README.md:11` | `markdown_content` column — `...sql:13`; `handout-renderer.ts:19-22` |
| **Tags** | Flat labels for organizing handouts across sessions. | "Tag handouts for easy reference across sessions" — `README.md:14` | `tags text[]` — `...sql:15`; `TagsInput.tsx` — **NOT verified line-by-line** |
| **Preview** | On-demand rendered view of markdown composited over selected background (not live keystroke preview). | "preview is on-demand (generate button), not live/realtime" — `context/foundation/prd.md:106` | `HandoutEditor.tsx:85-86,289-310` (client-side, always visible while editing) |
| **Link permanence** | NFR: shared links stay active ≥365 days and survive archive. | "Shared links remain active for a minimum of 365 days … Links do not break when handouts are archived." — `prd.md:130-131` | Partially enforced: RLS allows anon read on archived — `...sql:52-54`; **365-day auto-archive NOT in code** |
| **Soft delete** | GM "delete" moves handout to archived, not hard removal. | "delete a handout from their list" (Secondary success criteria) — `prd.md:51`; Business Logic — `prd.md:143` | `ArchiveButton.tsx:29` → `archive.ts`; distinct from hard DELETE — `[id].ts:112-119` |
| **Hard delete** | Permanent removal of an already-archived handout row. | **NOT in PRD** as user-facing term; exists in roadmap/S-04 implementation | `src/pages/api/handouts/[id].ts:112-119`, `DeleteHandoutButton.tsx:30` |
| **GM library / dashboard** | GM's list of owned handouts partitioned into active (draft+published) and archived. | "GM can view a list of their created handouts" — `prd.md:74` | `dashboard.astro:20-33`, `handout-list.ts:8-29` |
| **Privacy / ownership** | Each GM sees only their own handouts until explicitly shared. | "Handouts are private to the creating GM until explicitly shared via link." — `prd.md:55` | RLS `gm_select_own` — `...sql:31-33`; `gm_id = auth.uid()` on all GM writes |
| **Markdown safety** | User-supplied markdown must not allow XSS. | "Markdown rendering is safe (no XSS or script injection)" — `prd.md:56` | `handout-renderer.ts:12-13` (`rehypeSanitize`) |

---

## Step 2 — Subdomain Classification

| Concept / area | Category | Justification |
| -------------- | -------- | ------------- |
| Handout lifecycle (draft → published → archived) | **Core** | Defines the product's unique value: permanent, shareable session artifacts with controlled visibility (`prd.md:133-143`, Success Criteria) |
| Share link + anonymous player read | **Core** | Core hypothesis in roadmap: "players can reliably open it via a permanent link" (`roadmap.md:28-30`) |
| Themed rendering (background + preset font/color) | **Core** | Differentiator vs generic note apps; FR-005, FR-009, FR-014 |
| Markdown → safe HTML rendering | **Core** | Guardrail NFR and primary content format (`prd.md:56`, FR-004) |
| Tags and dashboard organization | **Supporting** | Enables multi-handout management (FR-002, FR-006) but not the core share hypothesis |
| Auth / session (email+password GM login) | **Supporting** | Required for ownership and privacy; not the product's competitive edge (`prd.md:147-149`) |
| Account deletion / purge (S-13) | **Supporting** | Planned lifecycle extension; not yet in code |
| Unarchive (S-14) | **Supporting** | Planned state-machine extension beyond original PRD archive semantics |
| Supabase SSR client, Astro routing, Cloudflare deploy | **Generic** | Infrastructure; interchangeable with other BaaS/edge stacks |
| shadcn/ui components, Tailwind styling | **Generic** | Presentation framework; no handout-specific rules |
| Sentry error reporting | **Generic** | Cross-cutting observability |

---

## Step 3 — Aggregate Candidates and Invariants

### Aggregate 1: **Handout** (root aggregate)

| Invariant | Source | Enforcement status |
| --------- | ------ | ------------------- |
| A handout is owned by exactly one GM (`gm_id`) and ownership cannot change | `prd.md:154` (single-GM ownership); RLS comment — `...sql:42` | **Enforced** — RLS `with check (gm_id = auth.uid())` — `...sql:46` |
| New handouts start in `draft` with no `share_token` | `prd.md:139` | **Enforced** — DB default `status 'draft'`, `share_token` nullable — `...sql:16-17` |
| Only `draft` handouts can be published (first publish) | Implied by "no shareable link yet" — `prd.md:139-141` | **Enforced** — `publish.ts:52` (`.eq('status', 'draft')`) |
| Publishing requires non-empty title, content, and background category | Implied by share readiness — `prd.md:62-64` | **Enforced** — `publish.ts:65-77` |
| Publishing assigns a new UUID `share_token` and sets `published_at` | `prd.md:141`, FR-010 | **Enforced** — `publish.ts:79-87` |
| Published handouts remain editable; edits propagate immediately to shared view | `prd.md:141` | **Declared in docs; weakly enforced** — PUT updates row in place (`[id].ts:62-74`); no versioning layer; shared page reads same row (`share/[token].astro:28-33`) |
| Archived handouts are read-only for GM (no edits) | `prd.md:143` | **Enforced** — API `.neq('status', 'archived')` on PUT — `[id].ts:72`; RLS `status <> 'archived'` — `...sql:45`; `load-handout-for-edit.ts:43` |
| GM "delete" is soft-delete to `archived`; share link stays live | `prd.md:143`, FR-008 | **Enforced** — `archive.ts:38-40`; anon RLS includes archived — `...sql:54` |
| Share links work for both `published` and `archived` statuses | NFR link permanence — `prd.md:130-131` | **Enforced** — `share/[token].astro:32`; RLS `status in ('published', 'archived')` — `...sql:54` |
| Draft handouts are never readable via share token | Privacy — `prd.md:55` | **Enforced** — anon RLS excludes draft — `...sql:54`; share page filters same — `share/[token].astro:32` |
| Handout auto-archives 365 days after publication | Business Logic — `prd.md:135,143` | **NOT enforced in code** — no cron, no query filter, no scheduled job found in `src/` |
| Archived handouts can be restored (unarchive) | Roadmap S-14 — `roadmap.md:291-300` | **NOT in code** — no unarchive API or UI |
| Account purge kills shared links after 30 days | Roadmap S-13 — `roadmap.md:279-288` | **NOT in code** |

### Aggregate 2: **Style presentation** (value object cluster, not a separate aggregate)

| Invariant | Source | Enforcement status |
| --------- | ------ | ------------------- |
| Exactly three preset background categories | FR-005, Non-Goals — `prd.md:153` | **Enforced** — Postgres enum — `...sql:6`; Zod enum — `index.ts:11` |
| Each category has preset font and color (not user-selected) | FR-014 — `prd.md:123` | **Enforced** — `fonts.ts:8-12`; applied via `HandoutArticle` `data-category` |
| Category display labels map DB enum to user-facing names | Archive plan notes label correction | **Enforced** — `backgrounds.ts:4-17` (`fantasy`→High Fantasy, `horror`→Eldritch, `scifi`→Grimdark) |

### Aggregate 3: **GM account** (minimal; auth.users)

| Invariant | Source | Enforcement status |
| --------- | ------ | ------------------- |
| GM authenticates via email/password | FR-001 — `prd.md:70` | **Enforced** — `src/pages/api/auth/signin.ts`, `signup.ts` (**existence verified via glob; not line-read**) |
| OAuth login | FR-001 Socrates note — `prd.md:72` | **NOT in code** — parked in roadmap |
| Each GM sees only own handouts | `prd.md:55,147-149` | **Enforced** — RLS policies — `...sql:31-46` |

---

## Step 4 — Model vs Code Divergence

| Document says | Code does | Evidence | Severity |
| ------------- | --------- | -------- | -------- |
| Handouts auto-archive after 365 days from publication | No automated transition; only manual archive via UI/API | `grep 365` → only `publish.ts:87` sets `published_at`; no scheduler | **High** — NFR link permanence partially met (archive keeps link) but auto-archive rule missing |
| FR-001: OAuth available | Email/password only | Roadmap parked OAuth — `roadmap.md:335`; auth routes are signin/signup/signout only | **Medium** — deferred, documented |
| PRD prose categories: grimdark / high fantasy / postapo | DB enum: `fantasy` / `horror` / `scifi`; labels High Fantasy / Eldritch / Grimdark | `prd.md:40` vs `...sql:6`, `backgrounds.ts:3-18` | **Low** — intentional mapping layer; archive documents canonical contract |
| "Delete" = soft archive only | Two-step: archive (soft) + hard DELETE on archived rows | `archive.ts` vs `[id].ts:112-119`, `HandoutCard.astro:67-70` | **Medium** — extra capability beyond PRD; hard delete removes share link permanently |
| Archived handouts read-only for GM | Hard delete allows GM to permanently remove archived handout | `[id].ts:112-119` DELETE on `status = 'archived'` | **Medium** — violates spirit of link permanence if GM hard-deletes |
| Preview is on-demand ("generate" button) | Preview column updates live as user types (client-side `useMemo`) | `HandoutEditor.tsx:85-86,289-310` | **Low** — UX differs from FR-009 wording; still client-side, no server round-trip |
| Business logic in domain layer | Rules scattered across API routes, RLS, UI | No `src/lib/services/` or domain module | **High** — knowledge exists in PRD/SQL but not as cohesive model |
| `Handout` (snake_case DB) vs `InitialHandout` (camelCase UI) linked at compile time | Parallel types with manual mapping | `types.ts:5-27`, `load-handout-for-edit.ts:15-24` | **Medium** — drift risk (TD-7 in refactor research) |
| Publish validation errors as strings | Zod tree objects returned on save validation failure | `index.ts:45`, `HandoutEditor.tsx:113` | **Medium** — active UX bug per `refactor-opportunities/research.md:74-75` |
| S-14: unarchive archived → draft/published | Not implemented | Roadmap `proposed` — `roadmap.md:291-301`; RLS blocks GM update on archived — `...sql:45` | **Planned gap** |
| S-13: account soft-delete + 30-day purge | Not implemented | Roadmap `ready` — `roadmap.md:278-288` | **Planned gap** |

---

## Step 5 — Refactor Ranking

Candidates ranked by **core invariant value** (how central to product hypothesis) × **enforcement gap** (how poorly the codebase expresses or guards the rule today).

| Rank | Target | Core value | Risk / gap | Rationale |
| ---- | ------ | ---------- | ---------- | --------- |
| **#1** | **Handout lifecycle aggregate** — extract state machine (draft/publish/archive/edit guards) into a dedicated domain module | Highest — entire product is the handout state machine | Rules duplicated across 4 API files, RLS, UI, and editor; 365-day rule absent; hard-delete contradicts permanence NFR | Centralizing transitions would make invariants explicit, testable, and ready for S-14 unarchive without further sprawl |
| **#2** | **Link permanence invariant** — clarify and enforce: archived readable, hard-delete policy, future account purge | High — "permanent link" is the north-star promise | Hard DELETE exists (`[id].ts:112`); auto-archive missing; purge not built | Without a single permanence policy, player links can silently break |
| **#3** | **Shared validation + typing layer** (`handoutInputSchema`, Supabase generated types) | Medium — supports correctness of aggregate commands | Duplicated schema (`index.ts:8-13`, `[id].ts:8-13`); 9 stringly-typed DB call sites | Structural debt that makes aggregate extraction harder (TD-1, TD-2) |
| **#4** | **Style presentation value object** (`BackgroundCategory` + font/background config) | Medium — themed rendering is core differentiator | Config split across `backgrounds.ts`, `fonts.ts`, CSS; enum/display-name mapping undocumented in code | Low refactor risk; improves ubiquitous language alignment |
| **#5** | **GM library read model** (`partitionHandouts`, dashboard queries) | Lower — supporting subdomain | Simple, already extracted to `handout-list.ts` | Stable; defer until aggregate work lands |

### Recommended first refactor: **Handout lifecycle aggregate (#1)**

The handout state machine is the product's core domain. Today its rules are implicit: spread across SQL RLS (`gm_update_non_archived`), three API handlers (create, update, publish, archive, delete), middleware auth, and UI disable logic (`HandoutEditor.tsx:251`). A single `Handout` domain module owning allowed transitions (`draft→published`, `*→archived`, future `archived→draft|published`) would:

1. Surface the missing 365-day auto-archive as an explicit gap or scheduled command
2. Resolve the hard-delete vs link-permanence tension with one policy
3. Provide the insertion point for S-14 unarchive without touching every API route again
4. Make integration tests assert domain rules instead of HTTP status codes alone

---

## Repository map (business logic hotspots)

```
context/foundation/prd.md          ← domain vocabulary & rules (authoritative)
supabase/migrations/*.sql          ← invariants at persistence boundary (RLS + enums)
src/pages/api/handouts/            ← command handlers (create, update, publish, archive, delete)
src/lib/handout-renderer.ts        ← markdown safety + rendering
src/lib/backgrounds.ts + fonts.ts  ← style category presentation
src/components/organisms/HandoutEditor.tsx  ← GM workflow orchestration
src/pages/share/[token].astro      ← player read model
src/middleware.ts                  ← GM route protection (not player share routes)
```
