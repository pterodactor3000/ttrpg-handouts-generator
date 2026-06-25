# Artifact 1 — Territory (git activity)

**Status:** complete  
**Method:** git history wide scan (last 12 months)  
**Prompt:** `.cursor/prompts/m4l2-1-territory-git-history.md`  
**Generated:** 2026-06-21

Where the project is actually touched — folders, files, co-change patterns, and how focus shifted over time.

---

## Scope and filters

- **Window requested:** last 12 months (`--since=2025-06-21`)
- **Actual history:** repo started **2026-05-22** — entire history (~**195 commits**) falls inside the window; there is no data before May 2026
- **Noise excluded:** `package-lock.json`, `package.json`, ts/eslint/prettier/vitest/playwright/wrangler/astro configs, `.github/workflows/`, husky, `.cursor/`, `.agents/`, `.rtk/`, `CLAUDE.md`, `AGENTS.md`, `playwright-report/`, `test-results/`, `__snapshots__/`, dotenv files, Sentry config stubs
- **Counting method:** number of **commits** that touched each path (not line churn)

---

## Top activity — folders and modules

### Top 10 folders / modules

| Rank | Path | Commits | Notes |
| ---- | ---- | ------- | ----- |
| 1 | `context/foundation` | 44 | Roadmap, test-plan, lessons — planning docs, not runtime code |
| 2 | `src/components/organisms` | 33 | HandoutEditor and related UI |
| 3 | `src/pages/api` | 27 | Handout CRUD, auth endpoints |
| 4 | `src/lib` | 22 | Renderer, backgrounds, fonts, Supabase helpers |
| 5 | `src/components/atoms` | 21 | Themed UI primitives |
| 6 | `src/components/molecules` | 20 | HandoutCard, form molecules |
| 7 | `context/archive/*` | 17+ | Archived change folders (historical, still in git) |
| 8 | `context/changes/s-03` | 12 | **Only active in-flight change** at scan time |
| 9 | `__tests__/integration` | 11+ | Handout + RLS integration tests |
| 10 | `src/pages/share` | 8 | Public share view |

