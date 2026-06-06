<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Markdown Rendering Safety — Test Coverage

- **Plan**: context/changes/testing-markdown-rendering-safety/plan.md
- **Scope**: Phase 1 of 1
- **Date**: 2026-06-06
- **Verdict**: NEEDS ATTENTION (1 warning, fixed during triage)
- **Findings**: 0 critical  1 warning  0 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | PASS    |
| Success Criteria    | PASS    |

## Findings

### F1 — alert(1) assertion passes via hljs tokenization, not sanitizer removal

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/__tests__/handout-renderer.test.ts:147
- **Detail**: The assertion `expect(output).not.toContain('alert(1)')` in the pipeline-order test passes because rehypeHighlight tokenizes `alert` and `(1)` into separate `<span>` elements — not because the sanitizer stripped the payload. The actual security guarantee is carried by the companion assertion `.not.toContain('<script>')`. A future hljs version collapsing those tokens would produce a false test failure with no obvious cause.
- **Fix**: Add an inline comment explaining the tokenization mechanism.
- **Decision**: FIXED — added `// hljs splits across spans; contiguous string absent by tokenization` on line 147.
