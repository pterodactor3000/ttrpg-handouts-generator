# First Handout Creation and Sharing — Implementation Plan

## Overview

Build the north-star S-01 pipeline on top of the finished F-01 schema: a GM visits `/handouts/new`, composes a handout (title, markdown content with live CSS-overlay preview, background category, tags), saves a draft, publishes to receive a permanent share link, and players open `/share/[token]` on any device in read-only mode without logging in.

## Current State Analysis

The F-01 schema is fully in place (`supabase/migrations/20260528200000_create_handouts_table.sql`). The `handouts` table, the `handout_status` (`draft`/`published`/`archived`) and `background_category` (`fantasy`/`horror`/`scifi`) enums, indexes, and RLS policies are all migrated. The `Handout` interface is declared in `src/types.ts`.

The app shell is working: Astro SSR, React islands, Tailwind 4, Supabase SSR client, auth middleware protecting `/dashboard`, and three auth API routes. No handout-facing routes, components, or API endpoints exist yet. No markdown or rendering library is installed.

**Key constraints discovered:**

- `sanitize-html` and `isomorphic-dompurify` both fail on the Cloudflare workerd runtime (Node built-in dependencies). The `unified`/`remark`/`rehype` pipeline is pure ESM with no Node built-ins — it is the only viable choice that runs identically in the browser (live preview) and on the server (player page).
- `background_category` is `NOT NULL` in the schema — every draft insert must supply it.
- The `anon_select_shared` RLS policy restricts anonymous reads to rows where `status IN ('published', 'archived') AND share_token IS NOT NULL`. The player page query must use the Supabase client with no user session (workerd anon role) and filter by `share_token` — not by `id`.
- Astro API routes must export `const prerender = false`.
- Project coding conventions (from `context/foundation/lessons.md`): arrow functions with `const`, exports at end of file, no abbreviated names.

## Desired End State

A logged-in GM can reach `/handouts/new` from the dashboard, fill in a title, select one of three themed backgrounds, write markdown that renders live as a CSS-overlay preview beside the editor, add tags, click **Save** to persist a draft, then click **Share** to publish and receive a permanent UUID share link in a modal. Opening that link in any browser — logged in or not, desktop or mobile — shows a responsive read-only page: rendered markdown composited over the themed background with a small footer. An unknown or unpublished token returns a friendly 404 page.

### Key Discoveries

- `src/lib/supabase.ts:createClient()` works for both authenticated and anonymous calls — anonymous calls simply carry no JWT and hit the `anon` RLS policy.
- `src/pages/api/auth/signin.ts` is the model for API route shape: validate input, call Supabase, return redirect or JSON.
- `src/components/auth/SignInForm.tsx` is the model for React island shape: arrow-function component, state at the top, exports at the bottom, uses `cn()` for class names.
- `src/middleware.ts:PROTECTED_ROUTES` is the pattern for route-level auth gating; `/handouts` needs to be added.
- No test runner is configured yet; `vitest` must be installed and a script added.

## What We're NOT Doing

- No handout list / dashboard rebuild (S-02)
- No editing already-published handouts (S-03)
- No delete / archive action (S-04)
- No file export (PDF, PNG) — PRD Non-Goal
- No custom background upload — PRD Non-Goal
- No WYSIWYG editor — PRD Non-Goal
- No autosave / debounced background save
- No OAuth login (already in-scope via the auth skeleton)
- No tag search or filtering
- No analytics on the player page

## Implementation Approach

Work bottom-up so each phase can be independently verified before the next builds on it:

1. Prove the rendering pipeline works correctly and safely (unit-tested render module + placeholder backgrounds) before any UI depends on it.
2. Build the editor island and draft-save API (GM can create and persist a draft).
3. Wire the publish action and share dialog (GM can produce a working link).
4. Build the public player page and verify mobile responsiveness on both surfaces.

## Critical Implementation Details

**Render pipeline must be synchronous.** `unified().processSync(markdown)` returns a `VFile` synchronously — use `String(result)` to get the HTML string. Do not use the async `process()` variant; the live preview fires on every keystroke and async would require managing stale updates.

**Background category label mismatch.** The PRD prose says "grimdark / high fantasy / postapo" but the DB enum is `'fantasy' | 'horror' | 'scifi'`. The `BACKGROUND_CONFIGS` map in `src/lib/backgrounds.ts` is the single source of truth that translates the DB value to the display label and CSS background — never use the enum value directly in UI strings.

