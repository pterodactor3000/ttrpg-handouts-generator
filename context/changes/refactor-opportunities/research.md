---
date: 2026-06-24T19:26:00+02:00
researcher: Cogitator
source_report: context/changes/post-flow-analysis/research.md
git_commit: 62ba8366b82da40bc998c84448edbe678d50ef8e
branch: feature/lesson-16
repository: ttrpg-handouts-generator
topic: "Refactor opportunities — handout save flow technical debt"
tags: [research, refactor, technical-debt, ranking, candidates, verified]
status: complete
last_updated: 2026-06-24
last_updated_by: Cogitator
last_updated_note: "Structural claims verified with rg (ast-grep 0.1.0 installed; does not support $$$ wildcard syntax used in 0.44.0 — rg used as primary verification tool)"
verification_commit: 62ba8366b82da40bc998c84448edbe678d50ef8e
---

# Research: Refactor Opportunities — Handout Save Flow

**Date**: 2026-06-24T19:26:00+02:00  
**Researcher**: Cogitator  
**Source report**: `context/changes/post-flow-analysis/research.md`  
**Git commit**: `62ba8366b82da40bc998c84448edbe678d50ef8e`

---

## Input: Problems from Source Report

The post-flow analysis documented seven technical debt items (TD-1 through TD-7). Below they are listed and classified.

### Candidate Classification

A **CANDIDATE** is a problem whose fix changes code structure. A non-candidate is a missing test, a documentation gap, or a UX issue with no structural dimension.

| ID | Problem | Classification | Reason |
|----|---------|---------------|--------|
| TD-1 | `handoutInputSchema` duplicated in both API files | **CANDIDATE** | Extract to shared module changes import graph |
| TD-2 | No generated Supabase types — 9 (report: 7) stringly-typed call sites | **CANDIDATE** | Requires typing the Supabase client and rewriting all query result interfaces |
| TD-3 | `SaveApiResponse.error` typed as `string`, API returns a Zod tree object | **CANDIDATE** | Requires changing either the API response shape or the client type + serialization |
| TD-4 | PUT miss (wrong owner / archived / unknown id) returns 500 instead of 404 | **CANDIDATE** | Requires restructuring the PUT error-branch logic |
| TD-5 | HandoutEditor save UX has zero test coverage | **NOT A CANDIDATE** | Missing tests only; no structural code change implied |
| TD-6 | `TagsInput` enforces no tag-count or tag-length limits | **CANDIDATE** | Requires adding validation logic to a UI component |
| TD-7 | `Handout` (snake_case) and `InitialHandout` (camelCase) are parallel types with no compile-time link | **CANDIDATE** | Requires unifying types or adding a derive/enforce mechanism |

**Non-candidate retained for context:** TD-5 (missing test coverage) is an input into the feasibility cost estimate for candidates that currently lack UI-layer tests, but is not itself a candidate.

---

## Sub-agent 1 — Current Shape

### TD-1: Duplicated Zod schema

- `src/pages/api/handouts/index.ts:8-13` — defines `handoutInputSchema` as a module-local `const`. [**evidence** — read file]
- `src/pages/api/handouts/[id].ts:8-13` — defines the identically-named `handoutInputSchema` with byte-for-byte identical content. [**evidence** — read file]
- Both use `handoutInputSchema.safeParse(body)` at `index.ts:43` and `[id].ts:53`. [**evidence**]
- No shared import exists. Each file independently defines the schema; TypeScript cannot detect drift between the two.
- The `camelCase → snake_case` column mappings (`markdownContent → markdown_content`, `backgroundCategory → background_category`) appear independently in `index.ts:54-59` and `[id].ts:64-69`. [**evidence**]

### TD-2: No generated Supabase types

