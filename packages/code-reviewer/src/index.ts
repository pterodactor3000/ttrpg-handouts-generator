import { readFile } from "node:fs/promises";
import { stdin } from "node:process";
import { fileURLToPath } from "node:url";

import {
  createCodeReviewAgentOptionsFromInput,
  getCodeReviewAgentOptionsFromDefaults,
  runCodeReview,
} from "./agent/code-review-agent.js";
import {
  createCodeReviewAgentOptions,
  DEFAULT_MODEL_ID,
  getCodeReviewAgentOptions,
  resolveCodeReviewCwd,
  resolveCodeReviewModelId,
} from "./lib/cursor-config.js";
import { normalizeCodeReviewOutput } from "./lib/normalize-review-output.js";
import { parseDocumentedExceptionsFromPrBody } from "./lib/parse-documented-exceptions.js";
import { parseJsonFromAgentText } from "./lib/parse-review-output.js";
import {
  buildCodeReviewOutputInstructions,
  buildCodeReviewPrompt,
  buildCodeReviewUserPrompt,
  CODE_REVIEW_SYSTEM_INSTRUCTIONS,
} from "./prompts/code-review-instructions.js";
import {
  acceptanceCriterionIdSchema,
  acceptanceCriterionResultSchema,
  acceptanceCriterionStatusSchema,
  CODE_REVIEW_OUTPUT_JSON_SCHEMA,
  codeReviewFindingSchema,
  codeReviewOutputSchema,
  documentedExceptionSchema,
  prStateSchema,
  reviewCriterionSchema,
  reviewSeveritySchema,
} from "./schemas/code-review-output.js";

export {
  createCodeReviewAgentOptionsFromInput,
  getCodeReviewAgentOptionsFromDefaults,
  runCodeReview,
  createCodeReviewAgentOptions,
  getCodeReviewAgentOptions,
  DEFAULT_MODEL_ID,
  resolveCodeReviewCwd,
  normalizeCodeReviewOutput,
  parseDocumentedExceptionsFromPrBody,
  buildCodeReviewOutputInstructions,
  buildCodeReviewPrompt,
  buildCodeReviewUserPrompt,
  CODE_REVIEW_SYSTEM_INSTRUCTIONS,
  CODE_REVIEW_OUTPUT_JSON_SCHEMA,
  acceptanceCriterionIdSchema,
  acceptanceCriterionResultSchema,
  acceptanceCriterionStatusSchema,
  codeReviewFindingSchema,
  codeReviewOutputSchema,
  documentedExceptionSchema,
  prStateSchema,
  reviewCriterionSchema,
  reviewSeveritySchema,
};

/** @deprecated Use createCodeReviewAgentOptionsFromInput */
export { createCodeReviewAgentOptionsFromInput as createCodeReviewAgent };

/** @deprecated Use getCodeReviewAgentOptionsFromDefaults */
export { getCodeReviewAgentOptionsFromDefaults as getCodeReviewAgent };

export type {
  AcceptanceCriterionId,
  AcceptanceCriterionResult,
  AcceptanceCriterionStatus,
  CodeReviewFinding,
  CodeReviewOutput,
  DocumentedException,
  NormalizedCodeReviewOutput,
  PrState,
  ReviewCriterion,
  ReviewSeverity,
} from "./schemas/code-review-output.js";

export type {
  CreateCodeReviewAgentOptions,
  RunCodeReviewInput,
} from "./agent/code-review-agent.js";

export type { NormalizeReviewOutputOptions } from "./lib/normalize-review-output.js";

export type { BuildCodeReviewUserPromptInput } from "./prompts/code-review-instructions.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readDiffFromArgs(args: string[]): Promise<string> {
  const fileFlagIndex = args.indexOf("--file");
  if (fileFlagIndex !== -1) {
    const filePath = args[fileFlagIndex + 1];
    if (!filePath) {
      throw new Error("Missing path after --file");
    }
    return readFile(filePath, "utf8");
  }

  if (args.length > 0 && !args[0]?.startsWith("-")) {
    return readFile(args[0]!, "utf8");
  }

  return readStdin();
}

function readFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage:
  npm run review -- [--file] <diff-file> [--title <pr-title>] [--description <path-or-text>] [--model <model-id>] [--cwd <path>]
  npm run review -- --dry-run [--file <diff-file>] [--expected <json-file>] [--title <pr-title>] [--description <path-or-text>]
  cat patch.diff | npm run review

Environment:
  CURSOR_API_KEY       Required Cursor API key (not needed for --dry-run)
  CODE_REVIEW_MODEL    Model id (default: ${DEFAULT_MODEL_ID})
  CODE_REVIEW_CWD      Local agent workspace (default: process.cwd())
`);
    return;
  }

  const diff = await readDiffFromArgs(args);
  const prTitle = readFlagValue(args, "--title");
  const prDescriptionRaw = readFlagValue(args, "--description");
  const prDescription = prDescriptionRaw
    ? await readFileIfExists(prDescriptionRaw)
    : undefined;

  if (args.includes("--dry-run")) {
    const prompt = buildCodeReviewPrompt({
      diff,
      prTitle,
      prDescription,
    });
    const expectedPath =
      readFlagValue(args, "--expected") ??
      "fixtures/sample-counter.expected.json";
    const expectedRaw = await readFile(expectedPath, "utf8");
    const parsed = codeReviewOutputSchema.parse(
      parseJsonFromAgentText(expectedRaw),
    );
    const review = normalizeCodeReviewOutput(parsed, { prDescription });

    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          model: resolveCodeReviewModelId(readFlagValue(args, "--model")),
          cwd: resolveCodeReviewCwd(readFlagValue(args, "--cwd")),
          diffLines: diff.trim().split("\n").length,
          promptPreview: `${prompt.slice(0, 400)}…`,
          review,
        },
        null,
        2,
      ),
    );
    return;
  }

  const output = await runCodeReview({
    diff,
    prTitle,
    prDescription,
    modelId: readFlagValue(args, "--model"),
    cwd: readFlagValue(args, "--cwd"),
  });

  console.log(JSON.stringify(output, null, 2));
}

async function readFileIfExists(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return path;
  }
}

const entryPath = process.argv[1]
  ? fileURLToPath(import.meta.url)
  : undefined;
const invokedPath = process.argv[1];

if (entryPath && invokedPath && entryPath === invokedPath) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
