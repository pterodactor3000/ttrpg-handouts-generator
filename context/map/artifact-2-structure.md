# Artifact 2 — Structure (dependency graph)

**Status:** complete  
**Method:** dependency-cruiser on TypeScript/JavaScript import graph  
**Depends on:** `artifact-1-territory.md` (active areas)  
**Prompt:** `.cursor/prompts/m4l2-2-structure-dependency-cruiser.md`  
**Generated:** 2026-06-21

How the codebase is wired — cycles, layer boundaries, and testability risks in the hottest areas from artifact 1.

---

## Tooling

| Item | Value |
| ---- | ----- |
| Tool | dependency-cruiser **v17.4.3** (devDependency) |
| Config file | `.dependency-cruiser.cjs` (generated via `npx depcruise --init src`, patched for Astro virtual modules) |
| Entry roots | `src/**/*.ts`, `src/**/*.tsx` |
| Areas scoped from artifact 1 | `src/components/organisms`, `molecules`, `atoms`, `src/pages/api`, `src/lib`, `src/middleware.ts` |
| Run command | `npx depcruise src --config .dependency-cruiser.cjs` |
| Graph size | **61 modules**, **119 dependencies** (TS/TSX only) |

### Setup notes

- Config uses `tsconfig.json` path alias `@/*` → `./src/*`.
- `astro:env/server` and `astro:middleware` are excluded from `not-to-unresolvable` — they are build-time virtual modules, not disk paths.
- **`.astro` files are not in the graph** (dependency-cruiser scanned `.ts`/`.tsx` only). Page → component → lib wiring in `.astro` routes is documented manually below as `unknown` / manual follow-up.

### Top 3 exploration ideas (for ongoing use)

1. **HandoutEditor hub** — `--focus src/components/organisms/HandoutEditor.tsx --include-only "^src"` to see the highest fan-out module and what a UI change drags in.
2. **Layer rule enforcement** — add custom `forbidden` rules (lib ↛ components, api ↛ components, molecules ↛ organisms) and run in CI alongside ESLint.
3. **Markdown pipeline isolation** — `--focus src/lib/handout-renderer.ts` to keep the unified/remark dependency chain visible separately from UI churn.

### Report types available

| Command / output | Use |
| ---------------- | --- |
| `--output-type err` | CI gate — violations only |
| `--output-type text` | Human-readable edge list |
| `--output-type json` | Scripting (cycles, fan-in/out) |
| `--output-type dot` + Graphviz | SVG subgraphs for onboarding (`--focus`, `--include-only`, `--collapse`) |
| `--output-type archi` | High-level folder architecture view |
| `--output-type metrics` | Fan-in/fan-out, dependency counts |

---

## Key observations

1. **No import cycles** in the TS/TSX graph — the young codebase has a clean DAG; change risk is fan-out depth, not circular imports.
2. **Hard layer boundaries hold** — `lib`, `api`, and `components` do not cross forbidden boundaries in resolvable imports; `types.ts` is a true leaf (fan-in 7, fan-out 0).
3. **HandoutEditor is the structural hub** — 10 internal `src/` dependencies (highest fan-out); matches artifact 1’s #2 file by git activity.
4. **`src/lib/utils.ts` and `src/lib/supabase.ts` are shared infrastructure** — fan-in 11 and 9 respectively; many modules converge here.
5. **Graph is incomplete without Astro** — hot `.astro` pages (`dashboard.astro`, `HandoutCard.astro`, `share/[token].astro`) orchestrate React islands and lib calls but do not appear as nodes; coupling is understated.

---

## Cycles in active areas

Only cycles touching territory hot spots — not a full-repo dump.

**Result: zero cycles** touching active areas (or anywhere in the TS/TSX graph).