- `src/lib/supabase.ts:9` — `createServerClient(SUPABASE_URL, SUPABASE_KEY, ...)` called with no `Database` generic. [**evidence**]
- All `.from('handouts')` calls accept any column name without compile-time validation. [**evidence**]
- **9 call sites (report: 7) in 7 files** — rg found 2 additional call sites beyond the save-flow scope: `src/pages/dashboard.astro:21` and `src/pages/share/[token].astro:29`. Both are stringly-typed. [**verified — correction**]
- Local hand-written narrowing interfaces exist in three places:
  - `src/pages/api/handouts/index.ts:15-21` — `HandoutRow`, `HandoutQueryResult` (plain `{ message: string }` error)
  - `src/pages/api/handouts/[id].ts:15-21` — identical shape, slightly wider error (`code?: string` added later)
  - `src/lib/load-handout-for-edit.ts:5-13` — `HandoutEditRow` with seven columns hand-listed
- A column rename in a migration would silently succeed at compile time; runtime would fail. [**inference**]

### TD-3: SaveApiResponse.error mismatch

- `src/components/organisms/HandoutEditor.tsx:22` — `type SaveApiResponse = { id: string } | { error: string }`. [**evidence**]
- `src/components/organisms/HandoutEditor.tsx:113` — `setSaveError('error' in responseData ? responseData.error : 'Failed to save handout.')` — passes `responseData.error` directly to state, no stringify. [**evidence**]
- `src/pages/api/handouts/index.ts:45` — on Zod failure: `JSON.stringify({ error: z.treeifyError(parseResult.error) })`. `z.treeifyError` returns a nested object, not a string. [**evidence**]
- Same pattern in `[id].ts:55`. [**evidence**]
- At runtime, when validation fires a 400: `responseData.error` is an object; `setSaveError` receives an object; React renders `[object Object]` to the user. This is an active UX defect, not merely future risk. [**inference from evidence**]

### TD-4: PUT miss returns 500 instead of 404

- `src/pages/api/handouts/[id].ts:76-83`:
  ```
  if (error || !data) {
    if (error && error.code !== 'PGRST116') {
      console.error(...)
      Sentry.captureException(error)
    }
    return new Response(..., { status: 500 })
  }
  ```
  [**evidence**]
- `PGRST116` is PostgREST's "no rows found" code. The code already knows about it — it suppresses Sentry capture — but still returns 500. [**evidence**]
- For comparison, the DELETE handler in the same file, lines 121-125:
  ```
  if (error?.code === 'PGRST116' || !data) {
    return new Response(..., { status: 404 })
  }
  ```
  [**evidence** — read same file]
- Both wrong-owner and archived-handout PUTs resolve as PGRST116 (0 rows from the filtered `.eq('gm_id').neq('status','archived')` query). [**inference**]

### TD-6: TagsInput missing validation limits

- `src/components/molecules/TagsInput.tsx:12-18` — `addTag()` checks only for empty string and duplicate:
  ```
  const trimmed = inputValue.trim().toLowerCase()
  if (trimmed && !tags.includes(trimmed)) {
    onChange([...tags, trimmed])
  }
  ```
  [**evidence**]
- No check for `tags.length >= 20` (API limit) or `trimmed.length > 50` (API limit). [**evidence**]
- A user can add 21 or more tags, or a 100-character tag; the editor will build and send a payload that the API rejects with a 400. The UI error display then shows `[object Object]` (compounded by TD-3). [**inference from evidence**]

### TD-7: Handout vs InitialHandout type split

- `src/types.ts:5-17` — `Handout`: snake_case, full DB-aligned, 11 fields including `gm_id`, `created_at`, `published_at`, `archived_at`.
- `src/types.ts:19-27` — `InitialHandout`: camelCase, 7 fields; omits `gm_id`, `created_at`, `published_at`, `archived_at`. [**evidence**]
- `src/lib/load-handout-for-edit.ts:15-25` — `mapHandoutEditRow()` manually maps each snake_case key to its camelCase counterpart. [**evidence**]
- The mapping is not enforced by TypeScript: the function takes a hand-written `HandoutEditRow` interface (not derived from `Handout`), so a rename to `Handout` would not surface at the mapping call site. [**evidence + inference**]
- `HandoutEditor.tsx:42-66`: state initialized from `InitialHandout` props; uses camelCase throughout. [**evidence**]

---

## Sub-agent 2 — History and Intentionality

