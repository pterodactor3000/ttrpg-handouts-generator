# Handout Dashboard List View Implementation Plan

## Overview

Turn the placeholder dashboard into the GM's handout home: a server-rendered list of their handouts split into an **Active** section (draft + published) and an **Archived** section. Each handout renders as a themed card (background-gradient swatch, title, status badge, tag chips). Cards that have a `share_token` (published or archived) link to their `/share/[token]` page and expose a "Copy link" action; drafts are non-clickable until S-03 adds the editor route. A first-run empty state guides new GMs into creating their first handout. This is roadmap slice S-02 (PRD FR-002 + Business Logic state machine), and the navigation surface that S-03 (edit) and S-04 (delete) build on.

## Current State Analysis

The dashboard today (`src/pages/dashboard.astro`) is a single glass card with a "New handout" link and a sign-out form — no data fetch, no list. Everything needed to build the list already exists:

- **Schema & RLS**: `handouts` table is migrated (`supabase/migrations/20260528200000_create_handouts_table.sql`). The `gm_select_own` policy (`using (gm_id = auth.uid())`) returns **all** of the authenticated GM's rows across every status, so a single authenticated `select` filtered/sorted in the frontmatter is sufficient. `handouts_gm_id_idx` covers the query.
- **SSR client pattern**: `src/pages/share/[token].astro` is the model for an Astro page that builds a Supabase client (`createClient(Astro.request.headers, Astro.cookies)`), handles the `null` (unconfigured) case, runs a query, distinguishes "no rows" from a real error, and avoids leaking raw DB errors.
- **Auth**: `src/middleware.ts` already protects `/dashboard` and populates `Astro.locals.user`. No new gating needed.
- **Theme config**: `src/lib/backgrounds.ts` exports `BACKGROUND_CONFIGS` (DB enum → `{ label, cssBackground }`), the single source of truth for category labels and gradients.
- **Clipboard pattern**: `src/components/organisms/ShareDialog.tsx` shows the established `navigator.clipboard.writeText` + "Copied!" toggle pattern to mirror for the per-card copy button.
- **Types**: `src/types.ts` exports `Handout`, `HandoutStatus`, `BackgroundCategory`.

**Key constraints discovered:**

- The list is **read-only data** → render server-side in Astro per the project convention ("Astro for static content, React only when interactive"). The only interactive element is the per-card "Copy link" button, which becomes a small React island.
- **Atomic design is required** (`src/AGENTS.md`, lessons): organize new UI by tier (`atoms/`, `molecules/`, `organisms/`), compose upward only.
- **Never expose raw DB errors** to the client (lessons) — log server-side, render a generic failure state.
- Astro pages cannot use `dangerouslySetInnerHTML`; not relevant here (no markdown rendered on the dashboard — list shows titles/tags only).
- A button nested inside an anchor is invalid HTML — the card must not be a single wrapping `<a>` around the copy button. Navigation and the copy action are **separate** interactive elements within the card.

## Desired End State

A signed-in GM landing on `/dashboard` sees:

- A header and the existing top-level actions ("New handout", sign out).
- An **Active** section listing draft + published handouts as themed cards (newest first), each showing the category gradient swatch, title, a Draft/Published status badge, and tag chips. Published cards link to `/share/[token]` and show a working "Copy link" button; draft cards are non-clickable with a "Draft" badge.
- An **Archived** section with the same card style (Archived badge, clickable to `/share/[token]`, copy button), rendered only when archived handouts exist (absent until S-04 can produce them).
- When the GM has no active handouts, a friendly empty state with a prominent "Create your first handout" CTA instead of an empty list.
- A responsive grid that stacks to one column on phones.
- A graceful generic error state if Supabase is unconfigured or the query fails (no raw DB error text).

### Key Discoveries

- `src/pages/share/[token].astro:18-47` — canonical SSR query + null-client + PGRST116 handling pattern to mirror.
- `src/lib/backgrounds.ts:3` — `BACKGROUND_CONFIGS[category].cssBackground` / `.label` for the swatch and category label.
- `src/components/organisms/ShareDialog.tsx:22-35` — clipboard copy + label-toggle pattern for `CopyLinkButton`.
- `src/components/molecules/TagsInput.tsx` — existing chip visual language to keep tag chips consistent.
- `src/components/organisms/__tests__/HandoutEditor.test.tsx` — vitest + React Testing Library island-test pattern; the lesson "TSX Test Files Require the React Plugin in vitest.config.ts" confirms `.test.tsx` already works.

