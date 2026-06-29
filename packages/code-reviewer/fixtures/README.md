# Code reviewer fixtures

Synthetic diffs for manual and automated model comparison. Each fixture ships a diff, gold-standard expected review, and metadata listing planted defects.

## Fixtures

| Fixture | Diff | Use case |
| ------- | ---- | -------- |
| `sample-counter` | Small React counter refactor | Quick smoke / schema validation |
| `handout-editor-migration` | Class→hooks migration + new API + migration | Multi-model eval (richer defects) |

## Quick commands

From `packages/code-reviewer`:

```bash
# Dry-run (no API key) — sample counter
npm run dry-review

# Dry-run — handout migration stub
npm run review:migration -- --dry-run

# Live review against one model
npm run review:migration -- --model composer-2.5

# Pipe diff from stdin
cat fixtures/handout-editor-migration.diff | npm run review -- --title "// [S-03]::[edit-handout] // feat: ..."
```

## handout-editor-migration planted defects

See `handout-editor-migration.meta.json` for the full list. Models should surface at least:

1. Stale `useEffect` with `[]` deps (correctness)
2. Hardcoded service-role key (security)
3. Missing auth + client-trusted `gmId` (security)
4. Stack trace in API response (security)
5. Migration without RLS (security / A2)
6. Drive-by `dashboard.astro` change (minimal_scope / A3)
7. Missing `prerender = false` (repo_idioms / A2)
8. No tests for new route (test_coverage)

Gold output: `handout-editor-migration.expected.json` (`state: fail`, `mergeBlocked: true` after normalization).

Token usage and cost: `npm run fetch-usage` writes `handout-editor-migration.usage.json`. Regenerate report with `npx tsx fixtures/regenerate-results-md.ts`.

## Comparing models

Run the same diff with different `--model` values and diff JSON outputs, or use promptfoo (see `.cursor/prompts/m5l3-promptfoo.md`). Static check: parsed output should have `state !== "pass"` and findings covering the planted defect ids.