### TD-1: Duplicated Zod schema — verdict: **accidental complexity**

- Commit `66aab0a` (2026-05-30, "Editor Island and Draft API (p2)"): both API files created in the same commit, both containing the schema from the start. No ADR, no comment, no evidence of deliberate separation.
- Initial schema in `[id].ts` had no `max(50)` on tag strings; `index.ts` had the same. Both diverged slightly in the `d09b4c4` security commit (ownership, longer tag strings), then converged again in `5474f48`. The drift and re-sync happened unnoticed — confirming that the dual-maintenance is an ongoing accidental tax.
- **Verdict: accidental complexity.** The copy existed from the first commit for convenience; no design intent found.

### TD-2: No generated Supabase types — verdict: **accidental complexity** (unknown whether deliberate)

- `src/lib/supabase.ts` was created early in the project (before `35a5a8e` "initial project setup") with an untyped client.
- Commit `6dfd729` "TypeScript entity types (p2)" added `Handout` and `BackgroundCategory` to `types.ts` — evidence the team was aware of the need for shared types, but chose hand-written ones.
- No ADR, no comment explaining why `supabase gen types` was not used.
- `supabase gen types typescript` requires a running Supabase instance and a script step — it's plausible this was deferred for convenience and never revisited.
- **Verdict: accidental complexity (unknown).** No evidence of a deliberate choice; most likely a deferred decision that solidified into debt.

### TD-3: SaveApiResponse.error mismatch — verdict: **accidental complexity**

- Commit `66aab0a`: `SaveApiResponse` and `handleSave` written at the same time as the API `z.treeifyError` call. The mismatch was introduced on day one.
- No subsequent commit addressed the type mismatch. The Sentry commit `554acb3` added error capture to the API but did not revisit the client type.
- **Verdict: accidental complexity.** The API and client types were written by the same session without cross-checking.

### TD-4: PUT miss returns 500 instead of 404 — verdict: **accidental complexity** (partially addressed, never completed)

- Commit `66aab0a`: PUT returns 500 on all errors, including PGRST116.
- Commit `71ec904` (2026-06-18, "Archive vs permanent delete UX"): DELETE handler added, returns 404 on PGRST116. This is the correct pattern. The PUT was not updated.
- Commit `554acb3` (2026-06-14, "Error Capture Depth (p2)"): Sentry capture added to PUT; PGRST116 **suppressed** from Sentry to avoid noise — the developer was clearly aware that PGRST116 is not a real error. The 500 status was not fixed.
- **Verdict: accidental complexity.** The team recognized PGRST116 as non-error twice (suppress from Sentry, use 404 in DELETE) but did not complete the fix in PUT.

### TD-6: TagsInput missing validation — verdict: **accidental complexity**

- Commit `66aab0a`: `TagsInput.tsx` created with the duplicate-prevention check only; Zod schema created at the same time. No evidence that keeping the UI unconstrained was intentional.
- **Verdict: accidental complexity.**

### TD-7: Handout vs InitialHandout — verdict: **partly intentional**

- `Handout` (snake_case) created in commit `6dfd729` — a standalone "TypeScript entity types" milestone, before the edit page existed.
- `InitialHandout` (camelCase) created in commit `07d196a` "HandoutEditor initial-data props (p2)" — three weeks later, when the edit page was built.
- The camelCase DTO is a natural consequence of the API layer using camelCase JSON and the React component operating on camelCase state. The split across the DB/API boundary is **intentional**.
- What is **accidental**: the `mapHandoutEditRow` function uses a hand-written `HandoutEditRow` (not derived from `Handout`), so adding a field to `Handout` does not force an update to the mapping.
- **Verdict: partly intentional.** The two-type split is a deliberate architectural boundary. The unenforced mapping is accidental.

---

## Sub-agent 3 — Migration Feasibility

### TD-1: Duplicated Zod schema