**Anonymous Supabase client on the player page.** The `createClient()` helper in `src/lib/supabase.ts` returns `null` when env vars are missing. The player page must handle the `null` case (show 500-level error) and must **not** await `supabase.auth.getUser()` before the query — the anon role is inferred from the absence of an auth cookie, not from an explicit call.

---

## Phase 1: Render Core, Assets, and Tests

### Overview

Install the remark/rehype pipeline and vitest. Build and unit-test `renderHandoutHtml`, the shared module that both the React live-preview island and the server-side player page will call. Add placeholder CSS-gradient backgrounds and the category config map. Nothing is user-visible at the end of this phase — the goal is a verified, safe render module before any UI depends on it.

### Changes Required

#### 1. Install dependencies

**File**: `package.json` (via `npm install`)

**Intent**: Add the remark/rehype rendering pipeline and vitest. All packages are pure ESM with no Node built-ins, so they run identically in the browser and on the Cloudflare workerd runtime.

**Contract**: Install as production dependencies: `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-sanitize`, `rehype-stringify`. Install as dev dependency: `vitest`. Add `"test": "vitest run"` to `scripts` in `package.json`.

#### 2. Shared render module

**File**: `src/lib/handout-renderer.ts`

**Intent**: Export a single pure function `renderHandoutHtml` that converts a markdown string into sanitized HTML. This module is the XSS security boundary — nothing else is allowed to produce user-facing HTML from GM-supplied markdown.

**Contract**: Exports `renderHandoutHtml(markdown: string): string`. Internally: `unified().use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: false }).use(rehypeSanitize).use(rehypeStringify)`. The `allowDangerousHtml: false` flag ensures raw HTML in the markdown source is never passed to the sanitizer; `rehypeSanitize` with its default schema (mirrors GitHub) then restricts links to `http`/`https`/`mailto` and strips all inline event attributes. Return `String(processor.processSync(markdown))`.

#### 3. Background configuration map

**File**: `src/lib/backgrounds.ts`

**Intent**: Provide a single source of truth mapping each `BackgroundCategory` DB value to its display label and CSS background string. Any component that renders a background imports from here — never hardcodes DB enum values into UI strings.

**Contract**: Exports `BACKGROUND_CONFIGS` as `Record<BackgroundCategory, { label: string; cssBackground: string }>`. Initial values use CSS radial/linear gradients as placeholders (e.g. `fantasy` → dark-green-gold gradient, `horror` → near-black red-accent gradient, `scifi` → dark-blue cyan-accent gradient). The `cssBackground` value is a valid CSS `background` shorthand string, usable directly as an inline style. Also exports `BACKGROUND_CATEGORY_OPTIONS: BackgroundCategory[]` as the ordered list for pickers.

#### 4. Vitest configuration

**File**: `vitest.config.ts`

**Intent**: Configure vitest to run unit tests in Node environment (not jsdom) so the same ESM module behaviour matches the workerd runtime.

**Contract**: `defineConfig({ test: { environment: 'node' } })`. No glob override needed — vitest's default (`**/*.{test,spec}.ts`) is sufficient.

#### 5. Render module unit tests

**File**: `src/lib/__tests__/handout-renderer.test.ts`

**Intent**: Verify that `renderHandoutHtml` produces correct markdown output and strips all known XSS payloads. These tests are the automated proof of the PRD's XSS-safety guardrail.

**Contract**: Test cases must include:

- Headings, bold/italic, lists, blockquotes, code blocks, and GFM tables render to expected HTML elements.
- `<script>alert(1)</script>` in input → no `<script>` tag in output.
- `<img src=x onerror=alert(1)>` inline HTML → event attribute stripped.
- `[click](javascript:alert(1))` → `href` removed or link stripped.
- Raw inline HTML `<b>bold</b>` passthrough → stripped (raw HTML is disabled).

### Success Criteria

#### Automated Verification

- `npm test` passes with all render unit tests green
- `npm run lint` passes on the new files
- `npm run build` succeeds (no type errors)

#### Manual Verification

- Open the test output and confirm XSS-payload tests are present and passing, not just skipped

**Implementation Note**: Pause after automated verification passes and manually confirm the test output before proceeding to Phase 2.

---

## Phase 2: Editor Island and Draft API

### Overview

