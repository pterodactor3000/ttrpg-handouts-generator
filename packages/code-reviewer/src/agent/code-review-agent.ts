import { Agent } from "@cursor/sdk";
import type { AgentOptions } from "@cursor/sdk";

import {
  createCodeReviewAgentOptions,
  getCodeReviewAgentOptions,
  type CreateCodeReviewAgentOptions,
} from "../lib/cursor-config.js";
import { parseJsonFromAgentText } from "../lib/parse-review-output.js";
import { buildCodeReviewPrompt } from "../prompts/code-review-instructions.js";
import {
  codeReviewOutputSchema,
  type CodeReviewOutput,
} from "../schemas/code-review-output.js";

export type RunCodeReviewInput = {
  diff: string;
  context?: string;
  modelId?: string;
  apiKey?: string;
  cwd?: string;
};

export function createCodeReviewAgentOptionsFromInput(
  options: CreateCodeReviewAgentOptions = {},
): AgentOptions {
  return createCodeReviewAgentOptions(options);
}

export function getCodeReviewAgentOptionsFromDefaults(): AgentOptions {
  return getCodeReviewAgentOptions();
}

/** @deprecated Use createCodeReviewAgentOptionsFromInput */
export const createCodeReviewAgent = createCodeReviewAgentOptionsFromInput;

/** @deprecated Use getCodeReviewAgentOptionsFromDefaults */
export const getCodeReviewAgent = getCodeReviewAgentOptionsFromDefaults;

export async function runCodeReview(
  input: RunCodeReviewInput,
): Promise<CodeReviewOutput> {
  const agentOptions =
    input.modelId || input.apiKey || input.cwd
      ? createCodeReviewAgentOptions({
          modelId: input.modelId,
          apiKey: input.apiKey,
          cwd: input.cwd,
        })
      : getCodeReviewAgentOptions();

  const result = await Agent.prompt(
    buildCodeReviewPrompt(input.diff, input.context),
    agentOptions,
  );

  if (result.status === "error") {
    throw new Error("Code review agent failed to complete.");
  }

  if (result.status === "cancelled") {
    throw new Error("Code review agent run was cancelled.");
  }

  if (!result.result?.trim()) {
    throw new Error("Code review agent returned an empty response.");
  }

  const parsed = parseJsonFromAgentText(result.result);
  return codeReviewOutputSchema.parse(parsed);
}

export { codeReviewOutputSchema };

export type { CreateCodeReviewAgentOptions };
