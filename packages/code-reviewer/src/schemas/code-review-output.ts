import { z } from "zod";

export const reviewSeveritySchema = z.enum([
  "critical",
  "major",
  "minor",
  "info",
]);

export const reviewCategorySchema = z.enum([
  "security",
  "correctness",
  "performance",
  "maintainability",
  "style",
  "testing",
  "other",
]);

export const codeReviewFindingSchema = z.object({
  id: z
    .string()
    .describe("Stable kebab-case identifier for this finding, e.g. missing-error-boundary"),
  severity: reviewSeveritySchema,
  category: reviewCategorySchema,
  title: z.string(),
  description: z.string(),
  filePath: z.string().optional(),
  lineHint: z
    .string()
    .optional()
    .describe("Approximate line number or short code snippet reference"),
  suggestion: z.string().optional(),
});

export const codeReviewOutputSchema = z.object({
  verdict: z.enum(["approve", "request_changes", "reject"]),
  summary: z.string(),
  findings: z.array(codeReviewFindingSchema),
});

export type ReviewSeverity = z.infer<typeof reviewSeveritySchema>;
export type ReviewCategory = z.infer<typeof reviewCategorySchema>;
export type CodeReviewFinding = z.infer<typeof codeReviewFindingSchema>;
export type CodeReviewOutput = z.infer<typeof codeReviewOutputSchema>;

export const CODE_REVIEW_OUTPUT_JSON_SCHEMA = {
  type: "object",
  required: ["verdict", "summary", "findings"],
  properties: {
    verdict: {
      type: "string",
      enum: ["approve", "request_changes", "reject"],
    },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "severity", "category", "title", "description"],
        properties: {
          id: { type: "string" },
          severity: {
            type: "string",
            enum: ["critical", "major", "minor", "info"],
          },
          category: {
            type: "string",
            enum: [
              "security",
              "correctness",
              "performance",
              "maintainability",
              "style",
              "testing",
              "other",
            ],
          },
          title: { type: "string" },
          description: { type: "string" },
          filePath: { type: "string" },
          lineHint: { type: "string" },
          suggestion: { type: "string" },
        },
      },
    },
  },
} as const;