Add the `/handouts/new` protected route with a full React editor island. The island renders a two-column layout (form left, live CSS-overlay preview right) and calls a `POST /api/handouts` route to save a draft. At the end of this phase a GM can fill in all fields, see a live preview, and persist a draft row to the database.

### Changes Required

#### 1. Extend protected routes

**File**: `src/middleware.ts`

**Intent**: Gate `/handouts` behind auth, consistent with how `/dashboard` is protected.

**Contract**: Add `'/handouts'` to the `PROTECTED_ROUTES` array. The existing prefix-match logic (`startsWith`) will cover `/handouts/new` and any future handout sub-routes.

#### 2. New handout page

**File**: `src/pages/handouts/new.astro`

**Intent**: Server-rendered shell that mounts the `HandoutEditor` React island. Middleware already enforces auth; no additional auth check is needed in the page itself.

**Contract**: Renders the `Layout` with `title="New Handout"`. Mounts `<HandoutEditor client:load />`. No user ID prop needed — the API route reads `auth.uid()` from the Supabase session server-side.

#### 3. HandoutEditor React island

**File**: `src/components/handout/HandoutEditor.tsx`

**Intent**: The primary authoring surface. Manages all form state, calls `renderHandoutHtml` on every markdown change for live preview, and orchestrates Save and Share actions. Composed of sub-components for picking backgrounds and editing tags.

**Contract**: Component state: `title: string`, `markdownContent: string`, `backgroundCategory: BackgroundCategory | null`, `tags: string[]`, `handoutId: string | null` (null until first save), `isSaving: boolean`, `shareToken: string | null` (set after publish), `shareDialogOpen: boolean`. Layout: two-column on `md+` screens (form column left, preview column right), single column stacked on mobile. The preview column renders a `<div>` with an inline `style.background`: when `backgroundCategory` is set use `BACKGROUND_CONFIGS[backgroundCategory].cssBackground`; when it is null use a dark neutral fallback (`#1a1a2e`) so the preview is always visible and never crashes. Apply `style.backgroundSize = 'cover'`; a semi-transparent panel inside holds the rendered HTML from `renderHandoutHtml(markdownContent)` set via `dangerouslySetInnerHTML`. Save calls `POST /api/handouts` (creates) or `PUT /api/handouts/[id]` (updates if `handoutId` is set); Share is disabled until `handoutId` is set (i.e. at least one draft save has been done). The Share button calls `POST /api/handouts/[id]/publish`. On Save error, display an inline error message below the Save button (same pattern as the Share error).

#### 4. BackgroundPicker sub-component

**File**: `src/components/handout/BackgroundPicker.tsx`

**Intent**: Let the GM select one of three background categories. Renders as a row of clickable cards, each showing the category's gradient and label.

**Contract**: Props: `value: BackgroundCategory | null`, `onChange: (category: BackgroundCategory) => void`. Iterates `BACKGROUND_CATEGORY_OPTIONS`, renders a card per option with `style.background` from `BACKGROUND_CONFIGS[option].cssBackground` and the display label. Selected card has a visible ring/border via `cn()`.

#### 5. TagsInput sub-component

**File**: `src/components/handout/TagsInput.tsx`

**Intent**: Let the GM add and remove free-form tags. Renders existing tags as removable chips and an input for adding new ones.

**Contract**: Props: `tags: string[]`, `onChange: (tags: string[]) => void`. Pressing Enter or comma in the input adds a trimmed, non-empty, non-duplicate tag to the array. Each chip has an ×-button that removes it. Tags are stored as lowercase, trimmed strings.

#### 6. Draft create API route

**File**: `src/pages/api/handouts/index.ts`

**Intent**: Insert a new draft handout row for the authenticated GM and return its `id`. The route validates the minimum insert requirement (background_category must be set) and lets the DB defaults handle title/markdown empty strings.

**Contract**: Exports `POST` and `const prerender = false`. Accepts JSON body `{ title, markdownContent, backgroundCategory, tags }`. Validates with zod: `backgroundCategory` must be a valid `BackgroundCategory` enum value; `title` is a `string().max(300)`, `markdownContent` is `string().max(50000)`, `tags` is `string().array().max(20)`. Inserts into `handouts` with `gm_id` from `supabase.auth.getUser()`. Returns `Response` with JSON `{ id: string }` on success, or `{ error: string }` with appropriate HTTP status on failure.

#### 7. Draft update API route

