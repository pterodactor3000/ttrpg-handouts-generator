# Extract Shared handoutInputSchema — Implementation Plan

## Overview

`handoutInputSchema` is defined identically in `src/pages/api/handouts/index.ts` and `src/pages/api/handouts/[id].ts`. Any future field addition requires a dual manual update with no compile-time safety net. This plan extracts the schema to `src/lib/handout-schema.ts`, making it the single source of truth for handout input validation.

## Current State Analysis

The schema at `index.ts:8-13` and `[id].ts:8-13` are byte-for-byte identical:

```ts
const handoutInputSchema = z.object({
  title: z.string().max(300),
  markdownContent: z.string().max(50000),
  backgroundCategory: z.enum(['fantasy', 'horror', 'scifi']),
  tags: z.array(z.string().max(50)).max(20),
});
```

Both call `handoutInputSchema.safeParse(body)` (`index.ts:43`, `[id].ts:53`) and both define the camelCase→snake_case column mappings downstream of the same inferred type. The camelCase binding names (`markdownContent`, `backgroundCategory`) and the column names (`markdown_content`, `background_category`) are implicit in the schema — an exported `HandoutInput` type makes them explicit for all consumers.

History confirms this is accidental: both files were created in the same commit (`66aab0a`) and a silent schema drift occurred across commits `d09b4c4` and `5474f48` before re-converging — the dual-maintenance tax has already been paid once.

## Desired End State

`src/lib/handout-schema.ts` is the single source of truth for handout input validation. Both API routes import `handoutInputSchema` and the `HandoutInput` type from there. A field addition or constraint change requires editing one file; TypeScript propagates the type to all consumers.

### Key Discoveries

- Schema at `index.ts:8-13` and `[id].ts:8-13` are identical — verified with rg (`context/changes/refactor-opportunities/research.md`, claim #1-2).
- Both files still use `z` directly after extraction — `index.ts` for `z.treeifyError` (line 45); `[id].ts` for `z.uuid()` (lines 41, 107) and `z.treeifyError` (line 55). The `import { z } from 'zod'` line stays in both files.
- Integration test suite (`__tests__/integration/handouts/handout-validation.integration.test.ts`) covers all schema paths for both POST and PUT. No test changes needed.
- Lessons applied: use `@/` alias for the new import; exports at end of file for the new module.

## What We're NOT Doing

- Fixing `z.treeifyError` returning an object to the client (TD-3).
- Fixing PUT returning 500 on miss instead of 404 (TD-4).
- Adding generated Supabase types (TD-2).
- Adding TagsInput validation limits (TD-6).
- Linking `mapHandoutEditRow` to `Handout` via `satisfies` (TD-7 Option C).

## Implementation Approach

Mechanical extraction: create a new lib module, move the schema constant and export it alongside its inferred type, then update both API routes to import from the new module. No logic changes anywhere.

---

## Phase 1: Extract Schema to Shared Module

### Overview

Create `src/lib/handout-schema.ts` as the canonical home for `handoutInputSchema` and `HandoutInput`. Remove the local definitions from both API routes and replace with imports.

### Changes Required

#### 1. New module — `src/lib/handout-schema.ts`

**File**: `src/lib/handout-schema.ts`

**Intent**: Create the canonical schema module. Export `handoutInputSchema` for use in API routes and `HandoutInput` for downstream type inference (e.g. the camelCase→snake_case column mappings already use these field names implicitly).

**Contract**: Exports two named bindings — `handoutInputSchema` (the Zod schema object) and `HandoutInput` (the TypeScript type inferred from the schema via `z.infer`). The schema body is the current definition from `index.ts:8-13`, moved verbatim. Exports placed at end of file per project convention. Import `z` from `'zod'` at the top.

#### 2. Update POST route — `src/pages/api/handouts/index.ts`

**File**: `src/pages/api/handouts/index.ts`

**Intent**: Replace the local `const handoutInputSchema = z.object(...)` definition (lines 8-13) with an import from the new shared module.

**Contract**: Remove lines 8-13. Add `import { handoutInputSchema } from '@/lib/handout-schema';` after the existing imports. The `import { z } from 'zod'` line stays — still used by `z.treeifyError` on line 45 (renumbered after removal).

#### 3. Update PUT/DELETE route — `src/pages/api/handouts/[id].ts`

**File**: `src/pages/api/handouts/[id].ts`

**Intent**: Replace the local `const handoutInputSchema = z.object(...)` definition (lines 8-13) with an import from the new shared module.

**Contract**: Remove lines 8-13. Add `import { handoutInputSchema } from '@/lib/handout-schema';` after the existing imports. The `import { z } from 'zod'` line stays — still used by `z.uuid()` on lines 41 and 107 and `z.treeifyError` on line 55 (all renumbered after removal).

### Success Criteria

#### Automated Verification

- Linting passes: `npm run lint`
- Integration tests pass: `npm test -- --project integration`
- Build (type check) passes: `npm run build`

#### Manual Verification

- No regressions in POST `/api/handouts` (create handout flow in the editor)
- No regressions in PUT `/api/handouts/[id]` (edit handout flow in the editor)

**Implementation Note**: After automated verification passes, pause for manual confirmation before considering the change done. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes live in the `## Progress` section below.

---

## Testing Strategy

### Integration Tests

The existing `handout-validation.integration.test.ts` covers all schema validation paths for both POST and PUT. No new tests required — the extraction is transparent to test behaviour.

### Manual Testing Steps

1. Start dev server: `npm run dev`
2. Create a new handout via the editor — verify save succeeds.
3. Edit an existing handout — verify save succeeds.
4. Submit a handout with an empty title — verify 400 response (schema constraints still enforced).

## References

- Research: `context/changes/refactor-opportunities/research.md`
- Pre-change schema source: `src/pages/api/handouts/index.ts:8-13`
- Pre-change duplicate: `src/pages/api/handouts/[id].ts:8-13`
- Integration tests: `__tests__/integration/handouts/handout-validation.integration.test.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Extract Schema to Shared Module

#### Automated

- [ ] 1.1 Linting passes: `npm run lint`
- [ ] 1.2 Integration tests pass: `npm test -- --project integration`
- [ ] 1.3 Build (type check) passes: `npm run build`

#### Manual

- [ ] 1.4 No regressions in POST `/api/handouts`
- [ ] 1.5 No regressions in PUT `/api/handouts/[id]`