## What We're NOT Doing

- No edit route or editor reuse (S-03) — drafts are intentionally non-clickable.
- No delete/archive action or UI (S-04) — the Archived section is built but populated only once S-04 exists.
- No GET `/api/handouts` endpoint — the list is SSR; no client data fetch.
- No search, tag filtering, or pagination (not in FR-002; current handout counts are low).
- No restyle beyond what's needed to render the list cleanly (full visual refresh is S-05).
- No per-style fonts (S-07).
- No changes to RLS, schema, or migrations.

## Implementation Approach

Build top-down within the existing SSR page, extracting the testable seam (status partition + sort) into `src/lib/` and the only interactive piece (`CopyLinkButton`) into a React island. Phase 1 delivers the Active list end-to-end (data → cards → empty state) so it's verifiable on its own; Phase 2 reuses the same list/card components for the Archived section and adds the copy island; Phase 3 hardens responsiveness and adds automated tests for the two units that carry logic.

Atomic-design component map (new files):

- `atoms/StatusBadge.astro` — presentational status pill (Draft / Published / Archived).
- `atoms/CopyLinkButton.tsx` — React island: clipboard copy + "Copied!" toggle.
- `molecules/HandoutCard.astro` — composes swatch + title (link or text) + `StatusBadge` + tag chips + `CopyLinkButton`.
- `organisms/HandoutList.astro` — section heading + responsive grid of `HandoutCard`, or an empty-state slot.
- `lib/handout-list.ts` — pure `partitionHandouts(...)` helper (filter to active/archived + sort newest-first).

## Critical Implementation Details

**Card interactivity must not nest a button inside an anchor.** The card navigates via a linked title (an `<a>` wrapping only the title) for shareable handouts, and the "Copy link" button is a sibling element in the card — never an ancestor/descendant anchor pair. Drafts render the title as plain text (no anchor).

**Copy URL is built client-side.** `CopyLinkButton` receives the bare `shareToken` and constructs `window.location.origin + '/share/' + shareToken` at click time (mirroring how `HandoutEditor` builds the share URL), so the server doesn't need to know the deployed origin.

**Single query, partition in frontmatter.** Fetch all of the GM's rows once (`order('created_at', { ascending: false })`), then split into active/archived with `partitionHandouts`. Avoid two round-trips. Select only the columns the cards need.

---

## Phase 1: Data Layer & Active List (SSR)

### Overview

Fetch the GM's handouts in `dashboard.astro`, add the pure partition/sort helper, and build the Astro card + list components. At the end of this phase the dashboard shows the Active section (draft + published) with themed cards, status badges, and tag chips, plus the empty-state CTA — drafts non-clickable, published cards linking to their share page. No copy button yet (Phase 2).

### Changes Required

#### 1. Handout list partition helper

**File**: `src/lib/handout-list.ts`

**Intent**: Provide a pure, unit-testable function that takes the raw fetched rows and returns the two display groups already sorted, so the page frontmatter stays declarative and the logic is covered by tests.

**Contract**: Exports `partitionHandouts(handouts: HandoutListItem[]): { active: HandoutListItem[]; archived: HandoutListItem[] }`. `active` = rows with `status` in `'draft' | 'published'`; `archived` = rows with `status === 'archived'`. Both sorted by `created_at` descending (newest first). Also export the `HandoutListItem` type — a `Pick<Handout, 'id' | 'title' | 'tags' | 'status' | 'background_category' | 'share_token' | 'created_at'>`. Export at end of file; use the `@/` alias for the `Handout` import.

#### 2. Status badge atom

**File**: `src/components/atoms/StatusBadge.astro`

**Intent**: A small presentational pill conveying a handout's status, used inside cards. No logic beyond mapping status → label + color classes.

**Contract**: `Astro.props` = `{ status: HandoutStatus }`. Renders a span with merged status classes: draft → amber tones, published → green tones, archived → muted/gray tones, each with a human label ("Draft" / "Published" / "Archived"). Keep palette consistent with the existing dark glass dashboard aesthetic. In `.astro` files, `class:list` is acceptable instead of `cn()`.