**File**: `src/pages/api/handouts/[id].ts`

**Intent**: Update an existing draft row's content when the GM re-saves after the initial create.

**Contract**: Exports `PUT` and `const prerender = false`. Same zod schema as the create route. Updates the row where `id = params.id AND status = 'draft'` (the `gm_update_non_archived` RLS policy already enforces ownership and blocks archived rows). Returns `{ id: string }` on success.

### Success Criteria

#### Automated Verification

- `npm run build` succeeds with no type errors on the new files
- `npm run lint` passes

#### Manual Verification

- Navigate to `/handouts/new` while signed in — editor loads with two-column layout
- Type markdown in the textarea — preview updates live with rendered HTML over the selected background gradient
- Select each of the three backgrounds — preview switches gradient correctly
- Add and remove tags — chips appear and disappear
- Click Save — a new row appears in the Supabase `handouts` table with `status = 'draft'`, correct `gm_id`, and the entered content
- Click Save again — the same row is updated, no duplicate rows
- Attempt to navigate to `/handouts/new` while signed out — redirected to `/auth/signin`

**Implementation Note**: Pause here for manual confirmation before proceeding to Phase 3.

---

## Phase 3: Publish and Share

### Overview

Wire the Share action: a `POST /api/handouts/[id]/publish` route validates all required fields, transitions `draft → published`, mints the `share_token`, and returns it. The editor shows a `ShareDialog` modal with the permanent link and a copy button. The dashboard gets a "New handout" entry button.

### Changes Required

#### 1. Publish API route

**File**: `src/pages/api/handouts/[id]/publish.ts`

**Intent**: Transition a draft handout to published status, enforce the publish-time validation rules (all three fields required), mint the share token, and return the link token to the client.

**Contract**: Exports `POST` and `const prerender = false`. Reads `params.id`. Fetches the current row from Supabase (authenticated, so `gm_select_own` RLS applies). Validates with zod that `title` is non-empty, `markdownContent` is non-empty, and `background_category` is set — returns HTTP 422 with `{ error: string }` if any fail. Updates the row: `status = 'published'`, `share_token = gen_random_uuid()` (via `supabase.rpc('gen_random_uuid')` or by generating a UUID client-side with `crypto.randomUUID()` — the workerd runtime exposes the Web Crypto API), `published_at = new Date().toISOString()`. Returns `{ shareToken: string }` on success.

**Note on UUID generation**: `crypto.randomUUID()` is available on the workerd runtime as a global Web Crypto API. Use it directly — no `uuid` package needed.

#### 2. ShareDialog component

**File**: `src/components/handout/ShareDialog.tsx`

**Intent**: Show the permanent share link after a successful publish, with a one-click copy button and a close action.

**Contract**: Props: `open: boolean`, `onClose: () => void`, `shareUrl: string`. Renders as an overlay modal (simple fixed-position div with backdrop). Shows the `shareUrl` in a read-only input. A "Copy link" button calls `navigator.clipboard.writeText(shareUrl)` and toggles its label to "Copied!" for 2 seconds. The `shareUrl` passed by the editor is constructed as `window.location.origin + '/share/' + shareToken`.

#### 3. Wire Share in HandoutEditor

**File**: `src/components/handout/HandoutEditor.tsx`

**Intent**: Connect the Share button to the publish API and open the ShareDialog on success.

**Contract**: Share button is disabled while `handoutId` is null or `isSaving` is true. On click: `POST /api/handouts/{handoutId}/publish` → on success set `shareToken` in state and set `shareDialogOpen = true` → render `<ShareDialog>`. On error: display an inline error message below the button.

#### 4. "New handout" entry point on dashboard

**File**: `src/pages/dashboard.astro`

**Intent**: Give the GM a way to reach the editor from the dashboard. Replace the current placeholder content with a minimal layout that includes a "New handout" action alongside the existing sign-out form.

**Contract**: Add a button/link styled consistently with the existing dashboard card that navigates to `/handouts/new`. The dashboard text remains a stub — the full list UI is S-02.

### Success Criteria

#### Automated Verification

- `npm run build` succeeds
- `npm run lint` passes

#### Manual Verification

