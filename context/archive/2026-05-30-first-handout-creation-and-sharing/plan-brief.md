# First Handout Creation and Sharing — Plan Brief

> Full plan: `context/changes/first-handout-creation-and-sharing/plan.md`

## What & Why

Build the north-star S-01 slice: a GM can create a handout (markdown over a themed background), see a live preview, save a draft, and publish it to receive a permanent share link. Players open that link on any device without logging in. This slice validates the product's core hypothesis — that the compose → share pipeline is worth building — and must surface any rendering complexity in week 1.

## Starting Point

The F-01 schema is done: the `handouts` table with `draft`/`published`/`archived` state machine, `share_token uuid unique`, and RLS policies (GMs own their rows; anonymous reads via share token) are all migrated. The app shell has working auth, an Astro SSR framework, and a dashboard stub — but zero handout-facing routes, components, or API endpoints, and no markdown library installed.

## Desired End State

A signed-in GM reaches `/handouts/new` via a button on the dashboard, fills in a title, picks one of three themed backgrounds (each a CSS-gradient placeholder, real art swappable later), types markdown that renders live in a composited preview panel, saves a draft, then clicks Share to publish — a modal appears with the permanent link and a copy button. Opening `/share/<uuid>` in any browser, signed in or not, shows the rendered handout over the background with a footer; an invalid token returns a clear 404.

## Key Decisions Made

| Decision                  | Choice                                                                | Why (1 sentence)                                                                                                | Source          |
| ------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------- |
| Preview timing            | Live (updates on every keystroke)                                     | Fastest feedback; `unified.processSync()` is synchronous and fast enough at handout lengths                     | Plan            |
| Render + sanitize library | `unified` remark/rehype pipeline + `rehype-sanitize`                  | Only viable DOM-free, pure-ESM option that runs identically in the browser and on the Cloudflare workerd server | Plan (research) |
| Background compositing    | CSS overlay (gradient background + readable panel)                    | Zero render cost, meets <5 s NFR trivially, mobile-responsive by default, no image-export requirement in scope  | Plan            |
| Background assets         | CSS-gradient placeholders now                                         | Unblocks the pipeline immediately; real art drops in by filename later                                          | Plan            |
| Editor entry point        | "New handout" button → `/handouts/new`                                | Clean dedicated route, no collision with S-02 dashboard list                                                    | Plan            |
| Save / publish model      | Save handout (any time) + Share to publish                              | Matches PRD Business Logic state machine exactly                                                                | Plan            |
| Validation on publish     | Title + background + non-empty markdown all required                  | Prevents blank or unviewable share links                                                                        | Plan            |
| Sanitization scope        | Standard GFM elements + safe-protocol links/images; raw HTML stripped | Closes all XSS vectors without a DOM; matches PRD XSS-safety guardrail                                          | Plan            |
| Player route              | `/share/[token]`                                                      | Uses the F-01 unguessable UUID as designed; decouples public URL from internal `id`                             | Plan            |
| Player content            | Title + rendered markdown over background + app footer                | Tags are a GM organization tool; players don't need them                                                        | Plan            |
| Post-publish UX           | Share dialog with permanent link + copy button                        | Delivers the "share moment" cleanly; defines a clean boundary with S-03                                         | Plan            |
| Player 404                | Friendly "Handout not found" page (HTTP 404)                          | Clear to players, correct semantics, no info leak                                                               | Plan            |
| Testing                   | Manual E2E + vitest unit tests for `renderHandoutHtml`                | Tests the one security-critical pure function without a full E2E rig                                            | Plan            |
| Responsive scope          | Both editor and player mobile-responsive                              | Player NFR is explicit; editor usable on mobile as a bonus                                                      | Plan            |

## Scope

**In scope:**

- Shared `renderHandoutHtml` module (remark/rehype, unit-tested)
- Background config map + CSS-gradient placeholders
- `/handouts/new` page + `HandoutEditor` React island with live preview
- `POST /api/handouts` (create draft) + `PUT /api/handouts/[id]` (update draft)
- `POST /api/handouts/[id]/publish` (transition → published, mint share token)
- `ShareDialog` component
- "New handout" button on dashboard stub
- `/share/[token]` public player page (SSR, server-side render, no-login)
- `/share/not-found` friendly 404
- Mobile-responsive layout for both editor and player

**Out of scope:**

- Handout list / dashboard rebuild (S-02)
- Editing published handouts (S-03)
- Delete / archive (S-04)
- PDF/PNG export, custom background upload, WYSIWYG editor, autosave, version history, tag filtering

## Architecture / Approach

The shared `src/lib/handout-renderer.ts` module (`renderHandoutHtml`) is the single XSS boundary — both the React island (browser, live preview) and the Astro player page (workerd server, SSR) call it. No HTML ever comes from the DB; markdown is always rendered at read time. Background categories are resolved through `src/lib/backgrounds.ts` — the only file that translates DB enum values to UI labels and CSS strings.

API routes follow the existing pattern (`createClient` + zod validation + redirect or JSON response). The HandoutEditor island manages all form state in React and calls API routes via `fetch()` — no page navigation needed for save/publish. The Supabase `anon` role + `anon_select_shared` RLS policy handles player access; no special anonymous client is needed, just the existing `createClient()` with no session cookie.

## Phases at a Glance

| Phase                        | What it delivers                                                          | Key risk                                                             |
| ---------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1. Render core + assets      | Tested, XSS-safe `renderHandoutHtml`; background config map; vitest wired | Remark/rehype packages must bundle cleanly with the Astro/Vite build |
| 2. Editor island + draft API | Live-preview editor at `/handouts/new`; draft save to DB                  | Two-column layout on mobile needs care from the start                |
| 3. Publish + share           | Publish API; ShareDialog; "New handout" entry on dashboard                | UUID minting via `crypto.randomUUID()` (available on workerd)        |
| 4. Player page + polish      | Public `/share/[token]` page; friendly 404; mobile verification           | `<Fragment set:html>` usage in Astro (not `dangerouslySetInnerHTML`) |

**Prerequisites:** F-01 schema migrated (done), local Supabase running (`npx supabase start`), `.dev.vars` with `SUPABASE_URL` and `SUPABASE_KEY`.
**Estimated effort:** ~3–4 after-hours sessions across 4 phases.

## Open Risks & Assumptions

- The remark/rehype ESM packages must build without issues through `@astrojs/cloudflare`'s Vite config — confirmed viable by research but should fail fast in Phase 1's `npm run build` check.
- CSS-gradient placeholders look functional but plain; real background art is a follow-up tracked outside this slice.
- `crypto.randomUUID()` is assumed available as a workerd global — if not, fall back to Supabase's `gen_random_uuid()` via `.rpc()`.

## Success Criteria (Summary)

- A GM can create a handout, see a live preview, and receive a working share link in a single browser session
- Opening the share link in an incognito browser (no login) shows the correct handout, rendered and readable on a 375px mobile viewport
- Pasting `<script>alert(1)</script>` into the markdown textarea produces no JavaScript execution in the preview or on the player page