#### 3. Handout card molecule

**File**: `src/components/molecules/HandoutCard.astro`

**Intent**: Render one handout as a themed card. Composes the gradient swatch, the title (linked for shareable handouts, plain text for drafts), the `StatusBadge`, and tag chips. The copy button slot is added in Phase 2.

**Contract**: `Astro.props` = `{ handout: HandoutListItem }`. Uses `BACKGROUND_CONFIGS[handout.background_category]` for the gradient swatch (e.g. a top strip or accent via inline `style="background: …"`) and the category `.label`. Title: if `handout.share_token` is non-null, wrap the title in `<a href={'/share/' + handout.share_token}>`; otherwise render plain text. Renders `<StatusBadge status={handout.status} />`. Renders `handout.tags` as small chips (consistent with `TagsInput` chip styling); render nothing for the tag row when `tags` is empty. Text must stay legible against/next to the gradient (swatch is a contained strip, not a full-card background behind text).

#### 4. Handout list organism

**File**: `src/components/organisms/HandoutList.astro`

**Intent**: Render a titled section as a responsive grid of `HandoutCard`s, or an empty-state when there are no handouts. Reused for both Active (Phase 1) and Archived (Phase 2) sections.

**Contract**: `Astro.props` = `{ heading: string; handouts: HandoutListItem[] }`, plus a default `<slot />` used as the empty-state content when `handouts.length === 0`. When non-empty, render `heading` and a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` of `HandoutCard`. When empty, render `heading` and the slotted empty state. Compose downward only (imports `HandoutCard`).

#### 5. Dashboard data fetch + Active section

**File**: `src/pages/dashboard.astro`

**Intent**: Fetch the GM's handouts server-side, partition them, and render the Active section (with empty-state CTA) while keeping the existing "New handout" and sign-out actions. Archived section is wired in Phase 2.

**Contract**: Build `const supabase = createClient(Astro.request.headers, Astro.cookies)`. If `null`, render a generic "Dashboard temporarily unavailable" state (mirror `[token].astro`'s `isConfigured` handling) — do not leak config details. Otherwise query `supabase.from('handouts').select('id, title, tags, status, background_category, share_token, created_at').order('created_at', { ascending: false })` (RLS scopes to the current GM; no explicit `gm_id` filter needed for a SELECT, but it is harmless to add). On error: `console.error('DB error loading handouts:', error)` and render a generic error state; never surface the raw message. The Supabase client here is untyped, so cast the returned `data` to `HandoutListItem[]` and coalesce `null` to `[]` (mirror the `as`-cast pattern in `api/handouts/index.ts:51`) before passing it through `partitionHandouts` — this keeps `npm run build` type-checking. Render `<HandoutList heading="Your handouts" handouts={active}>` with a slotted empty state containing a "Create your first handout" CTA linking to `/handouts/new`. Keep the existing "New handout" and sign-out controls available.

### Success Criteria

#### Automated Verification

- `npm run lint` passes on all new/changed files
- `npm run build` succeeds with no type errors
- `npx prettier --check .` passes (no formatting drift)

#### Manual Verification

- Signed in with at least one draft and one published handout, `/dashboard` shows both in the Active section, newest first
- Published card's title links to `/share/[token]` and opens the correct shared page; draft card's title is not a link
- Each card shows the correct category gradient swatch, status badge, and tag chips (no tag row when there are no tags)
- A GM with no draft/published handouts sees the "Create your first handout" empty-state CTA, which navigates to `/handouts/new`
- Visiting `/dashboard` signed out redirects to `/auth/signin` (unchanged middleware behavior)

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 2.

---

## Phase 2: Archived Section & Copy-Link Island

### Overview

Reuse `HandoutList` to render the Archived section (only when archived rows exist), and add the one interactive element: a `CopyLinkButton` React island on every shareable card (published + archived). Because no archived rows can exist until S-04, the Archived section is verified via a manually-seeded archived row (and confirmed absent when there are none).

### Changes Required

#### 1. Copy-link button island

**File**: `src/components/atoms/CopyLinkButton.tsx`

**Intent**: A self-contained React island that copies a handout's share URL to the clipboard with a transient "Copied!" confirmation, mirroring the existing ShareDialog behavior.

**Contract**: Props: `{ shareToken: string }`. On click: `await navigator.clipboard.writeText(window.location.origin + '/share/' + shareToken)`, set label to "Copied!" for 2s, revert; on failure show "Copy failed" for 2s (mirror `ShareDialog.tsx:22-35`). Default-export the component (organism/island export convention). Use the existing `Button` atom and `cn()`. Keep the button small/compact to fit in a card footer.

#### 2. Mount copy button in the card

**File**: `src/components/molecules/HandoutCard.astro`

**Intent**: Show the copy button only on cards that have a live share link, as a sibling of the title link (never nested inside the anchor).

**Contract**: When `handout.share_token` is non-null, render `<CopyLinkButton shareToken={handout.share_token} client:idle />` in a card action row, separate from the linked title. Drafts (no token) render no copy button. `client:idle` keeps the page fast (copy is not needed immediately on load).

#### 3. Archived section on the dashboard

**File**: `src/pages/dashboard.astro`

**Intent**: Render the Archived group beneath the Active section using the same list/card components — but only when archived handouts actually exist, so GMs never see a permanently-empty "Archived" section before S-04 can populate it.

**Contract**: Render `<HandoutList heading="Archived" handouts={archived} />` **only when `archived.length > 0`** (guard the whole section). Place it after the Active section. No empty-state slot is needed for Archived (the section is simply absent when empty). No new query — `archived` comes from the existing `partitionHandouts` result. S-04 will make this section reachable once rows can be archived.

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run build` succeeds with no type errors