- From the dashboard, click "New handout" → arrives at `/handouts/new`
- Fill in title + background + markdown, click Save, then click Share → `ShareDialog` opens with a URL of the form `https://…/share/<uuid>`
- The URL is clickable (opens in a new tab) — player page renders (verified in Phase 4)
- Attempting to Share before Saving — Share button is disabled
- Attempting to Share with empty title or empty markdown (by using the Supabase dashboard to create a partial row and hitting the API directly) — returns 422

**Implementation Note**: Pause here for manual confirmation before proceeding to Phase 4.

---

## Phase 4: Player Page and Mobile Polish

### Overview

Build the public `/share/[token]` Astro page. It reads the handout via the anonymous Supabase client (no auth cookie needed), renders markdown server-side using `renderHandoutHtml`, and displays it over the themed background. A friendly 404 page handles unresolved tokens. Both the editor and the player page are made mobile-responsive.

### Changes Required

#### 1. Public player page

**File**: `src/pages/share/[token].astro`

**Intent**: Server-render the read-only handout view for any visitor — no login required. Use the anonymous Supabase client to query by `share_token` (the `anon_select_shared` RLS policy handles access control). Render markdown to HTML server-side so the page is fully usable without JavaScript.

**Contract**: `export const prerender = false`. Read `Astro.params.token`. Call `createClient(Astro.request.headers, Astro.cookies)` — this client carries no session, so Supabase uses the `anon` role. Query: `.from('handouts').select('title, markdown_content, background_category').eq('share_token', token).single()`. If `data` is null or `error` is set: return `Astro.rewrite('/share/not-found')` with HTTP 404 (or render a 404 inline via `Astro.response.status = 404`). On success: call `renderHandoutHtml(data.markdown_content)` server-side. The page layout: full-viewport background from `BACKGROUND_CONFIGS[data.background_category].cssBackground` applied via inline style on a wrapper div; a centered readable panel with `max-width`, light background with opacity, and `padding`; an `<h1>` with `data.title` at the top of the panel; rendered HTML in a `prose`-styled div below the title (`dangerouslySetInnerHTML` not available in Astro — use `<Fragment set:html={renderedHtml} />`); a small footer with the app name.

#### 2. Not-found page for bad share tokens

**File**: `src/pages/share/not-found.astro`

**Intent**: Provide a clear, non-alarming message when a player opens an expired, mistyped, or unpublished share link.

**Contract**: Returns HTTP 404 (`Astro.response.status = 404`). Uses the `Layout` component. Shows a brief message ("Handout not found — this link may be invalid or the handout has not been shared yet.") with a link back to the landing page.

#### 3. Mobile-responsive styles for the player page

**File**: `src/pages/share/[token].astro`

**Intent**: The NFR requires the player page to render correctly on phones and tablets. The readable panel must be full-width on small screens with appropriate padding.

**Contract**: Panel uses `w-full max-w-2xl mx-auto`. Padding switches with responsive Tailwind classes: `p-4 md:p-8`. Font size and line height use prose defaults. Background cover: `background-size: cover; background-position: center`. No horizontal overflow.

#### 4. Mobile-responsive styles for the editor

**File**: `src/components/handout/HandoutEditor.tsx`

**Intent**: The editor must be usable on a phone, even though the GM persona typically uses a desktop. The two-column layout collapses to single-column on small screens.

**Contract**: The outer container uses `grid grid-cols-1 md:grid-cols-2 gap-6`. The preview panel is visible on all screen sizes but renders below the form on mobile. No fixed widths on inputs or textareas — use `w-full`.

### Success Criteria

#### Automated Verification

- `npm run build` succeeds with no type errors
- `npm run lint` passes

#### Manual Verification

- Open a published share link while signed out — player page renders with the correct title, rendered markdown, and themed background gradient; no login prompt
- Open the same link in a mobile browser (or DevTools device emulation at 375px) — panel fits within viewport, text is readable, no horizontal scroll
- Open `/share/made-up-token-that-does-not-exist` — sees a friendly "Handout not found" message with HTTP 404 status
- Open the editor at `/handouts/new` in mobile DevTools — form and preview stack vertically, inputs are full-width and usable
- Open a share link for a `draft` handout (using the Supabase dashboard to confirm a row with `status = 'draft'`) — 404, not the handout content

**Implementation Note**: Pause here for manual confirmation. Once all four phases pass manual verification, the S-01 north-star slice is done.

---

## Testing Strategy

### Unit Tests

- `src/lib/__tests__/handout-renderer.test.ts` covers the single security-critical pure function:
  - Correct HTML output for all standard GFM elements
  - XSS payload stripping (script tags, event attributes, javascript: links, raw HTML passthrough)