- **Target shape**: `src/lib/handout-schema.ts` exporting `handoutInputSchema` and `HandoutInput` (inferred type). Both API files import from there.
- **Blast radius**: `index.ts`, `[id].ts` — 2 files, import change only. `types.ts` unaffected. No migration required.
- **Existing safeguards**: `handout-validation.integration.test.ts` covers all schema paths for both POST and PUT. `readErrorBody` does not assert error body shape — only status code and schema-leakage check — so test assertions survive an error-format change. No test changes needed for the extraction itself.
- **CI gate**: lint + unit + integration all run. The extraction is purely mechanical; TypeScript will enforce the correct import.
- **First prerequisite step**: none. Create `src/lib/handout-schema.ts`, move schema, update imports.
- **Risk**: very low.

### TD-2: No generated Supabase types

- **Target shape**: `supabase gen types typescript --local > src/types/supabase.ts`; `createServerClient<Database>` in `supabase.ts`; replace all local `HandoutRow`/`HandoutQueryResult`/`HandoutEditRow` interfaces with derived types.
- **Blast radius**: `supabase.ts`, `index.ts`, `[id].ts`, `load-handout-for-edit.ts`, `archive.ts`, `publish.ts`, `dashboard.astro`, `share/[token].astro` (all 9 call sites, report: 7) + `types.ts` (may partially overlap generated types) = 9 files (report: 5+).
- **Existing safeguards**: integration tests cover all DB operations. TypeScript strict mode will surface type errors at compile time after the migration. CI runs `npx astro sync` + lint.
- **First prerequisite step**: add `supabase gen types typescript --local > src/types/supabase.ts` as an `npm run gen:types` script and verify it outputs a stable file with a running local Supabase.
- **Risk**: medium. Purely mechanical but high surface area. Requires local Supabase instance at dev time for type generation. Best done as a standalone workstream.

### TD-3: SaveApiResponse.error mismatch

- **Two target-shape options**:
  - **Option A (serialize in API)**: Replace `z.treeifyError(parseResult.error)` with a flat string in both API routes. E.g.: `JSON.stringify(parseResult.error.flatten().fieldErrors)` or a human-readable message. No client changes. This is a 1-line change per API file.
  - **Option B (fix client type)**: Change `SaveApiResponse` to `{ id: string } | { error: unknown }` in `HandoutEditor.tsx`, add `typeof responseData.error === 'string' ? responseData.error : JSON.stringify(responseData.error)` before `setSaveError`. Requires coordinating both API and client.
- **Blast radius**:
  - Option A: `index.ts`, `[id].ts` only.
  - Option B: `index.ts`, `[id].ts`, `HandoutEditor.tsx`.
- **Existing safeguards**: `handout-validation.integration.test.ts` validation tests assert status 400 and call `readErrorBody` which does not assert body shape — **Option A requires no test changes**. Option B does not change status codes either, so also no test changes.
- **First prerequisite step**: decide what message to show users on validation failure (product decision: "Invalid input" flat message vs. structured field errors). Option A defaults to a flat message; Option B enables structured display in future.
- **Risk**: low for Option A; low-to-medium for Option B.

### TD-4: PUT miss returns 500 instead of 404

- **Target shape**: In PUT handler (`[id].ts`), split the error check:
  ```
  if (error?.code === 'PGRST116' || !data) {
    return 404
  }
  if (error) {
    log + Sentry.captureException
    return 500
  }
  ```
  The DELETE handler (same file, lines 121-125) is the exact template.
- **Blast radius**: `[id].ts` only for production code. Two test files must update status-code assertions:
  - `edit-handout.integration.test.ts:206` — `expectErrorBody(response, 500, ...)` → `expectErrorBody(response, 404, ...)`
  - `edit-handout.integration.test.ts:220` — same update
  - `handout-ownership.integration.test.ts:179` — same update
  Total: 3 assertion lines in 2 test files.
- **Existing safeguards**: the three tests listed above serve as the regression net; updating them is part of the fix.
- **CI gate**: integration tests run on every PR.
- **First prerequisite step**: none. The DELETE handler is already the correct pattern.
- **Risk**: very low.

### TD-6: TagsInput validation limits

- **Target shape**: In `TagsInput.tsx`, add to `addTag()`:
  - `if (tags.length >= 20) return;` — block add when at cap
  - `if (trimmed.length > 50) return;` or show an inline error
