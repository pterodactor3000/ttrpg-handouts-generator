import { z } from "zod";

/** PR state from context/foundation/code-review-policy.md */
export const prStateSchema = z.enum([
  "pass",
  "fail",
  "fail_documented_exception",
]);

export const reviewSeveritySchema = z.enum(["bug", "risk", "nit", "question"]);

/** Five review criteria from code-review-policy.md */
export const reviewCriterionSchema = z.enum([
  "correctness",
  "repo_idioms",
  "minimal_scope",
  "test_coverage",
  "security",
]);

export const acceptanceCriterionIdSchema = z.enum([
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "A6",
]);

export const acceptanceCriterionStatusSchema = z.enum([
  "met",
  "not_met",
  "not_assessed",
  "excepted",
]);

export const documentedExceptionSchema = z.object({
  criterion: z
    .string()
    .describe("Acceptance ID (A1–A5), review criterion, or finding id"),
  why: z.string(),
  riskMitigation: z.string(),
  followUp: z.string(),
});

export const codeReviewFindingSchema = z.object({
  id: z
    .string()
    .describe("Stable kebab-case identifier, e.g. stale-closure-in-effect"),
  severity: reviewSeveritySchema,
  criterion: reviewCriterionSchema,
  acceptanceCriterion: acceptanceCriterionIdSchema
    .optional()
    .describe("When the finding maps to an acceptance gate criterion"),
  title: z.string(),
  description: z.string(),
  filePath: z.string().optional(),
  lineHint: z
    .string()
    .optional()
    .describe("Approximate line number or short code snippet reference"),
  suggestion: z.string().optional(),
});

export const acceptanceCriterionResultSchema = z.object({
  id: acceptanceCriterionIdSchema,
  status: acceptanceCriterionStatusSchema,
  note: z.string().optional(),
});

export const codeReviewOutputSchema = z.object({
  state: prStateSchema,
  summary: z.string(),
  acceptanceCriteria: z.array(acceptanceCriterionResultSchema),
  findings: z.array(codeReviewFindingSchema),
  documentedExceptions: z.array(documentedExceptionSchema),
});

export type PrState = z.infer<typeof prStateSchema>;
export type ReviewSeverity = z.infer<typeof reviewSeveritySchema>;
export type ReviewCriterion = z.infer<typeof reviewCriterionSchema>;
export type AcceptanceCriterionId = z.infer<typeof acceptanceCriterionIdSchema>;
export type AcceptanceCriterionStatus = z.infer<
  typeof acceptanceCriterionStatusSchema
>;
export type DocumentedException = z.infer<typeof documentedExceptionSchema>;
export type CodeReviewFinding = z.infer<typeof codeReviewFindingSchema>;
export type AcceptanceCriterionResult = z.infer<
  typeof acceptanceCriterionResultSchema
>;
export type CodeReviewOutput = z.infer<typeof codeReviewOutputSchema>;

export type NormalizedCodeReviewOutput = CodeReviewOutput & {
  mergeBlocked: boolean;
};

export const CODE_REVIEW_OUTPUT_JSON_SCHEMA = {
  type: "object",
  required: [
    "state",
    "summary",
    "acceptanceCriteria",
    "findings",
    "documentedExceptions",
  ],
  properties: {
    state: {
      type: "string",
      enum: ["pass", "fail", "fail_documented_exception"],
    },
    summary: { type: "string" },
    acceptanceCriteria: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "status"],
        properties: {
          id: {
            type: "string",
            enum: ["A1", "A2", "A3", "A4", "A5", "A6"],
          },
          status: {
            type: "string",
            enum: ["met", "not_met", "not_assessed", "excepted"],
          },
          note: { type: "string" },
        },
      },
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "severity", "criterion", "title", "description"],
        properties: {
          id: { type: "string" },
          severity: {
            type: "string",
            enum: ["bug", "risk", "nit", "question"],
          },
          criterion: {
            type: "string",
            enum: [
              "correctness",
              "repo_idioms",
              "minimal_scope",
              "test_coverage",
              "security",
            ],
          },
          acceptanceCriterion: {
            type: "string",
            enum: ["A1", "A2", "A3", "A4", "A5", "A6"],
          },
          title: { type: "string" },
          description: { type: "string" },
          filePath: { type: "string" },
          lineHint: { type: "string" },
          suggestion: { type: "string" },
        },
      },
    },
    documentedExceptions: {
      type: "array",
      items: {
        type: "object",
        required: ["criterion", "why", "riskMitigation", "followUp"],
        properties: {
          criterion: { type: "string" },
          why: { type: "string" },
          riskMitigation: { type: "string" },
          followUp: { type: "string" },
        },
      },
    },
  },
} as const;