### Manual Testing Steps

1. Sign in, click "New handout" on dashboard — editor loads
2. Type `# Hello **world**` in the textarea — preview shows heading + bold live
3. Switch between all three background categories — preview gradient updates
4. Add tags "dungeon", "session-1" — chips appear; remove one — chip disappears
5. Click Save — Supabase row created with `status = 'draft'`
6. Click Share — dialog opens with a `/share/<uuid>` URL; copy link works
7. Open the link in an incognito window — player page renders correctly
8. Resize the incognito window to 375px — player page remains readable
9. Open the editor in a 375px viewport — form stacks vertically, usable
10. Paste `<script>alert(1)</script>` into the markdown textarea — no alert fires in preview or on the player page

## Performance Considerations

`renderHandoutHtml` is synchronous and CPU-bound. On typical handout lengths (< 5 000 characters) the unified pipeline completes in < 5 ms, well within the NFR. No debouncing is required for the live preview at these input sizes, but if a GM pastes very large content (> 10 000 characters) the preview may lag — this is acceptable for MVP and can be addressed with a debounce if reported.

## Migration Notes

F-01 migration is already applied. No new migrations in this slice.

## References

- F-01 schema: `supabase/migrations/20260528200000_create_handouts_table.sql`
- Shared types: `src/types.ts`
- Background config (to be created): `src/lib/backgrounds.ts`
- Render module (to be created): `src/lib/handout-renderer.ts`
- Auth API route pattern: `src/pages/api/auth/signin.ts`
- React island pattern: `src/components/auth/SignInForm.tsx`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Render Core, Assets, and Tests

#### Automated

- [x] 1.1 `npm test` passes with all render unit tests green — 194d605
- [x] 1.2 `npm run lint` passes on new Phase 1 files — 194d605
- [x] 1.3 `npm run build` succeeds after Phase 1 changes — 194d605

#### Manual

- [x] 1.4 XSS-payload test cases confirmed present and passing in test output — 62bcec6

### Phase 2: Editor Island and Draft API

#### Automated

- [x] 2.1 `npm run build` succeeds with no type errors on Phase 2 files — 66aab0a
- [x] 2.2 `npm run lint` passes — 66aab0a

#### Manual

- [x] 2.3 `/handouts/new` loads with two-column editor layout while signed in
- [x] 2.4 Markdown textarea drives live CSS-overlay preview
- [x] 2.5 Background picker switches the gradient in the preview
- [x] 2.6 Tags can be added and removed via chip UI
- [x] 2.7 Save creates a new draft row in Supabase with correct `gm_id` and `status = 'draft'`
- [x] 2.8 Re-saving updates the existing row (no duplicates)
- [x] 2.9 Visiting `/handouts/new` signed-out redirects to `/auth/signin`

### Phase 3: Publish and Share

#### Automated

- [x] 3.1 `npm run build` succeeds — 6ef5a63
- [x] 3.2 `npm run lint` passes — 6ef5a63

#### Manual

- [x] 3.3 "New handout" button on dashboard navigates to `/handouts/new` — 6ef5a63
- [x] 3.4 Share button is disabled before first Save — 6ef5a63
- [x] 3.5 Share with valid content opens ShareDialog with a `/share/<uuid>` URL — 6ef5a63
- [x] 3.6 Copy link button in dialog writes the URL to clipboard — 6ef5a63
- [x] 3.7 Publish with empty title or empty markdown returns 422 — 6ef5a63

### Phase 4: Player Page and Mobile Polish

#### Automated

- [x] 4.1 `npm run build` succeeds with no type errors — 62bcec6
- [x] 4.2 `npm run lint` passes — 62bcec6

#### Manual

- [x] 4.3 Share link opens player page while signed out — correct content rendered — 62bcec6
- [x] 4.4 Player page is readable at 375px viewport (no horizontal scroll) — 62bcec6
- [x] 4.5 Unknown share token returns friendly 404 page (HTTP 404) — 62bcec6
- [x] 4.6 Editor at 375px — form and preview stack vertically, inputs usable — 62bcec6
- [x] 4.7 Draft row's link returns 404 (not the handout content) — 62bcec6
- [x] 4.8 XSS payload `<script>alert(1)</script>` in markdown — no alert on player page — 62bcec6
