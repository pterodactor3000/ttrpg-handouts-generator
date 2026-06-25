# Module 4 Architectural Report — TTRPG Handouts Generator

*Generated: 2026-06-24 | Sources: L2 repo map, L3 save-flow research, L4 refactor plan, L5 domain artifacts*

---

## 1. Described Projects

All four artifacts come from the same repository.

| Repo | Stack | Scale | Artifacts |
|------|-------|-------|-----------|
| **ttrpg-handouts-generator** | Astro 6 SSR, React 19, TypeScript, Tailwind 4, Supabase, Cloudflare Workers | ~195 commits, ~1 month history, solo maintainer | L2, L3, L4, L5 |

---

## 2. Repo Map — Key Findings (L2)

**Source:** `context/map/repo-map.md`

1. **Structural hubs.** `HandoutEditor.tsx` has the highest fan-out in the import graph and is the #2 file by git activity. `supabase.ts` has the highest fan-in (9 imports) — an auth mistake here hits every request.

2. **Risk zones.** Four flagged: (a) `HandoutEditor` — UI + fetch + preview + Sentry, mock-heavy to unit-test; (b) markdown sanitize pipeline in `handout-renderer.ts` — XSS boundary, isolated in graph but security-critical; (c) Supabase session + middleware — single client backing API, middleware, and SSR pages; (d) RLS + migrations — access rules live in SQL and integration tests, invisible to the TS import graph.

3. **Entry points.** `dashboard.astro` (GM library), `share/[token].astro` (player read), `handouts/[id]/edit.astro` (GM edit). All three are *unknown* to dependency-cruiser — `.astro` orchestration is a blind spot in the tooling.

4. **Import graph is clean; git co-change is noisy.** No circular dependencies in 61 TS/TSX modules. Atoms + molecules + organisms co-change as one subsystem in 5+ triple commits — theme and restyle work hits the full UI subtree.

5. **Key unknown.** Two `HandoutArticle` implementations (`.tsx` for editor preview, `.astro` for share page) represent the same concept in different stacks; tooling shows no coupling, but behavioural coupling is unverified.

---

## 3. Feature Analysis — Handout Save Flow (L3)

**Source:** `context/changes/post-flow-analysis/research.md`

**Flow chosen because:** `HandoutEditor` is the top-risk zone in the map (structural hub + client fetch + preview + Sentry). The save flow is the core command path that crosses every layer the map flags.

**Feature overview.** `HandoutEditor.tsx` maintains `handoutId` in component state. On save it issues `POST /api/handouts` (create) or `PUT /api/handouts/[id]` (update). Both API routes authenticate via `supabase.auth.getUser()`, validate the body with Zod `handoutInputSchema`, and write to Supabase with `gm_id` ownership guard. Success returns `{ id }`; `handoutId` is set/kept, dirty state clears. Two API files, one logical flow, no shared code.

**Technical debt (3 most important):**

| # | Risk | Evidence |
|---|------|----------|
| **TD-1** | `handoutInputSchema` defined identically in `index.ts:8-13` and `[id].ts:8-13` — schema drift possible with no compile-time safety net | Confirmed with `rg` — byte-for-byte identical definitions |
| **TD-3** | `SaveApiResponse.error` typed `string`; API returns `z.treeifyError()` object → renders `[object Object]` to user on validation failure | Active UX defect; `index.ts:45` + `HandoutEditor.tsx:113` |
| **TD-4** | PUT on wrong owner / archived handout → 0-row UPDATE → generic 500, not 404 | `[id].ts:76-83`; DELETE in same file correctly returns 404 at `:121-124` |

---

## 4. Refactor Plan (L4)

**Source:** `context/changes/refactor-opportunities/plan.md`

**What is being refactored.** TD-1 — extract `handoutInputSchema` to `src/lib/handout-schema.ts`. The two byte-for-byte identical schema definitions are replaced with one shared module export. An inferred `HandoutInput` type is also exported, making the camelCase field contract explicit for all consumers.

**Consciously NOT doing:** TD-3 (error serialization mismatch), TD-4 (PUT 500→404), TD-2 (generated Supabase types), TD-6 (TagsInput limits), TD-7 (Handout ↔ InitialHandout type link).