- **Blast radius**: `TagsInput.tsx` only (leaf component).
- **Existing safeguards**: no unit tests for `TagsInput` exist (TD-5 territory). A new test would need to be added alongside the fix to maintain test coverage.
- **First prerequisite step**: none. But note: fixing this without fixing TD-3 still results in silent UI feedback on limit violations (the tag just doesn't get added). Adding user-visible error messages is a UX improvement beyond the structural fix.
- **Risk**: very low.

### TD-7: Handout vs InitialHandout type split

- **Target shapes (three options)**:
  - **Option A — derive**: Use mapped types to derive `InitialHandout` from `Handout` (rename keys + omit server-only fields). Requires mapped type gymnastics; Handout uses snake_case, InitialHandout uses camelCase — standard mapped types cannot rename keys without a custom helper.
  - **Option B — generate and unify**: After TD-2 (generated Supabase types), derive both `Handout` and `InitialHandout` from the generated schema. Eliminates hand-written types entirely.
  - **Option C — enforce the mapping**: Add a compile-time check ensuring `mapHandoutEditRow` exhaustively handles every key of `HandoutEditRow`. E.g. use `satisfies` or a type-level test. Lowest risk, no restructuring.
- **Blast radius**:
  - Option A: `types.ts`, `load-handout-for-edit.ts`, potentially `HandoutEditor.tsx`.
  - Option B: same as TD-2 + above.
  - Option C: `load-handout-for-edit.ts` only (add `satisfies` assertion).
- **First prerequisite step**: If Option B, TD-2 must be done first. If Option C, none.
- **Risk**: Option C — very low. Options A/B — medium to high.

---

## Refactor Opportunities

### Ranking

#### #1 — TD-1: Extract shared `handoutInputSchema`

**Current shape → target shape**: Two identical module-local schema definitions in `index.ts:8-13` and `[id].ts:8-13` → one canonical `src/lib/handout-schema.ts` exporting `handoutInputSchema` and `type HandoutInput`.

**Why this rank**: The cost of debt compounds with every future field addition — a dual manual update with no compile-time catch, across two files, every time. The cost of the fix is near-zero: a mechanical extraction with no logic change, no test changes, and an existing integration test suite that covers all schema paths. This is the prerequisite step that reduces the blast radius of any future feature work in the save flow.

**Blast radius**: 2 files (`index.ts`, `[id].ts`) — import change only.

**Incremental path**:
1. Create `src/lib/handout-schema.ts`, move the schema and export `HandoutInput` type.
2. Update imports in `index.ts` and `[id].ts`.
3. Verify `npm run lint` and `npm test -- --project integration` pass.

**First prerequisite step**: none.

---

#### #2 — TD-4: Return 404 on PUT miss instead of 500

**Current shape → target shape**: `[id].ts:76-83` — single `if (error || !data) → 500` branch → split into `PGRST116 || !data → 404` and `real error → 500`, mirroring the DELETE handler pattern already in the same file.

**Why this rank**: This is an **already half-solved** defect. The team added PGRST116 awareness in `554acb3` (suppressed from Sentry), and implemented the correct 404 pattern in the DELETE handler in `71ec904`. The fix requires carrying an existing pattern five lines upward in the same file. The cost of leaving it is concrete: monitoring dashboards receive 500s on expected "row not found" flows, making production incidents harder to triage. The code change is a two-step split of an existing branch.

**Blast radius**: 1 production file; 3 test assertion lines in 2 test files.

**Incremental path**:
1. Replace the PUT error branch in `[id].ts` with the PGRST116 split (copy from DELETE handler).
2. Update the 3 test assertions in `edit-handout.integration.test.ts` and `handout-ownership.integration.test.ts` from `500` to `404`.
3. Verify integration tests pass.

**First prerequisite step**: none.

---

#### #3 — TD-3: Fix Zod tree displayed as `[object Object]` to users (Option A)

**Current shape → target shape**: `index.ts:45` and `[id].ts:55` return `{ error: z.treeifyError(parseResult.error) }` (nested object) on 400 → return a flat `{ error: string }` message instead. `HandoutEditor.tsx` type declaration `{ error: string }` then becomes accurate.

**Why this rank**: This is an **active UX defect**, not theoretical debt — any user who submits a handout with an invalid field sees `[object Object]` as the error message. Option A (stringify/flatten in the API) is the smallest possible change: one expression per API file, no client changes, no test changes. It closes the gap immediately. Option B (fix the client type) can follow as a separate refinement once the defect is resolved.

**Blast radius**: 2 files (`index.ts`, `[id].ts`) — one expression change each. Zero test changes (validation tests assert status 400 only, not error body shape).

**Incremental path (Option A)**:
1. In `index.ts:45`, replace `z.treeifyError(parseResult.error)` with a human-readable error string (e.g. `parseResult.error.flatten().fieldErrors` serialized, or a generic "Validation failed" message + field list).
2. Same in `[id].ts:55`.
3. Verify `npm run lint` passes; run `npm test -- --project integration` (no assertion changes needed).

**First prerequisite step**: decide on error message format (product decision: generic "Invalid input" vs. structured field-level message). This is a one-sentence decision, not a design session.

---

### Considered and Rejected

**TD-2 — No generated Supabase types**: High structural value (compile-time safety across all 7 DB call sites). Not ranked because the blast radius is high (5+ files, all local hand-typed interfaces must be replaced), it requires a dev-time Supabase instance and a new generation script, and it is best treated as a standalone workstream. It is a prerequisite for fully resolving TD-7, so it should be planned after the top-3 candidates reduce the noise in the codebase.

**TD-6 — TagsInput validation limits**: Low risk, isolated change. Not ranked top-3 because it is a UX improvement rather than a structural fix, it is currently masked by TD-3 (limit violations produce silent failures which also show `[object Object]`), and it has no existing test coverage to protect the change. Best done as a companion to TD-3 (fix the error display first, then add UI-side prevention).

**TD-7 — Handout/InitialHandout type split**: The camelCase/snake_case boundary is partly intentional architecture. The only accidental part is the unlinked `mapHandoutEditRow`. Option C (add `satisfies` assertion) is a low-cost compile-time guard, but it does not change structure in a meaningful way. Full resolution (Options A or B) depends on TD-2. Deferred until generated Supabase types are in place.

---

## Suggested Sequencing

If all top-3 are to be implemented:

```
TD-1 (schema extract) → TD-4 (PUT 404) → TD-3 (error string fix)
```

TD-1 first because it simplifies both TD-3 and any future field work. TD-4 and TD-3 are independent and can be batched or split into separate PRs.

---

## Claim Verification (ast-grep)

**Tool note**: The installed ast-grep version is 0.1.0 (not 0.44.0 used in the source report). Version 0.1.0 does not support the `$$$` and `$A` wildcard syntax. All structural claims were therefore verified with `rg` (ripgrep) as the primary tool. Patterns column records the rg expression used.

| # | Claim | Verdict | Evidence (file:line) | Method |
|---|-------|---------|----------------------|--------|
| 1 | `handoutInputSchema` at `index.ts:8-13` | ✓ confirmed | `index.ts:8` | `rg 'handoutInputSchema'` |
| 2 | `handoutInputSchema` at `[id].ts:8-13`, identical | ✓ confirmed | `[id].ts:8` | `rg 'handoutInputSchema'` |
| 3 | `handoutInputSchema.safeParse` at `index.ts:43` | ✓ confirmed | `index.ts:43` | `rg 'handoutInputSchema'` |
| 4 | `handoutInputSchema.safeParse` at `[id].ts:53` | ✓ confirmed | `[id].ts:53` | `rg 'handoutInputSchema'` |
| 5 | camelCase→snake_case mappings at `index.ts:54-59` | ✓ confirmed | `index.ts:57-58` (`markdown_content`, `background_category`) | `rg 'markdown_content: markdownContent'` |
| 6 | camelCase→snake_case mappings at `[id].ts:64-69` | ✓ confirmed | `[id].ts:66-67` | `rg 'markdown_content: markdownContent'` |
| 7 | `createServerClient` at `supabase.ts:9`, no generic | ✓ confirmed | `supabase.ts:9` — plain `createServerClient(URL, KEY, ...)` | `rg 'createServerClient'` |
| 8 | `HandoutRow` + `HandoutQueryResult` at `index.ts:15-21` | ✓ confirmed | `index.ts:15` (`HandoutRow`), `index.ts:18` (`HandoutQueryResult`) | `rg 'interface HandoutRow\|HandoutQueryResult'` |
| 9 | `HandoutRow` + `HandoutQueryResult` at `[id].ts:15-21`, wider error type | ✓ confirmed | `[id].ts:15`, `[id].ts:18` — error has `code?: string` vs `index.ts` plain `message` | `rg 'interface HandoutRow\|HandoutQueryResult'` |
| 10 | `HandoutEditRow` at `load-handout-for-edit.ts:5-13`, 7 columns | ✓ confirmed | `load-handout-for-edit.ts:5` — 7 fields: id, title, markdown_content, background_category, tags, status, share_token | `rg 'interface HandoutEditRow'` + file read |
| 11 | `.from('handouts')` — 7 call sites | ⚠ **correction** | 9 call sites in 7 files — 2 additional: `dashboard.astro:21`, `share/[token].astro:29` | `rg ".from\('handouts'\)"` |
| 12 | `SaveApiResponse = { id: string } \| { error: string }` at `HandoutEditor.tsx:22` | ✓ confirmed | `HandoutEditor.tsx:22` | `rg 'SaveApiResponse'` |
| 13 | `setSaveError(... responseData.error ...)` at `HandoutEditor.tsx:113` | ✓ confirmed | `HandoutEditor.tsx:113` | `rg 'setSaveError'` |
| 14 | `z.treeifyError(parseResult.error)` at `index.ts:45` | ✓ confirmed | `index.ts:45` | `rg 'z\.treeifyError'` |
| 15 | `z.treeifyError(parseResult.error)` at `[id].ts:55` | ✓ confirmed | `[id].ts:55` | `rg 'z\.treeifyError'` |
| 16 | PUT `if (error \|\| !data)` block at `[id].ts:76-83` | ✓ confirmed | `[id].ts:77` (PGRST116 inner check); outer `if` at `:76`, `status: 500` at `:82`, closing `}` at `:84` | `rg 'PGRST116'` + file read |
| 17 | PGRST116 suppresses Sentry in PUT but still returns 500 | ✓ confirmed | `[id].ts:77`: `if (error && error.code !== 'PGRST116')` inside 500 branch | `rg 'PGRST116'` |
| 18 | DELETE `PGRST116 \|\| !data → 404` at `[id].ts:121-125` | ✓ confirmed | `[id].ts:121`: `if (error?.code === 'PGRST116' \|\| !data)` → 404 | `rg 'PGRST116'` |
| 19 | `mapHandoutEditRow` at `load-handout-for-edit.ts:15-25` | ✓ confirmed | `load-handout-for-edit.ts:15` (definition), `:55` (single call site) | `rg 'mapHandoutEditRow'` |
| 20 | `Handout` at `types.ts:5-17`, 11 fields | ✓ confirmed | `types.ts:5-17` — 11 fields confirmed | file read |
| 21 | `InitialHandout` at `types.ts:19-27`, 7 fields | ✓ confirmed | `types.ts:19-27` — 7 fields confirmed | file read |
| 22 | `HandoutEditor` state initialized from `InitialHandout` at `HandoutEditor.tsx:42-66` | ✓ confirmed | `HandoutEditor.tsx:42-66` | file read |
| 23 | Test assertions: `edit-handout.integration.test.ts:206,220` and `handout-ownership.integration.test.ts:179` assert 500 | ✓ confirmed | all 3 lines confirmed | `rg 'expectErrorBody.*500'` |

**Correction impact on ranking**: TD-2 blast radius expands from "5+ files" to 9 files (9 call sites vs 7). This strengthens, not weakens, the rationale for treating TD-2 as a standalone workstream deferred after the top-3. Ranking positions are unchanged.