| Area | Finding | Evidence (dependency-cruiser) | Why it matters on change | Link to artifact 1 | Next check |
| ---- | ------- | ----------------------------- | ------------------------ | ------------------ | ---------- |
| `src/components/organisms` | No cycles | `depcruise src` — 0 circular deps among 61 modules | UI refactors won’t force circular extract-interface work | 33 commits; HandoutEditor hot spot | Re-run after adding cross-imports between organisms |
| `src/components/molecules` + `atoms` | No cycles | Same graph scan | Theme/editor molecule changes stay one-directional (atoms ← molecules ← organisms) | Co-change pair #1 in artifact 1 | Enforce with custom `no-circular` in CI |
| `src/pages/api` | No cycles | API routes only import `@/lib/supabase` + zod + Sentry | Handout API changes stay localized | 27 commits on `src/pages/api` | Graph misses `.astro` callers — see layer table |
| `src/lib` | No cycles | `handout-renderer` → 7 npm packages, no back-edges from lib to UI | Markdown pipeline can be tested in isolation | 22 commits on `src/lib` | Watch for future `lib → components` leaks |
| `src/middleware.ts` | Not fully resolved | Imports `astro:middleware` (virtual) + `@/lib/supabase` | Auth gate changes touch every protected route | Co-changes with API in artifact 1 | Manual: read `PROTECTED_ROUTES` + middleware together |

---

## Layer boundaries

Expected layers for this repo:

| Layer | Role |
| ----- | ---- |
| `src/types.ts` | Shared types (foundation) |
| `src/lib/` | Services, Supabase client, markdown renderer, theme config |
| `src/pages/api/` | Server API routes |
| `src/pages/*.astro` | SSR pages (orchestration — **not in graph**) |
| `src/components/{atoms,molecules,organisms}/` | UI (React islands + Astro components) |
| `src/middleware.ts` | Auth gate |

| Boundary checked | Result | Evidence (dependency-cruiser) | Why it matters on change | Link to artifact 1 | Next check |
| ---------------- | ------ | ----------------------------- | ------------------------ | ------------------ | ---------- |
| `types` ← everything, `types` → nothing | **Pass** | 7 importers, 0 outgoing `src/` deps | Safe shared contract for handout/editor/API work | `types.ts` in hot file list | Keep types free of runtime imports |
| `lib` ↛ `components` / `pages` | **Pass** | 0 violations in automated rule scan | Lib helpers stay reusable from API and pages | `src/lib` #4 by commits | Add ESLint/depcruise forbidden rule to guard |
| `components` ↛ `pages` / `api` | **Pass** (TS/TSX) | 0 TS imports from components to pages/api | UI doesn’t reach into routes directly | Organisms co-change with pages via git, not imports | Confirm `.astro` frontmatter follows same rule |
| `api` ↛ `components` | **Pass** | All handout/auth API routes → `supabase` + zod only | API deployable without UI bundle | 27 commits on API | — |
| `atoms` ← `molecules` ← `organisms` | **Mostly pass** | No atom→organism or molecule→organism imports | Matches atomic design in `src/AGENTS.md` | Git co-change across all three layers | One exception below |
| `organisms` ↛ `organisms` (peer) | **Soft violation** | `HandoutEditor.tsx` → `ShareDialog.tsx` | Editor and share modal coupled; extracting ShareDialog affects editor | HandoutEditor #2 file by commits | Consider moving ShareDialog to molecules or in-editor slot |
| Pages orchestration (manual) | **Unknown in graph** | `.astro` imports: e.g. `dashboard.astro` → `HandoutList.astro` → `HandoutCard.astro` → React atoms; `share/[token].astro` → `handout-renderer` + `supabase` | Real runtime stack is page → organism → lib | Pages co-change with organisms in artifact 1 | Add `.astro` to `extraExtensionsToScan` or document manually |

---

## Testability risks

### Summary

The codebase splits cleanly for testing: **pure lib** (markdown, backgrounds, fonts) suits unit tests; **Supabase + API + middleware** need integration tests (already present under `__tests__/integration/`); **HandoutEditor** mixes preview rendering, fetch calls, Sentry, and many UI deps — unit tests need heavy mocking, e2e is the natural safety net for edit/share flows.

### Risk list