**Phases:**

| Phase | Action | Verification |
|-------|--------|--------------|
| 1.1 | Create `src/lib/handout-schema.ts`; update `index.ts` and `[id].ts` imports | `npm run lint` (auto) |
| 1.2 | Run integration test suite | `npm test -- --project integration` (auto) |
| 1.3 | Type-check | `npm run build` (auto) |
| 1.4–1.5 | Smoke: create handout via editor; edit existing handout | Manual |

---

## 5. Domain per DDD (L5)

**Sources:** `context/domain/01-domain-distillation.md`, `02-invariant-aggregate-refactor.md`, `03-anti-corruption-layer.md`

**Ubiquitous language — 5 key terms:**

| Term | Definition | Model vs code |
|------|-----------|---------------|
| **Handout** | Themed markdown doc, one GM owner, the central entity | ✓ aligned |
| **Draft / Published / Archived** | Lifecycle states; share link survives archive | Partially: 365-day auto-archive declared in `prd.md:135`, absent in code |
| **Share token** | Unguessable UUID granting anonymous player read | ✓ aligned |
| **Background category** | DB enum `fantasy/horror/scifi` | PRD prose says `grimdark/high-fantasy/postapo`; code maps to `High Fantasy/Eldritch/Grimdark` — intentional but undocumented divergence |
| **Soft delete / Hard delete** | PRD defines "delete" as soft-archive only; hard DELETE on archived rows also exists | `[id].ts:112-119` hard-deletes an archived row, breaking link permanence (INV-7) |

**Invariant #1 — INV-9** *(Legal handout lifecycle transitions):* Belongs to the **Handout** aggregate. Current state: transition rules are spread across 4 API files, SQL RLS, Astro page loaders, and React UI conditionals with no single authority. A `draft→published`, `{draft,published}→archived` state machine exists only implicitly. Proposed target: `Handout` aggregate class in `src/lib/domain/handout.ts` owns all transitions; API routes parse → delegate → map domain errors.

**Anti-Corruption Layer — which dependency leaks and through how many layers:**

The Supabase PostgREST query builder (`LD-1`) leaks through **6 layers** (API routes, Astro pages, lib loaders, types, middleware, UI types) across **12 production files** with **9 `.from('handouts')` query sites** and **6 duplicated hand-written row interfaces** (`Handout`, `HandoutPublishRow`, `HandoutEditRow`, `SharedHandoutRow`, `HandoutListItem`, and inline shapes in `[id].ts`). Domain distillation declares Supabase as "interchangeable generic infrastructure" (`01:76`), yet code speaks PostgREST dialect at every handout touchpoint. PostgREST error code `PGRST116` is handled inconsistently: `[id].ts:76-83` produces 500, `[id].ts:121-124` produces 404 — error semantics belong in an adapter, not in route handlers.

---

## 6. Decisions That Belong to Me

AI (Cogitator) surfaced all technical debt, ranked refactor candidates, and designed the aggregate + ACL target state. Three decisions required human judgment:

1. **Scope cap on L4.** AI ranked schema deduplication (TD-1) as #3 in overall value; the aggregate lifecycle refactor (#1) and link permanence policy (#2) are higher-leverage. I chose TD-1 as the L4 deliverable because it is the smallest safe structural change — it validates the extraction pattern before touching the state machine.

2. **Hard delete policy.** AI designed `permanentlyDelete()` to throw `HandoutLinkDestructionForbiddenError` when `share_token` is set, enforcing INV-7. Whether to forbid hard-delete entirely or allow it with explicit confirmation is a product decision: the `DeleteHandoutButton.tsx` already warns the user that the link breaks (`DeleteHandoutButton.tsx:69-70`). I have not resolved this yet; it is the open blocker for Phase 4 of the aggregate refactor.

3. **365-day auto-archive scope.** AI flagged the gap (INV-11 — not in code) and proposed a `HandoutArchiveScheduler` interface. I deferred this to a later slice because Cloudflare Workers would require a Cron Trigger binding not yet in `wrangler.toml`; the aggregate design keeps INV-11 as an explicit `NotImplemented` hook.
