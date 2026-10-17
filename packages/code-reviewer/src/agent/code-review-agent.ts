import { Agent } from "@cursor/sdk";
import type { AgentOptions } from "@cursor/sdk";

import {
  createCodeReviewAgentOptions,
  getCodeReviewAgentOptions,
  type CreateCodeReviewAgentOptions,
} from "../lib/cursor-config.js";
import { normalizeCodeReviewOutput } from "../lib/normalize-review-output.js";
import { parseJsonFromAgentText } from "../lib/parse-review-output.js";
import { buildCodeReviewPrompt } from "../prompts/code-review-instructions.js";
import {
  codeReviewOutputSchema,
  type NormalizedCodeReviewOutput,
} from "../schemas/code-review-output.js";

export type RunCodeReviewInput = {
  diff: string;
  prTitle?: string;
  prDescription?: string;
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
): Promise<NormalizedCodeReviewOutput> {
  const agentOptions =
    input.modelId || input.apiKey || input.cwd
      ? createCodeReviewAgentOptions({
          modelId: input.modelId,
          apiKey: input.apiKey,
          cwd: input.cwd,
        })
      : getCodeReviewAgentOptions();

  const result = await Agent.prompt(
    buildCodeReviewPrompt({
      diff: input.diff,
      prTitle: input.prTitle,
      prDescription: input.prDescription,
      context: input.context,
    }),
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
  const output = codeReviewOutputSchema.parse(parsed);

  return normalizeCodeReviewOutput(output, {
    prDescription: input.prDescription,
  });
}

export { codeReviewOutputSchema };

export type { CreateCodeReviewAgentOptions };
