import type { AgentOptions } from "@cursor/sdk";

export const DEFAULT_MODEL_ID = "composer-2.5";

export type CreateCodeReviewAgentOptions = {
  modelId?: string;
  apiKey?: string;
  cwd?: string;
};

export function resolveCursorApiKey(apiKey?: string): string {
  const resolved = apiKey ?? process.env.CURSOR_API_KEY;

  if (!resolved) {
    throw new Error(
      "CURSOR_API_KEY is required. Set it in the environment or pass apiKey.",
    );
  }

  return resolved;
}

export function resolveCodeReviewModelId(modelId?: string): string {
  return modelId ?? process.env.CODE_REVIEW_MODEL ?? DEFAULT_MODEL_ID;
}

export function resolveCodeReviewCwd(cwd?: string): string {
  return cwd ?? process.env.CODE_REVIEW_CWD ?? process.cwd();
}

export function createCodeReviewAgentOptions(
  options: CreateCodeReviewAgentOptions = {},
): AgentOptions {
  return {
    apiKey: resolveCursorApiKey(options.apiKey),
    model: { id: resolveCodeReviewModelId(options.modelId) },
    local: { cwd: resolveCodeReviewCwd(options.cwd) },
  };
}

let defaultAgentOptions: AgentOptions | undefined;

export function getCodeReviewAgentOptions(): AgentOptions {
  defaultAgentOptions ??= createCodeReviewAgentOptions();
  return defaultAgentOptions;
}
