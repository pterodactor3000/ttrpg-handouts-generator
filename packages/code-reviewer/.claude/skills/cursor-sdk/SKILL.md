---
name: cursor-sdk
description: Cursor Agent SDK patterns for this package — Agent.prompt, local agents, structured JSON output.
---

# Cursor SDK (code-reviewer)

Use **@cursor/sdk** to run the same Cursor agent as the IDE from Node.js.

## Key imports

```ts
import { Agent } from "@cursor/sdk";
import type { AgentOptions } from "@cursor/sdk";
```

## Running a review

```ts
import { runCodeReview } from "@ttrpg-handouts/code-reviewer";

const result = await runCodeReview({ diff: "..." });
```

For promptfoo or custom evals, import `buildCodeReviewPrompt`, `CODE_REVIEW_SYSTEM_INSTRUCTIONS`, and `codeReviewOutputSchema` separately.

## Agent options

```ts
import { createCodeReviewAgentOptions } from "@ttrpg-handouts/code-reviewer";

const options = createCodeReviewAgentOptions({
  modelId: "composer-2.5",
  cwd: process.cwd(),
});
```

## Environment

- `CURSOR_API_KEY` — required
- `CODE_REVIEW_MODEL` — optional, defaults to `composer-2.5`
- `CODE_REVIEW_CWD` — optional local workspace for the agent

## Docs

- [TypeScript SDK](https://cursor.com/docs/sdk/typescript)
- [Agent.prompt](https://cursor.com/docs/evals)