_Historical `context/changes/<id>/` folders (e.g. `first-handout-creation-and-sharing` at 22 commits) rank high in raw history but are **archived** — see [Deleted or moved hot spots](#deleted-or-moved-hot-spots)._

### Top 10 files

| Rank | Path | Commits | Notes |
| ---- | ---- | ------- | ----- |
| 1 | `context/foundation/roadmap.md` | 18 | Milestone tracking |
| 2 | `src/components/organisms/HandoutEditor.tsx` | 17 | Core editor island |
| 3 | `src/styles/global.css` | 11 | Themed backgrounds, fonts, category styles |
| 4 | `src/components/molecules/HandoutCard.astro` | 9 | Dashboard card |
| 5 | `context/foundation/test-plan.md` | 8 | Test rollout strategy |
| 6 | `src/pages/dashboard.astro` | 8 | GM dashboard |
| 7 | `context/changes/s-03/plan.md` | 7 | Current change plan |
| 8 | `src/pages/api/handouts/[id].ts` | 7 | Handout API |
| 9 | `context/foundation/lessons.md` | 7 | Agent/dev lessons |
| 10 | `src/pages/share/[token].astro` | 7 | Player-facing share page |

_Archived `context/changes/*/plan.md` files (6–10 commits each) still appear in history but **no longer exist on disk**._

---

## Activity by quarter

Only **2026-Q2** exists in repo history. Monthly split is more informative than empty quarters.

| Period | Hot areas | Shift vs previous period |
| ------ | --------- | ------------------------ |
| **2026-05** (bootstrap → MVP) | `context/changes/first-handout-creation-and-sharing`, `src/pages/api`, `src/components/auth`, handout schema & markdown parsing changes | Greenfield: auth, schema, first handout flow, API routes |
| **2026-06** (polish + quality) | `src/components/organisms`, `src/components/molecules/atoms`, testing changes (access control, markdown safety), per-style fonts, retheme backgrounds, UI restyle | Shift from **backend/schema** to **UI theming**, **HandoutEditor**, and **test hardening**; active work lands in `context/changes/s-03` |

---

## Co-change coupling

### Top directory pairs / triples in the same commits

| Rank | Paths (pair or triple) | Frequency | Implication |
| ---- | ---------------------- | --------- | ----------- |
| 1 | `src/components/molecules` + `src/components/organisms` | 10 | Handout UI is edited as a vertical slice across atomic layers |
| 2 | `src/components/atoms` + `src/components/molecules` | 7 | Theme/token changes ripple through the component tree |
| 3 | `src/components/atoms` + `src/components/organisms` | 7 | Same — styling work skips intermediate folders in some commits |
| 4 | `src/components/organisms` + `src/pages` | 7 | Editor/preview pages and organism components ship together |
| 5 | `src/layouts` + `src/pages` | 6 | Landing/dashboard layout and page content co-evolve |
| 6 | `src/components/organisms` + `src/pages/share` | 6 | Share view and editor/preview share handout rendering concerns |
| T1 | `atoms` + `molecules` + `organisms` | 5 | Full component-tree refactors (UI restyle, fonts, backgrounds) |
| T2 | `atoms` + `molecules` + `src/pages` | 5 | Page + card + atom changes in one commit (dashboard/handout flows) |
| T3 | `molecules` + `organisms` + `src/pages` | 4 | Handout editing UX touches all three |

### Top 3 co-change insights

1. **Handout UI is a coupled vertical slice** — `HandoutEditor`, `HandoutCard`, themed atoms, `global.css`, and share/dashboard pages change together; expect multi-file edits for any visual or editor behavior change.
2. **API and auth middleware move together** — `src/pages/api` + `src/middleware.ts` co-appear in access-control and handout API work; auth gates and endpoints are not independent.
3. **Planning commits inflate `context/` coupling** — large feature commits often touch `context/foundation/roadmap.md`, change plans, and src in one shot; git co-change overstates runtime coupling between docs and code.

---

## Cross-cutting files

Single files that change together with many unrelated areas (shared config, i18n, generated output, etc.).

| File | Co-changes with | Likely reason | Still in repo? |
| ---- | --------------- | ------------- | -------------- |
| `src/styles/global.css` | 41 distinct dirs across commits | **Manual** — global theme/background/font rules touched in every UI-facing change | Yes |
| `src/components/organisms/HandoutEditor.tsx` | 34 dirs | **Manual** — central editor; appears in wide feature commits | Yes |
| `context/foundation/roadmap.md` | 30 dirs | **Manual** — updated alongside nearly every shipped change | Yes |
| `README.md` | 26 dirs | **Manual** — doc updates bundled with feature work | Yes |
| `.gitignore` | 30 dirs | **Manual/config** — tooling/test additions | Yes |
| `.vscode/settings.json` | 30 dirs | **Config** — editor settings in bootstrap/tooling commits | Yes |
| `src/middleware.ts` | 24 dirs | **Manual** — auth route protection tied to new pages/API | Yes |
| `src/pages/dashboard.astro` | 25 dirs | **Manual** — dashboard evolves with every handout feature | Yes |

**Common denominator:** `global.css` and `HandoutEditor.tsx` are the real runtime hubs. `roadmap.md` is the documentation hub — high co-change count reflects process, not import coupling.

---

## Deleted or moved hot spots

Historically active paths that no longer exist or were renamed — do not treat as current territory.

| Former path | Last seen (approx.) | Current location / fate |
| ----------- | ------------------- | ----------------------- |
| `context/changes/first-handout-creation-and-sharing/` | May–Jun 2026 | `context/archive/2026-05-30-first-handout-creation-and-sharing/` |
| `context/changes/testing-access-control-critical-path/` | Jun 2026 | `context/archive/2026-06-04-testing-access-control-critical-path/` |
| `context/changes/per-style-fonts/` | Jun 2026 | `context/archive/2026-06-17-per-style-fonts/` |
| `context/changes/retheme-backgrounds/` | Jun 2026 | `context/archive/2026-06-17-retheme-backgrounds/` |
| `context/changes/ui-restyle/` | Jun 2026 | `context/archive/2026-06-09-ui-restyle/` |
| `context/changes/handout-dashboard/` | Jun 2026 | `context/archive/2026-06-07-handout-dashboard/` |
| `src/integration/smoke.test.ts` | Early Jun 2026 | **Deleted** — superseded by `__tests__/integration/` layout |
| `supabase/snippets/Untitled query 585.sql` | Jun 2026 | **Deleted** — ad-hoc snippet removed |

_Pattern: completed changes leave `context/changes/<id>/` history but files live under `context/archive/YYYY-MM-DD-<id>/`. Prefer archive paths when reading old plans._

---

## Key observations

1. **Young repo (~1 month)** — “12-month territory” equals full project lifetime; no long-term drift yet.
2. **Runtime hot zone is handout UI + API** — `src/components/organisms`, `src/pages/api`, `src/lib`, and `global.css` dominate hands-on code activity.
3. **`context/foundation` is the busiest folder by commit count** — roadmap/test-plan churn; distinguish planning docs from product code when prioritizing onboarding reads.
4. **Component atomic layers co-change heavily** — atoms/molecules/organisms rarely move independently; structure analysis should treat them as one UI subsystem.
5. **Archive hygiene is good but git history retains old change paths** — co-change stats still reference `context/changes/<archived-id>/`; verify paths exist before deep dives.

---

## Inputs for downstream artifacts

Areas to pass to artifact 2 (structure) and artifact 3 (contributors):

- `src/components/organisms` — especially `HandoutEditor.tsx`
- `src/components/molecules` + `src/components/atoms` — HandoutCard, themed primitives
- `src/pages/api/handouts/` — handout CRUD API
- `src/lib/` — `handout-renderer.ts`, `backgrounds.ts`, `fonts.ts`, `supabase.ts`
- `src/styles/global.css` — cross-cutting theme coupling
- `src/middleware.ts` — auth gate vs protected routes
- `__tests__/integration/handouts/` + `__tests__/integration/migration/` — test coupling to API/RLS
- `context/changes/s-03` — current in-flight work (edit-handout flow)
