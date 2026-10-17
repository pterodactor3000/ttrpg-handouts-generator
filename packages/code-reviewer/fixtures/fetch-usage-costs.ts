import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Agent } from "@cursor/sdk";

import { createCodeReviewAgentOptions } from "../src/lib/cursor-config.js";
import { buildCodeReviewPrompt } from "../src/prompts/code-review-instructions.js";

const fixturesDir = dirname(fileURLToPath(import.meta.url));

/** Per-million-token rates from https://cursor.com/docs/models-and-pricing (2026-06) */
const MODEL_RATES = {
  "composer-2.5": {
    input: 0.5,
    cacheRead: 0.2,
    cacheWrite: 0,
    output: 2.5,
    pool: "auto_composer",
  },
  "gemini-3.5-flash": {
    input: 0.5,
    cacheRead: 0.05,
    cacheWrite: 0,
    output: 3,
    pool: "api",
    note: "Rates aligned with Gemini 3 Flash; verify on Cursor pricing page if billing differs.",
  },
  "claude-sonnet-4-5": {
    input: 3,
    cacheRead: 0.3,
    cacheWrite: 3.75,
    output: 15,
    pool: "api",
  },
} as const;

const CURSOR_TOKEN_RATE_PER_M = 0.25;

type Usage = {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  totalTokens?: number;
};

function estimateCost(modelId: string, usage: Usage) {
  const rates = MODEL_RATES[modelId as keyof typeof MODEL_RATES];
  if (!rates) {
    return null;
  }

  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const cacheRead = usage.cacheReadTokens ?? 0;
  const cacheWrite = usage.cacheWriteTokens ?? 0;
  const total = usage.totalTokens ?? input + output + cacheRead + cacheWrite;

  const apiCost =
    (input / 1e6) * rates.input +
    (output / 1e6) * rates.output +
    (cacheRead / 1e6) * rates.cacheRead +
    (cacheWrite / 1e6) * rates.cacheWrite;

  const cursorTokenRate = (total / 1e6) * CURSOR_TOKEN_RATE_PER_M;
  const withTokenRate = apiCost + cursorTokenRate;

  return {
    inputTokens: input,
    outputTokens: output,
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
    totalTokens: total,
    apiCostUsd: apiCost,
    cursorTokenRateUsd: cursorTokenRate,
    estimatedTotalUsdTeams: withTokenRate,
    pool: rates.pool,
    ratesNote: "note" in rates ? rates.note : undefined,
  };
}

async function main() {
  const diff = await readFile(
    join(fixturesDir, "handout-editor-migration.diff"),
    "utf8",
  );
  const meta = JSON.parse(
    await readFile(join(fixturesDir, "handout-editor-migration.meta.json"), "utf8"),
  );
  const cwd = join(fixturesDir, "../../..");
  const prompt = buildCodeReviewPrompt({
    diff,
    prTitle: meta.prTitle,
    prDescription: meta.prDescription,
  });

  const models = [
    { label: "Composer 2.5", id: "composer-2.5" },
    { label: "Gemini 3.5 Flash", id: "gemini-3.5-flash" },
    { label: "Sonnet 4.5", id: "claude-sonnet-4-5" },
  ];

  const results = await Promise.all(
    models.map(async (model) => {
      const start = Date.now();
      const result = await Agent.prompt(
        prompt,
        createCodeReviewAgentOptions({ modelId: model.id, cwd }),
      );
      const usage = result.usage ?? {};
      const cost = estimateCost(model.id, usage);
      return {
        model,
        status: result.status,
        elapsedMs: Date.now() - start,
        durationMs: result.durationMs,
        usage,
        cost,
      };
    }),
  );

  await writeFile(
    join(fixturesDir, "handout-editor-migration.usage.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