| Module / area | Risk | Mock-heavy vs integration vs e2e | Evidence | Link to artifact 1 |
| ------------- | ---- | ---------------------------------- | -------- | ------------------ |
| `HandoutEditor.tsx` | Highest fan-out (10 `src/` deps) + client fetch to `/api/handouts` + Sentry | **Mock-heavy** unit possible (`HandoutEditor.test.tsx` exists); **e2e** for save/publish/dirty-state | `depcruise --focus organisms`; imports renderer, backgrounds, 4 molecules, ShareDialog | #2 file, 17 commits |
| `handout-renderer.ts` | 7 npm packages (unified/remark/rehype) | **Unit** — already tested in `__tests__/lib/handout-renderer.test.ts` | Isolated leaf in graph, no `src/` deps | Part of `src/lib` hot zone |
| `supabase.ts` | Fan-in 9; `astro:env/server` | **Integration** — requires cookies/env/Supabase | Central server client for API, middleware, pages | API + middleware co-change |
| `middleware.ts` | Virtual `astro:middleware` + supabase session | **Integration** — `auth-gate.integration.test.ts` | Gates protected routes | 7 commits, co-changes with API |
| `ArchiveButton` / `DeleteHandoutButton` | Fetch + DOM helpers (`archive-handout-card-dom.ts`) | **Unit** with DOM mock + **integration** for API | Orphan entry points (mounted from `.astro` only) | Dashboard/archive activity |
| `load-handout-for-edit.ts` | Server loader: supabase + types | **Integration** — `edit-handout.integration.test.ts` | Used by `edit.astro` (not in graph) | `s-03` edit flow |
| `HandoutArticle` (`.astro` + `.tsx`) | Duplicate presentation paths | **Two test surfaces** — TSX version tested; Astro share page untested by graph | Share page uses `.astro`; editor preview uses `.tsx` | Share + editor co-change |
| `global.css` | Not in import graph | **Visual/e2e** only | CSS coupling invisible to dependency-cruiser | #3 file by git activity |

### Most suspicious modules

1. **`HandoutEditor.tsx`** — structural hub + network I/O + preview pipeline; highest cost to test in isolation.
2. **`src/lib/supabase.ts`** — single session/auth bottleneck for API, middleware, and SSR pages.
3. **`archive-handout-card-dom.ts`** — bridges React actions to static Astro DOM; easy to break without integration coverage.

### What to check next

- Add dependency-cruiser **custom rules** matching `src/AGENTS.md` (no organism→organism, lib stays below UI).
- Extend scan to **`.astro`** frontmatter imports or maintain a manual page→component matrix.
- Run `--output-type metrics` on `HandoutEditor.tsx` after major editor features land.

### Optional next step: graph

Deferred (no SVG in this pass). Recommended focused question:

> “What does HandoutEditor pull in?”

```bash
npx depcruise src --config .dependency-cruiser.cjs \
  --include-only "^src" \
  --focus "src/components/organisms/HandoutEditor.tsx" \
  --output-type dot \
  | dot -T svg > context/map/handout-editor-subgraph.svg
```

---

## Coverage gaps (`unknown`)

| Layer / stack part | Why not in graph | Manual follow-up |
| ------------------ | ---------------- | ---------------- |
| `.astro` pages & components | Not scanned (only `.ts`/`.tsx` in config) | Page import map from grep; consider `extraExtensionsToScan` |
| `src/styles/global.css` | CSS — no JS import graph | Treat as cross-cutting theme layer (artifact 1) |
| `supabase/migrations/` | SQL — outside JS graph | RLS/integration tests cover data layer |
| `astro:env/server`, `astro:middleware` | Virtual modules | Known Astro pattern; excluded from unresolvable rule |
| `e2e/` Playwright specs | Not under `src/` cruise | E2E covers paths graph cannot see |

---

## Key observations for synthesis

1. **Structure is healthier than git co-change suggests** — git shows atoms/molecules/organisms moving together; import graph is acyclic and mostly top-down.
2. **Real coupling is a few hubs** — `HandoutEditor`, `utils.ts`, `supabase.ts`, plus CSS — not widespread spaghetti.
3. **Tooling blind spot is Astro SSR** — onboarding map must combine dependency-cruiser with page-level import reading.
4. **Testing strategy already matches structure** — unit tests on lib, integration on API/RLS/auth, component tests on editor/buttons.
5. **One convention gap** — organism imports organism (`HandoutEditor` → `ShareDialog`); minor but worth noting for refactors.

---

## Handoff to artifact 3 (contributors)

Prioritize contributor contact for:

- `HandoutEditor.tsx` / handout UI vertical slice
- `src/pages/api/handouts/*` + `middleware.ts`
- `src/lib/handout-renderer.ts` + markdown safety
- Integration test owners (`__tests__/integration/`)
