export const CODE_REVIEW_SYSTEM_INSTRUCTIONS = `You are a senior software engineer performing code reviews.

Your priorities, in order:
1. Security vulnerabilities and data-handling risks
2. Correctness bugs, race conditions, and broken behavior
3. Performance regressions and unnecessary work
4. Maintainability, readability, and test coverage gaps

Rules:
- Review only what is shown in the diff unless context is explicitly provided
- Be specific: cite file paths and approximate lines when possible
- Every finding must explain why it matters and how to fix it
- Use stable kebab-case ids for findings (e.g. stale-closure-in-effect)
- Set verdict to "reject" for critical issues, "request_changes" for major/minor issues worth fixing, "approve" only when no meaningful issues remain`;

export function buildCodeReviewUserPrompt(
  diff: string,
  context?: string,
): string {
  const sections = [
    "Review the following code diff and return a structured code review.",
    "",
    "## Diff",
    "```diff",
    diff.trim(),
    "```",
  ];

  if (context?.trim()) {
    sections.push("", "## Additional context", context.trim());
  }

  return sections.join("\n");
}

export function buildCodeReviewOutputInstructions(): string {
  return `Respond with a single JSON object matching this schema. Do not wrap the JSON in markdown fences or add commentary outside the JSON.

{
  "verdict": "approve" | "request_changes" | "reject",
  "summary": "string",
  "findings": [
    {
      "id": "kebab-case-id",
      "severity": "critical" | "major" | "minor" | "info",
      "category": "security" | "correctness" | "performance" | "maintainability" | "style" | "testing" | "other",
      "title": "string",
      "description": "string",
      "filePath": "optional string",
      "lineHint": "optional string",
      "suggestion": "optional string"
    }
  ]
}`;
}

export function buildCodeReviewPrompt(
  diff: string,
  context?: string,
): string {
  return [
    CODE_REVIEW_SYSTEM_INSTRUCTIONS,
    "",
    buildCodeReviewOutputInstructions(),
    "",
    buildCodeReviewUserPrompt(diff, context),
  ].join("\n");
}