#### Manual Verification

- Published card shows a "Copy link" button; clicking it copies `https://…/share/<token>` and the label toggles to "Copied!" then back
- Draft card shows no copy button
- With no archived rows, the Archived section is not rendered at all (no empty "Archived" heading)
- After manually setting one row to `status = 'archived'` in Supabase, the Archived section appears with that row: an "Archived" badge, a link to its `/share/[token]`, and a working copy button
- Copy button does not break card-title navigation (no nested-anchor issues; clicking the title still navigates)

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 3.

---

## Phase 3: Responsive Polish & Tests

### Overview

Make the grid and cards mobile-friendly, and add automated coverage for the two units that carry logic: the `partitionHandouts` helper and the `CopyLinkButton` island.

### Changes Required

#### 1. Responsive grid & card layout

**Files**: `src/components/organisms/HandoutList.astro`, `src/components/molecules/HandoutCard.astro`

**Intent**: Ensure the dashboard reads well on phones, tablets, and desktop with no horizontal overflow.

**Contract**: Grid uses responsive column counts (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Cards use `w-full`, wrap long titles (`break-words`), and keep tag chips wrapping rather than overflowing. Verify at 375px and at desktop widths.

#### 2. Partition helper unit tests

**File**: `src/lib/__tests__/handout-list.test.ts`

**Intent**: Lock in the status-grouping and sort contract.

**Contract**: Cases: drafts and published land in `active` and archived in `archived`; both groups sorted by `created_at` descending; empty input → `{ active: [], archived: [] }`; an all-archived input yields an empty `active`. Use the `@/` alias for imports.

#### 3. Copy button island tests

**File**: `src/components/atoms/__tests__/CopyLinkButton.test.tsx`

**Intent**: Verify the clipboard interaction and label toggle without a real clipboard.

**Contract**: The `unit` vitest project runs `environment: 'node'`, so the file MUST begin with the `// @vitest-environment jsdom` docblock and stub `window.location` (set `origin`) — exactly as `HandoutEditor.test.tsx:1,16-22` does — otherwise RTL `render()` has no DOM. Mock `navigator.clipboard.writeText`; assert it's called with the full `/share/<token>` URL on click, that the label changes to "Copied!", and that a rejected write shows "Copy failed". Rely on the React plugin already in `vitest.config.ts` (per lessons).

### Success Criteria

#### Automated Verification

- `npm test -- --project unit` passes including the two new test files
- `npm run lint` passes
- `npm run build` succeeds
- `npx prettier --check .` passes (no formatting drift)

#### Manual Verification

- At 375px the dashboard stacks to a single column with no horizontal scroll; cards and tag chips wrap cleanly
- At desktop width the grid shows multiple columns and remains aligned
- Full flow re-checked: create a draft → appears in Active as Draft (non-clickable); publish it → moves to Published, becomes clickable, copy button works

**Implementation Note**: After all phases pass manual verification, the S-02 slice is complete and ready for `/10x-archive`.

---

## Testing Strategy

### Unit Tests

- `src/lib/__tests__/handout-list.test.ts` — `partitionHandouts` grouping + sort + empty cases.
- `src/components/atoms/__tests__/CopyLinkButton.test.tsx` — clipboard call, success/failure label toggle.

### Manual Testing Steps

1. Sign in with a fresh account → see the "Create your first handout" empty state; click it → `/handouts/new`.
2. Create a draft → it appears in Active with a "Draft" badge and a non-linked title, no copy button.
3. Publish it → it shows as "Published", the title links to `/share/[token]`, and the "Copy link" button copies the URL.
4. Confirm the gradient swatch and category match the chosen background.
5. Manually set a row to `archived` in Supabase → it appears in the Archived section, clickable, copy works; remove it → Archived shows its empty state.
6. Resize to 375px → single-column, no horizontal scroll.

## Performance Considerations

Single indexed query (`handouts_gm_id_idx`) returning a small per-GM row set; partition/sort is O(n) in the frontmatter. Copy buttons hydrate with `client:idle` so initial render stays cheap. No measurable performance risk at MVP scale.

## Migration Notes

None. No schema, RLS, or migration changes — F-01 and S-01 already provide everything this slice reads.

## References

- Roadmap slice S-02: `context/foundation/roadmap.md`
- PRD FR-002 + Business Logic: `context/foundation/prd.md`
- SSR query pattern: `src/pages/share/[token].astro:18-47`
- Theme config: `src/lib/backgrounds.ts`
- Clipboard pattern: `src/components/organisms/ShareDialog.tsx:22-35`
- Island test pattern: `src/components/organisms/__tests__/HandoutEditor.test.tsx`
- Atomic design + testing rules: `src/AGENTS.md`, `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Data Layer & Active List (SSR)

#### Automated

- [x] 1.1 `npm run lint` passes on all new/changed files — e251dfa
- [x] 1.2 `npm run build` succeeds with no type errors — e251dfa
- [x] 1.3 `npx prettier --check .` passes (no formatting drift) — e251dfa

#### Manual

- [x] 1.4 Active section shows draft + published handouts, newest first — e251dfa
- [x] 1.5 Published title links to `/share/[token]`; draft title is plain text — e251dfa
- [x] 1.6 Card shows correct gradient swatch, status badge, and tag chips (no tag row when empty) — e251dfa
- [x] 1.7 Empty active list shows "Create your first handout" CTA → `/handouts/new` — e251dfa
- [x] 1.8 Signed-out `/dashboard` redirects to `/auth/signin` — e251dfa

### Phase 2: Archived Section & Copy-Link Island

#### Automated

- [x] 2.1 `npm run lint` passes — ba2171e
- [x] 2.2 `npm run build` succeeds with no type errors — ba2171e

#### Manual

- [x] 2.3 Published card copy button copies `/share/<token>` and toggles "Copied!" — ba2171e
- [x] 2.4 Draft card shows no copy button — ba2171e
- [x] 2.5 Archived section is not rendered when there are no archived rows — ba2171e
- [x] 2.6 A manually-archived row appears in Archived with badge, share link, and working copy button — ba2171e
- [x] 2.7 Card-title navigation still works (no nested-anchor breakage) — ba2171e

### Phase 3: Responsive Polish & Tests

#### Automated

- [x] 3.1 `npm test -- --project unit` passes including the two new test files — 5aa8201
- [x] 3.2 `npm run lint` passes — 5aa8201
- [x] 3.3 `npm run build` succeeds — 5aa8201
- [x] 3.4 `npx prettier --check .` passes (no formatting drift) — 5aa8201

#### Manual

- [x] 3.5 At 375px the dashboard is single-column with no horizontal scroll; cards/chips wrap — 5aa8201
- [x] 3.6 At desktop width the grid shows multiple aligned columns — 5aa8201
- [x] 3.7 Full flow re-checked: draft → Active (Draft, non-clickable); publish → Published, clickable, copy works — 5aa8201
