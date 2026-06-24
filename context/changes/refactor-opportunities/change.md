---
change_id: refactor-opportunities
title: Rank and prioritize post-flow technical debt as refactor opportunities
status: plan_reviewed
created: 2026-06-24
updated: 2026-06-24
archived_at: null
---

## Notes

We have an analysis of this repository that documents technical debt and structural risks: context/changes/post-flow-analysis/research.md.
This change answers the question that analysis deliberately left open: WHICH of those problems are worth fixing, in what target shape, and in what order.
We explore each recorded problem in code and history, then organize them as refactor opportunities.
The change proceeds in stages: exploration → decision and plan → implementation.
At the exploration stage no refactoring happens and no decisions are made.
Output of exploration: research.md for this change, ending with a ranked list of options with trade-offs.
